import type { SyncManager } from '@/types/services';
import type { Repository } from '@/types/services';
import type { SyncResult, SyncConflict, SyncStatus, SyncMetadata } from '@/types/persistence';

/**
 * Configuration for the SyncManager.
 */
export interface SyncManagerConfig {
  /** Repository for tracking sync metadata per entity */
  metadataRepo: Repository<SyncMetadata & { id: string }>;
  /** Function to push a single entity to the server. Returns the server version number on success. */
  pushEntity: (entityType: string, entityId: string, data: unknown) => Promise<number>;
  /** Function to pull entities updated since a given timestamp. Returns array of remote updates. */
  pullEntities: (since: Date) => Promise<RemoteUpdate[]>;
  /** Function to fetch the local entity data by type and id */
  getLocalEntity: (entityType: string, entityId: string) => Promise<unknown>;
  /** Function to apply a remote entity update locally */
  applyRemoteUpdate: (update: RemoteUpdate) => Promise<void>;
}

/**
 * Represents an update received from the server.
 */
export interface RemoteUpdate {
  entityType: string;
  entityId: string;
  data: unknown;
  serverVersion: number;
  updatedAt: Date;
}

/**
 * Internal representation of sync metadata with an id field for the repository.
 */
type SyncMetadataRecord = SyncMetadata & { id: string };

/**
 * Creates a composite id for sync metadata records.
 */
function metadataId(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/**
 * Creates a SyncManager instance.
 *
 * The SyncManager orchestrates data synchronization between the local
 * IndexedDB cache and the remote server. It uses a last-write-wins
 * conflict resolution strategy based on timestamps.
 */
export function createSyncManager(config: SyncManagerConfig): SyncManager {
  let status: SyncStatus = 'synced';
  const conflicts: Map<string, SyncConflict> = new Map();

  /**
   * Push all dirty entities to the server.
   * Marks entities as clean (isDirty = false) on success.
   */
  async function pushChanges(): Promise<SyncResult> {
    const previousStatus = status;
    status = 'syncing';

    try {
      const allMetadata = await config.metadataRepo.getAll();
      const dirtyRecords = allMetadata.filter((m) => m.isDirty);

      let pushed = 0;

      for (const record of dirtyRecords) {
        try {
          const localData = await config.getLocalEntity(record.entityType, record.entityId);
          if (localData === null || localData === undefined) {
            // Entity was deleted locally, skip
            continue;
          }

          const serverVersion = await config.pushEntity(record.entityType, record.entityId, localData);

          // Mark as clean after successful push
          await config.metadataRepo.update(record.id, {
            isDirty: false,
            serverVersion,
            localVersion: serverVersion,
            lastSyncedAt: new Date(),
          });

          pushed++;
        } catch {
          // Individual entity push failure - mark as error but continue
          status = 'error';
        }
      }

      // Restore status if no errors occurred
      if (status !== 'error') {
        status = conflicts.size > 0 ? 'conflict' : 'synced';
      }

      return {
        pushed,
        pulled: 0,
        conflicts: Array.from(conflicts.values()),
      };
    } catch {
      status = 'error';
      return { pushed: 0, pulled: 0, conflicts: Array.from(conflicts.values()) };
    }
  }

  /**
   * Pull updates from the server since the given timestamp.
   * Uses last-write-wins conflict resolution: if the server version
   * is newer than the local version, the remote update wins.
   */
  async function pullChanges(since: Date): Promise<SyncResult> {
    const previousStatus = status;
    status = 'syncing';

    try {
      const remoteUpdates = await config.pullEntities(since);
      let pulled = 0;
      const newConflicts: SyncConflict[] = [];

      for (const update of remoteUpdates) {
        const recordId = metadataId(update.entityType, update.entityId);
        const existingMetadata = await config.metadataRepo.getById(recordId);

        if (!existingMetadata) {
          // New entity from server - apply directly
          await config.applyRemoteUpdate(update);
          await config.metadataRepo.create({
            id: recordId,
            entityType: update.entityType,
            entityId: update.entityId,
            lastSyncedAt: new Date(),
            localVersion: update.serverVersion,
            serverVersion: update.serverVersion,
            isDirty: false,
          });
          pulled++;
        } else if (existingMetadata.isDirty) {
          // Conflict: local has unsaved changes and server has updates
          // Last-write-wins: compare timestamps
          const localData = await config.getLocalEntity(update.entityType, update.entityId);

          if (update.updatedAt > existingMetadata.lastSyncedAt) {
            // Remote is newer - remote wins (last-write-wins)
            await config.applyRemoteUpdate(update);
            await config.metadataRepo.update(recordId, {
              isDirty: false,
              serverVersion: update.serverVersion,
              localVersion: update.serverVersion,
              lastSyncedAt: new Date(),
            });
            pulled++;
          } else {
            // Local is newer - create a conflict record for visibility
            const conflict: SyncConflict = {
              id: recordId,
              entityType: update.entityType,
              entityId: update.entityId,
              localVersion: localData,
              remoteVersion: update.data,
            };
            conflicts.set(recordId, conflict);
            newConflicts.push(conflict);
          }
        } else if (update.serverVersion > existingMetadata.serverVersion) {
          // No local changes, server is newer - apply update
          await config.applyRemoteUpdate(update);
          await config.metadataRepo.update(recordId, {
            serverVersion: update.serverVersion,
            localVersion: update.serverVersion,
            lastSyncedAt: new Date(),
          });
          pulled++;
        }
        // else: local is already up to date, skip
      }

      status = conflicts.size > 0 ? 'conflict' : 'synced';

      return {
        pushed: 0,
        pulled,
        conflicts: newConflicts,
      };
    } catch {
      status = 'error';
      return { pushed: 0, pulled: 0, conflicts: [] };
    }
  }

  /**
   * Returns the current sync status.
   */
  function getStatus(): SyncStatus {
    return status;
  }

  /**
   * Resolves a conflict by choosing either the local or remote version.
   */
  async function resolveConflict(conflictId: string, resolution: 'local' | 'remote'): Promise<void> {
    const conflict = conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    if (resolution === 'remote') {
      // Apply the remote version
      await config.applyRemoteUpdate({
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        data: conflict.remoteVersion,
        serverVersion: 0, // Will be updated by metadata
        updatedAt: new Date(),
      });
      const metadata = await config.metadataRepo.getById(conflictId);
      if (metadata) {
        await config.metadataRepo.update(conflictId, {
          isDirty: false,
          lastSyncedAt: new Date(),
        });
      }
    } else {
      // Keep local version - mark as dirty so it gets pushed next sync
      const metadata = await config.metadataRepo.getById(conflictId);
      if (metadata) {
        await config.metadataRepo.update(conflictId, {
          isDirty: true,
        });
      }
    }

    conflicts.delete(conflictId);

    // Update status if no more conflicts
    if (conflicts.size === 0) {
      status = 'synced';
    }
  }

  return {
    pushChanges,
    pullChanges,
    getStatus,
    resolveConflict,
  };
}

/**
 * Sets the sync manager status externally (e.g., for offline detection).
 * Returns a modified SyncManager with a setStatus helper.
 */
export function createSyncManagerWithStatusControl(config: SyncManagerConfig) {
  const manager = createSyncManager(config);
  let overrideStatus: SyncStatus | null = null;

  return {
    ...manager,
    getStatus(): SyncStatus {
      return overrideStatus ?? manager.getStatus();
    },
    setStatus(newStatus: SyncStatus) {
      overrideStatus = newStatus;
    },
    clearStatusOverride() {
      overrideStatus = null;
    },
  };
}
