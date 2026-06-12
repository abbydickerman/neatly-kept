import type { Entry, Layout, Collection, CollectionEntry, CalendarConfig } from '@/types/models';
import type {
  LayoutService,
  EntryService,
  CollectionService,
  CalendarService,
  Repository,
} from '@/types/services';
import type { SaveOperation, SyncStatus } from '@/types/persistence';
import type { SyncMetadata } from '@/types/persistence';
import { IndexedDBRepository } from '@/lib/persistence/indexeddb-repository';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import { SaveQueue } from '@/lib/persistence/save-queue';
import { createSyncManager, createSyncManagerWithStatusControl } from './sync-manager';
import type { RemoteUpdate, SyncManagerConfig } from './sync-manager';
import { createLayoutService } from './layout-service';
import { createEntryService } from './entry-service';
import { createCollectionService } from './collection-service';
import { createCalendarService } from './calendar-service';

// === Types ===

export interface WiredServices {
  layoutService: LayoutService;
  entryService: EntryService;
  collectionService: CollectionService;
  calendarService: CalendarService;
  syncManager: ReturnType<typeof createSyncManagerWithStatusControl>;
  saveQueue: SaveQueue;
  /** Returns the current sync/online status */
  getStatus(): SyncStatus;
  /** Manually trigger a push of all pending changes */
  pushNow(): Promise<void>;
  /** Clean up event listeners and timers */
  dispose(): void;
}

export interface WiredServicesConfig {
  /** Base URL for API calls (default: '') */
  apiBaseUrl?: string;
  /** Custom fetch function for API calls (useful for testing) */
  fetchFn?: typeof fetch;
  /** Custom IndexedDB factory (useful for testing) */
  indexedDB?: IDBFactory;
  /** Entry persistence timeout in ms (default: 2000) */
  entryPersistenceTimeout?: number;
  /** Layout/config persistence timeout in ms (default: 5000) */
  configPersistenceTimeout?: number;
  /** Whether to attach online/offline listeners (default: true) */
  attachNetworkListeners?: boolean;
}

// === Persistence Timing Constants ===

const DEFAULT_ENTRY_PERSISTENCE_TIMEOUT = 2000;
const DEFAULT_CONFIG_PERSISTENCE_TIMEOUT = 5000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

// === Sync Metadata Record ===

type SyncMetadataRecord = SyncMetadata & { id: string };

