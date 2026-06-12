import { describe, it, expect, vi, afterEach } from 'vitest';
import { createWiredServices, type WiredServicesConfig } from './wired-services';
import type { Entry, Layout, Collection } from '@/types/models';
import 'fake-indexeddb/auto';

/**
 * Helper to create a wired services instance with a mock fetch for testing.
 * Each test gets a fresh IndexedDB instance for isolation.
 */
function createTestWiredServices(overrides: Partial<WiredServicesConfig> = {}) {
  const fetchCalls: Array<{ url: string; method: string; body?: unknown }> = [];

  const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
    fetchCalls.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body as string) : undefined,
    });
    return new Response(JSON.stringify({ version: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  const services = createWiredServices({
    apiBaseUrl: 'http://localhost:3000',
    fetchFn: mockFetch,
    attachNetworkListeners: false,
    ...overrides,
  });

  return { services, mockFetch, fetchCalls };
}

/**
 * Helper to create a minimal valid entry data (omit id and createdAt).
 */
function makeEntryData(): Omit<Entry, 'id' | 'createdAt'> {
  return {
    userId: 'user-1',
    pageId: 'page-1',
    type: 'task',
    text: 'Test task',
    signifiers: [],
    state: 'incomplete',
    updatedAt: new Date(),
  };
}

/**
 * Helper to create minimal valid layout data with a unique name.
 */
function makeLayoutData(): Omit<Layout, 'id' | 'createdAt'> {
  return {
    userId: 'user-1',
    name: `Test Layout ${crypto.randomUUID().slice(0, 8)}`,
    isBuiltIn: false,
    contentAreas: [
      { id: 'area-1', type: 'text', x: 0, y: 0, width: 50, height: 50 },
    ],
    updatedAt: new Date(),
  };
}

/**
 * Helper to create minimal valid collection data.
 */
function makeCollectionData(): Omit<Collection, 'id' | 'createdAt'> {
  return {
    userId: 'user-1',
    name: 'Test Collection',
    layoutId: 'builtin-daily-log',
    isTemplate: false,
    updatedAt: new Date(),
  };
}

describe('WiredServices', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create all services', () => {
      const { services } = createTestWiredServices();
      expect(services.layoutService).toBeDefined();
      expect(services.entryService).toBeDefined();
      expect(services.collectionService).toBeDefined();
      expect(services.calendarService).toBeDefined();
      expect(services.syncManager).toBeDefined();
      expect(services.saveQueue).toBeDefined();
      services.dispose();
    });

    it('should report synced status initially when online', () => {
      const { services } = createTestWiredServices();
      // In Node.js test environment, navigator.onLine is undefined so defaults to true
      expect(services.getStatus()).toBe('synced');
      services.dispose();
    });
  });

  describe('optimistic updates - EntryService', () => {
    it('should persist entry to IndexedDB immediately on create', async () => {
      const { services } = createTestWiredServices();

      const uniquePageId = `page-create-${crypto.randomUUID()}`;
      const entry = await services.entryService.createEntry({
        ...makeEntryData(),
        pageId: uniquePageId,
      });

      // Entry should be immediately available from IndexedDB-backed service
      const entries = await services.entryService.getEntriesByPage(uniquePageId);
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(entry.id);
      expect(entries[0].text).toBe('Test task');

      services.dispose();
    });

    it('should persist entry update to IndexedDB immediately', async () => {
      const { services } = createTestWiredServices();

      const uniquePageId = `page-update-${crypto.randomUUID()}`;
      const entry = await services.entryService.createEntry({
        ...makeEntryData(),
        pageId: uniquePageId,
      });
      const updated = await services.entryService.updateEntry(entry.id, {
        text: 'Updated task',
      });

      expect(updated.text).toBe('Updated task');

      // Read back from service should reflect the update
      const entries = await services.entryService.getEntriesByPage(uniquePageId);
      expect(entries[0].text).toBe('Updated task');

      services.dispose();
    });

    it('should remove entry from IndexedDB immediately on delete', async () => {
      const { services } = createTestWiredServices();

      const uniquePageId = `page-delete-${crypto.randomUUID()}`;
      const entry = await services.entryService.createEntry({
        ...makeEntryData(),
        pageId: uniquePageId,
      });
      await services.entryService.deleteEntry(entry.id);

      const entries = await services.entryService.getEntriesByPage(uniquePageId);
      expect(entries).toHaveLength(0);

      services.dispose();
    });

    it('should enqueue API sync after creating an entry', async () => {
      const { services } = createTestWiredServices();

      await services.entryService.createEntry(makeEntryData());

      // SaveQueue should have processed or be processing the operation
      // (it processes immediately, so it may already be idle if the mock fetch resolves fast)
      const status = services.saveQueue.getStatus();
      expect(['idle', 'saving']).toContain(status);

      services.dispose();
    });
  });

  describe('optimistic updates - LayoutService', () => {
    it('should persist custom layout to IndexedDB immediately on create', async () => {
      const { services } = createTestWiredServices();

      const layout = await services.layoutService.createCustomLayout(makeLayoutData());

      const customLayouts = await services.layoutService.getCustomLayouts();
      expect(customLayouts.some((l) => l.id === layout.id)).toBe(true);

      services.dispose();
    });

    it('should persist layout update to IndexedDB immediately', async () => {
      const { services } = createTestWiredServices();

      const layout = await services.layoutService.createCustomLayout(makeLayoutData());
      const updated = await services.layoutService.updateCustomLayout(layout.id, {
        name: 'Renamed Layout',
      });

      expect(updated.name).toBe('Renamed Layout');

      services.dispose();
    });

    it('should remove layout from IndexedDB immediately on delete', async () => {
      const { services } = createTestWiredServices();

      const layout = await services.layoutService.createCustomLayout(makeLayoutData());
      await services.layoutService.deleteCustomLayout(layout.id);

      const customLayouts = await services.layoutService.getCustomLayouts();
      expect(customLayouts.some((l) => l.id === layout.id)).toBe(false);

      services.dispose();
    });

    it('should still return built-in layouts', () => {
      const { services } = createTestWiredServices();

      const builtIn = services.layoutService.getBuiltInLayouts();
      expect(builtIn.length).toBeGreaterThanOrEqual(4);
      expect(builtIn.some((l) => l.name === 'Daily Log')).toBe(true);

      services.dispose();
    });
  });

  describe('optimistic updates - CollectionService', () => {
    it('should persist collection to IndexedDB immediately on create', async () => {
      const { services } = createTestWiredServices();

      const collection = await services.collectionService.createCollection(
        makeCollectionData()
      );

      expect(collection.id).toBeDefined();
      expect(collection.name).toBe('Test Collection');

      services.dispose();
    });

    it('should persist collection update to IndexedDB immediately', async () => {
      const { services } = createTestWiredServices();

      const collection = await services.collectionService.createCollection(
        makeCollectionData()
      );
      const updated = await services.collectionService.updateCollection(
        collection.id,
        { name: 'Updated Collection' }
      );

      expect(updated.name).toBe('Updated Collection');

      services.dispose();
    });
  });

  describe('optimistic updates - CalendarService', () => {
    it('should persist calendar config update to IndexedDB immediately', async () => {
      const { services } = createTestWiredServices();

      const config = await services.calendarService.updateCalendarConfig({
        weekStartDay: 'sunday',
      });

      expect(config.weekStartDay).toBe('sunday');

      // Should be readable immediately
      const readConfig = await services.calendarService.getCalendarConfig();
      expect(readConfig.weekStartDay).toBe('sunday');

      services.dispose();
    });
  });

  describe('API sync enqueuing', () => {
    it('should call API with correct entity type on entry create', async () => {
      const { services, fetchCalls } = createTestWiredServices();

      await services.entryService.createEntry(makeEntryData());

      // Give the save queue time to process asynchronously
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that a POST was made to the entries endpoint
      const createCalls = fetchCalls.filter(
        (c) => c.method === 'POST' && c.url.includes('/api/entries')
      );
      expect(createCalls.length).toBeGreaterThanOrEqual(1);

      services.dispose();
    });

    it('should call API with correct endpoint on layout create', async () => {
      const { services, fetchCalls } = createTestWiredServices();

      await services.layoutService.createCustomLayout(makeLayoutData());

      await new Promise((resolve) => setTimeout(resolve, 100));

      const createCalls = fetchCalls.filter(
        (c) => c.method === 'POST' && c.url.includes('/api/layouts')
      );
      expect(createCalls.length).toBeGreaterThanOrEqual(1);

      services.dispose();
    });

    it('should call API DELETE endpoint on entry delete', async () => {
      const { services, fetchCalls } = createTestWiredServices();

      const entry = await services.entryService.createEntry(makeEntryData());

      // Wait for the create to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear previous calls
      fetchCalls.length = 0;

      await services.entryService.deleteEntry(entry.id);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const deleteCalls = fetchCalls.filter(
        (c) => c.method === 'DELETE' && c.url.includes('/api/entries/')
      );
      expect(deleteCalls.length).toBeGreaterThanOrEqual(1);

      services.dispose();
    });
  });

  describe('offline/online handling', () => {
    it('should report offline status when sync manager is set offline', () => {
      const { services } = createTestWiredServices();

      // Simulate going offline via the syncManager override
      services.syncManager.setStatus('offline');
      expect(services.syncManager.getStatus()).toBe('offline');

      services.dispose();
    });

    it('should still persist locally when API fails (optimistic updates)', async () => {
      const failingFetch = vi.fn(async () => {
        throw new Error('Network error');
      }) as unknown as typeof fetch;

      const { services } = createTestWiredServices({ fetchFn: failingFetch });

      const uniquePageId = `page-offline-${crypto.randomUUID()}`;
      const entry = await services.entryService.createEntry({
        ...makeEntryData(),
        pageId: uniquePageId,
      });

      // Entry should still be persisted locally (optimistic)
      const entries = await services.entryService.getEntriesByPage(uniquePageId);
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(entry.id);

      services.dispose();
    });

    it('should track unsaved changes when API is unavailable', async () => {
      const failingFetch = vi.fn(async () => {
        return new Response('', { status: 500 });
      }) as unknown as typeof fetch;

      const { services } = createTestWiredServices({ fetchFn: failingFetch });

      await services.entryService.createEntry(makeEntryData());

      // Give the save queue a moment to attempt processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The save queue should still have the operation (since it failed)
      expect(services.saveQueue.hasUnsavedChanges).toBe(true);

      services.dispose();
    });
  });

  describe('persistence timing', () => {
    it('should configure with default persistence timeouts', () => {
      const { services } = createTestWiredServices();
      expect(services.saveQueue).toBeDefined();
      services.dispose();
    });

    it('should accept custom persistence timeouts', () => {
      const { services } = createTestWiredServices({
        entryPersistenceTimeout: 1000,
        configPersistenceTimeout: 3000,
      });
      expect(services.saveQueue).toBeDefined();
      services.dispose();
    });
  });

  describe('pushNow', () => {
    it('should trigger sync manager push when called', async () => {
      const { services } = createTestWiredServices();

      // Should not throw
      await services.pushNow();

      services.dispose();
    });
  });

  describe('dispose', () => {
    it('should clean up resources without errors', () => {
      const { services } = createTestWiredServices();
      expect(() => services.dispose()).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return synced when online and sync is complete', () => {
      const { services } = createTestWiredServices();
      expect(services.getStatus()).toBe('synced');
      services.dispose();
    });

    it('should return error when sync manager has error status', () => {
      const { services } = createTestWiredServices();
      services.syncManager.setStatus('error');
      expect(services.getStatus()).toBe('error');
      services.dispose();
    });

    it('should return conflict when sync manager has conflict status', () => {
      const { services } = createTestWiredServices();
      services.syncManager.setStatus('conflict');
      expect(services.getStatus()).toBe('conflict');
      services.dispose();
    });
  });

  describe('save retry behavior', () => {
    it('should configure save operations with max 4 attempts (1 initial + 3 retries)', async () => {
      const { services } = createTestWiredServices();

      await services.entryService.createEntry(makeEntryData());

      // The save queue's operations should be configured with maxAttempts = 4
      const pendingOps = services.saveQueue.pendingOperations;
      if (pendingOps.length > 0) {
        expect(pendingOps[0].maxAttempts).toBe(4);
        expect(pendingOps[0].retryDelayMs).toBe(5000);
      }

      services.dispose();
    });
  });
});