function metadataId(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

// === API Client Helpers ===

function createApiClient(baseUrl: string, fetchFn: typeof fetch) {
  async function apiPush(entityType: string, entityId: string, data: unknown): Promise<number> {
    const method = 'PUT';
    const url = `${baseUrl}/api/${entityType}/${entityId}`;

    const response = await fetchFn(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API push failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.version ?? Date.now();
  }

  async function apiPull(since: Date): Promise<RemoteUpdate[]> {
    const url = `${baseUrl}/api/sync/pull?since=${since.toISOString()}`;
    const response = await fetchFn(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`API pull failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async function apiCreate(entityType: string, data: unknown): Promise<unknown> {
    const url = `${baseUrl}/api/${entityType}`;
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API create failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async function apiDelete(entityType: string, entityId: string): Promise<void> {
    const url = `${baseUrl}/api/${entityType}/${entityId}`;
    const response = await fetchFn(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`API delete failed: ${response.status} ${response.statusText}`);
    }
  }

  return { apiPush, apiPull, apiCreate, apiDelete };
}

// === Save Queue Executor ===

function createSaveExecutor(
  apiClient: ReturnType<typeof createApiClient>,
  isOnline: () => boolean
) {
  return async function executor(operation: SaveOperation): Promise<boolean> {
    if (!isOnline()) {
      return false;
    }

    try {
      switch (operation.type) {
        case 'create':
          await apiClient.apiCreate(operation.entity, operation.data);
          break;
        case 'update':
          await apiClient.apiPush(
            operation.entity,
            (operation.data as { id: string }).id,
            operation.data
          );
          break;
        case 'delete':
          await apiClient.apiDelete(
            operation.entity,
            (operation.data as { id: string }).id
          );
          break;
      }
      return true;
    } catch {
      return false;
    }
  };
}

// === Mark Dirty Helper ===

async function markDirty(
  metadataRepo: Repository<SyncMetadataRecord>,
  entityType: string,
  entityId: string
): Promise<void> {
  const id = metadataId(entityType, entityId);
  const existing = await metadataRepo.getById(id);

  if (existing) {
    await metadataRepo.update(id, { isDirty: true, localVersion: existing.localVersion + 1 });
  } else {
    await metadataRepo.create({
      id,
      entityType,
      entityId,
      lastSyncedAt: new Date(0),
      localVersion: 1,
      serverVersion: 0,
      isDirty: true,
    });
  }
}

// === Create Wired Services ===

export function createWiredServices(config: WiredServicesConfig = {}): WiredServices {
  const {
    apiBaseUrl = '',
    fetchFn = globalThis.fetch?.bind(globalThis),
    indexedDB,
    entryPersistenceTimeout = DEFAULT_ENTRY_PERSISTENCE_TIMEOUT,
    configPersistenceTimeout = DEFAULT_CONFIG_PERSISTENCE_TIMEOUT,
    attachNetworkListeners = true,
  } = config;

  // Track online state - default to true when navigator is unavailable (e.g., Node.js tests)
  let online = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true;

  // Create IndexedDB repositories for entity data
  const layoutRepo = new IndexedDBRepository<Layout>('layouts', indexedDB);
  const entryRepo = new IndexedDBRepository<Entry>('entries', indexedDB);
  const collectionRepo = new IndexedDBRepository<Collection>('collections', indexedDB);
  const calendarConfigRepo = new IndexedDBRepository<CalendarConfig>('calendarConfig', indexedDB);

  // Use InMemoryRepository for stores with composite key paths
  // (syncMetadata uses [entityType, entityId], collectionEntries uses [collectionId, entryId])
  const collectionEntryRepo = new InMemoryRepository<CollectionEntry & { id: string }>();
  const metadataRepo = new InMemoryRepository<SyncMetadataRecord>();

  // Create API client
  const apiClient = createApiClient(apiBaseUrl, fetchFn);

  // Create SyncManager
  const syncManagerConfig: SyncManagerConfig = {
    metadataRepo,
    pushEntity: apiClient.apiPush,
    pullEntities: apiClient.apiPull,
    getLocalEntity: async (entityType: string, entityId: string) => {
      switch (entityType) {
        case 'layouts':
          return layoutRepo.getById(entityId);
        case 'entries':
          return entryRepo.getById(entityId);
        case 'collections':
          return collectionRepo.getById(entityId);
        case 'calendarConfig':
          return calendarConfigRepo.getById(entityId);
        default:
          return null;
      }
    },
    applyRemoteUpdate: async (update: RemoteUpdate) => {
      const data = update.data as { id: string };
      switch (update.entityType) {
        case 'layouts':
          await safeUpsert(layoutRepo, data.id, data as unknown as Layout);
          break;
        case 'entries':
          await safeUpsert(entryRepo, data.id, data as unknown as Entry);
          break;
        case 'collections':
          await safeUpsert(collectionRepo, data.id, data as unknown as Collection);
          break;
        case 'calendarConfig':
          await safeUpsert(calendarConfigRepo, data.id, data as unknown as CalendarConfig);
          break;
      }
    },
  };

  const syncManager = createSyncManagerWithStatusControl(syncManagerConfig);

  // Create SaveQueue
  const saveQueue = new SaveQueue({
    executor: createSaveExecutor(apiClient, () => online),
    onPermanentFailure: (_operation: SaveOperation) => {
      // The SaveQueue tracks permanently failed operations;
      // the UI reads SaveQueue status to display warnings.
    },
  });

  // === Create wrapped services with optimistic updates ===

  // Base services backed by IndexedDB (or InMemoryRepository for composite-key stores)
  const baseLayoutService = createLayoutService(layoutRepo);
  const baseEntryService = createEntryService(entryRepo);
  const baseCollectionService = createCollectionService(
    collectionRepo,
    collectionEntryRepo
  );
  const baseCalendarService = createCalendarService(
    entryRepo,
    calendarConfigRepo
  );

  // Wrap layout service with sync enqueuing
  const layoutService: LayoutService = {
    getBuiltInLayouts: () => baseLayoutService.getBuiltInLayouts(),
    getCustomLayouts: () => baseLayoutService.getCustomLayouts(),
    getAllLayouts: () => baseLayoutService.getAllLayouts(),

    async createCustomLayout(layout) {
      const created = await baseLayoutService.createCustomLayout(layout);
      await markDirty(metadataRepo, 'layouts', created.id);
      enqueueSync('create', 'layouts', created, configPersistenceTimeout);
      return created;
    },

    async updateCustomLayout(id, changes) {
      const updated = await baseLayoutService.updateCustomLayout(id, changes);
      await markDirty(metadataRepo, 'layouts', id);
      enqueueSync('update', 'layouts', updated, configPersistenceTimeout);
      return updated;
    },

    async deleteCustomLayout(id) {
      await baseLayoutService.deleteCustomLayout(id);
      await markDirty(metadataRepo, 'layouts', id);
      enqueueSync('delete', 'layouts', { id }, configPersistenceTimeout);
    },

    validateLayout: (layout) => baseLayoutService.validateLayout(layout),
  };

  // Wrap entry service with sync enqueuing
  const entryService: EntryService = {
    async createEntry(entry) {
      const created = await baseEntryService.createEntry(entry);
      await markDirty(metadataRepo, 'entries', created.id);
      enqueueSync('create', 'entries', created, entryPersistenceTimeout);
      return created;
    },

    async updateEntry(id, changes) {
      const updated = await baseEntryService.updateEntry(id, changes);
      await markDirty(metadataRepo, 'entries', id);
      enqueueSync('update', 'entries', updated, entryPersistenceTimeout);
      return updated;
    },

    async deleteEntry(id) {
      await baseEntryService.deleteEntry(id);
      await markDirty(metadataRepo, 'entries', id);
      enqueueSync('delete', 'entries', { id }, entryPersistenceTimeout);
    },

    getEntriesByPage: (pageId) => baseEntryService.getEntriesByPage(pageId),
    getEntriesByDateRange: (start, end) => baseEntryService.getEntriesByDateRange(start, end),
    validateEntry: (entry) => baseEntryService.validateEntry(entry),
  };

  // Wrap collection service with sync enqueuing
  const collectionService: CollectionService = {
    async createCollection(collection) {
      const created = await baseCollectionService.createCollection(collection);
      await markDirty(metadataRepo, 'collections', created.id);
      enqueueSync('create', 'collections', created, configPersistenceTimeout);
      return created;
    },

    async updateCollection(id, changes) {
      const updated = await baseCollectionService.updateCollection(id, changes);
      await markDirty(metadataRepo, 'collections', id);
      enqueueSync('update', 'collections', updated, configPersistenceTimeout);
      return updated;
    },

    async deleteCollection(id) {
      await baseCollectionService.deleteCollection(id);
      await markDirty(metadataRepo, 'collections', id);
      enqueueSync('delete', 'collections', { id }, configPersistenceTimeout);
    },

    addEntryToCollection: (entryId, collectionId) =>
      baseCollectionService.addEntryToCollection(entryId, collectionId),

    removeEntryFromCollection: (entryId, collectionId) =>
      baseCollectionService.removeEntryFromCollection(entryId, collectionId),

    getCollectionEntries: (collectionId) =>
      baseCollectionService.getCollectionEntries(collectionId),

    getCollectionsForEntry: (entryId) =>
      baseCollectionService.getCollectionsForEntry(entryId),
  };

  // Wrap calendar service with sync enqueuing
  const calendarService: CalendarService = {
    getEntriesForPeriod: (period) => baseCalendarService.getEntriesForPeriod(period),
    getCalendarConfig: () => baseCalendarService.getCalendarConfig(),

    async updateCalendarConfig(changes) {
      const updated = await baseCalendarService.updateCalendarConfig(changes);
      await markDirty(metadataRepo, 'calendarConfig', updated.id);
      enqueueSync('update', 'calendarConfig', updated, configPersistenceTimeout);
      return updated;
    },
  };

  // === Sync Enqueue Helper ===

  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  function enqueueSync(
    type: 'create' | 'update' | 'delete',
    entity: string,
    data: unknown,
    _timeoutMs: number
  ): void {
    const operation: SaveOperation = {
      id: crypto.randomUUID(),
      type,
      entity,
      data,
      attempts: 0,
      maxAttempts: MAX_RETRY_ATTEMPTS + 1, // 1 initial + 3 retries
      retryDelayMs: RETRY_DELAY_MS,
    };

    saveQueue.enqueue(operation);
  }

  // === Online/Offline Handling ===

  function handleOnline(): void {
    online = true;
    syncManager.clearStatusOverride();
    // Push pending changes on reconnect
    syncManager.pushChanges();
  }

  function handleOffline(): void {
    online = false;
    syncManager.setStatus('offline');
  }

  if (attachNetworkListeners && typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // === Public API ===

  function getStatus(): SyncStatus {
    if (!online) return 'offline';
    return syncManager.getStatus();
  }

  async function pushNow(): Promise<void> {
    if (online) {
      await syncManager.pushChanges();
    }
  }

  function dispose(): void {
    if (attachNetworkListeners && typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
    for (const timer of pendingTimers) {
      clearTimeout(timer);
    }
    pendingTimers.clear();
    saveQueue.dispose();
  }

  return {
    layoutService,
    entryService,
    collectionService,
    calendarService,
    syncManager,
    saveQueue,
    getStatus,
    pushNow,
    dispose,
  };
}

// === Helpers ===

/** Upsert: create if not exists, update if exists */
async function safeUpsert<T extends { id: string }>(
  repo: Repository<T>,
  id: string,
  data: T
): Promise<void> {
  const existing = await repo.getById(id);
  if (existing) {
    await repo.update(id, data);
  } else {
    await repo.create(data);
  }
}
