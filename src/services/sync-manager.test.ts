import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import type { SyncMetadata } from '@/types/persistence';
import { createSyncManager, type SyncManagerConfig, type RemoteUpdate } from './sync-manager';

type SyncMetadataRecord = SyncMetadata & { id: string };

// Helper to create a metadata record
function makeMetadata(overrides: Partial<SyncMetadataRecord> = {}): SyncMetadataRecord {
  return {
    id: 'entries:entry-1',
    entityType: 'entries',
    entityId: 'entry-1',
    lastSyncedAt: new Date('2024-01-01'),
    localVersion: 1,
    serverVersion: 1,
    isDirty: false,
    ...overrides,
  };
}

// Helper to create a test config with controllable behavior
function createTestConfig(overrides: Partial<SyncManagerConfig> = {}) {
  const metadataRepo = new InMemoryRepository<SyncMetadataRecord>();
  const localEntities = new Map<string, unknown>();
  const appliedUpdates: RemoteUpdate[] = [];

  const config: SyncManagerConfig = {
    metadataRepo,
    pushEntity: async (_entityType: string, _entityId: string, _data: unknown) => {
      return 2; // Return new server version
    },
    pullEntities: async (_since: Date) => {
      return [];
    },
    getLocalEntity: async (entityType: string, entityId: string) => {
      return localEntities.get(`${entityType}:${entityId}`) ?? null;
    },
    applyRemoteUpdate: async (update: RemoteUpdate) => {
      appliedUpdates.push(update);
      localEntities.set(`${update.entityType}:${update.entityId}`, update.data);
    },
    ...overrides,
  };

  return { config, metadataRepo, localEntities, appliedUpdates };
}

describe('SyncManager', () => {
  describe('getStatus', () => {
    it('should return "synced" initially', () => {
      const { config } = createTestConfig();
      const manager = createSyncManager(config);
      expect(manager.getStatus()).toBe('synced');
    });

    it('should return "error" when push fails', async () => {
      const { config, metadataRepo, localEntities } = createTestConfig({
        pushEntity: async () => {
          throw new Error('Network error');
        },
      });
      const manager = createSyncManager(config);

      // Add a dirty record
      await metadataRepo.create(makeMetadata({ isDirty: true }));
      localEntities.set('entries:entry-1', { id: 'entry-1', text: 'test' });

      await manager.pushChanges();
      expect(manager.getStatus()).toBe('error');
    });

    it('should return "error" when pull fails completely', async () => {
      const { config } = createTestConfig({
        pullEntities: async () => {
          throw new Error('Network error');
        },
      });
      const manager = createSyncManager(config);

      await manager.pullChanges(new Date());
      expect(manager.getStatus()).toBe('error');
    });

    it('should return "conflict" when conflicts exist', async () => {
      const { config, metadataRepo, localEntities } = createTestConfig({
        pullEntities: async () => [
          {
            entityType: 'entries',
            entityId: 'entry-1',
            data: { id: 'entry-1', text: 'remote version' },
            serverVersion: 2,
            updatedAt: new Date('2023-01-01'), // Older than local
          },
        ],
      });
      const manager = createSyncManager(config);

      // Set up a dirty local record with a newer timestamp
      await metadataRepo.create(
        makeMetadata({
          isDirty: true,
          lastSyncedAt: new Date('2024-06-01'),
        })
      );
      localEntities.set('entries:entry-1', { id: 'entry-1', text: 'local version' });

      await manager.pullChanges(new Date('2024-01-01'));
      expect(manager.getStatus()).toBe('conflict');
    });
  });

  describe('pushChanges', () => {
    it('should push all dirty entities and mark them clean', async () => {
      const pushedEntities: Array<{ entityType: string; entityId: string; data: unknown }> = [];
      const { config, metadataRepo, localEntities } = createTestConfig({
        pushEntity: async (entityType, entityId, data) => {
          pushedEntities.push({ entityType, entityId, data });
          return 2;
        },
      });
      const manager = createSyncManager(config);

      // Add dirty records
      await metadataRepo.create(makeMetadata({ id: 'entries:e1', entityId: 'e1', isDirty: true }));
      await metadataRepo.create(makeMetadata({ id: 'entries:e2', entityId: 'e2', isDirty: true }));
      localEntities.set('entries:e1', { id: 'e1', text: 'entry 1' });
      localEntities.set('entries:e2', { id: 'e2', text: 'entry 2' });

      const result = await manager.pushChanges();

      expect(result.pushed).toBe(2);
      expect(result.pulled).toBe(0);
      expect(pushedEntities).toHaveLength(2);

      // Verify metadata is marked clean
      const m1 = await metadataRepo.getById('entries:e1');
      const m2 = await metadataRepo.getById('entries:e2');
      expect(m1?.isDirty).toBe(false);
      expect(m2?.isDirty).toBe(false);
      expect(m1?.serverVersion).toBe(2);
      expect(m2?.serverVersion).toBe(2);
    });

    it('should not push non-dirty entities', async () => {
      const pushedEntities: string[] = [];
      const { config, metadataRepo, localEntities } = createTestConfig({
        pushEntity: async (_type, entityId) => {
          pushedEntities.push(entityId);
          return 2;
        },
      });
      const manager = createSyncManager(config);

      await metadataRepo.create(makeMetadata({ id: 'entries:e1', entityId: 'e1', isDirty: false }));
      await metadataRepo.create(makeMetadata({ id: 'entries:e2', entityId: 'e2', isDirty: true }));
      localEntities.set('entries:e1', { id: 'e1' });
      localEntities.set('entries:e2', { id: 'e2' });

      const result = await manager.pushChanges();

      expect(result.pushed).toBe(1);
      expect(pushedEntities).toEqual(['e2']);
    });

    it('should skip entities that no longer exist locally', async () => {
      const { config, metadataRepo } = createTestConfig();
      const manager = createSyncManager(config);

      // Dirty record but no local entity
      await metadataRepo.create(makeMetadata({ isDirty: true }));

      const result = await manager.pushChanges();
      expect(result.pushed).toBe(0);
    });

    it('should return synced status after successful push', async () => {
      const { config, metadataRepo, localEntities } = createTestConfig();
      const manager = createSyncManager(config);

      await metadataRepo.create(makeMetadata({ isDirty: true }));
      localEntities.set('entries:entry-1', { id: 'entry-1' });

      await manager.pushChanges();
      expect(manager.getStatus()).toBe('synced');
    });
  });

  describe('pullChanges', () => {
    it('should apply new entities from server', async () => {
      const remoteData = { id: 'entry-new', text: 'from server' };
      const { config, metadataRepo, appliedUpdates } = createTestConfig({
        pullEntities: async () => [
          {
            entityType: 'entries',
            entityId: 'entry-new',
            data: remoteData,
            serverVersion: 1,
            updatedAt: new Date('2024-06-01'),
          },
        ],
      });
      const manager = createSyncManager(config);

      const result = await manager.pullChanges(new Date('2024-01-01'));

      expect(result.pulled).toBe(1);
      expect(appliedUpdates).toHaveLength(1);
      expect(appliedUpdates[0].data).toEqual(remoteData);

      // Verify metadata was created
      const metadata = await metadataRepo.getById('entries:entry-new');
      expect(metadata).not.toBeNull();
      expect(metadata?.isDirty).toBe(false);
      expect(metadata?.serverVersion).toBe(1);
    });

    it('should apply remote update when server is newer and no local changes', async () => {
      const { config, metadataRepo, appliedUpdates } = createTestConfig({
        pullEntities: async () => [
          {
            entityType: 'entries',
            entityId: 'entry-1',
            data: { id: 'entry-1', text: 'updated' },
            serverVersion: 3,
            updatedAt: new Date('2024-06-01'),
          },
        ],
      });
      const manager = createSyncManager(config);

      // Existing metadata with older server version
      await metadataRepo.create(makeMetadata({ serverVersion: 1, isDirty: false }));

      const result = await manager.pullChanges(new Date('2024-01-01'));

      expect(result.pulled).toBe(1);
      expect(appliedUpdates).toHaveLength(1);

      const metadata = await metadataRepo.getById('entries:entry-1');
      expect(metadata?.serverVersion).toBe(3);
    });

    it('should not apply remote update when local is already up to date', async () => {
      const { config, metadataRepo, appliedUpdates } = createTestConfig({
        pullEntities: async () => [
          {
            entityType: 'entries',
            entityId: 'entry-1',
            data: { id: 'entry-1', text: 'same' },
            serverVersion: 1,
            updatedAt: new Date('2024-06-01'),
          },
        ],
      });
      const manager = createSyncManager(config);

      await metadataRepo.create(makeMetadata({ serverVersion: 1, isDirty: false }));

      const result = await manager.pullChanges(new Date('2024-01-01'));

      expect(result.pulled).toBe(0);
      expect(appliedUpdates).toHaveLength(0);
    });

    it('should use last-write-wins: remote wins when remote is newer', async () => {
      const { config, metadataRepo, localEntities, appliedUpdates } = createTestConfig({
        pullEntities: async () => [
          {
            entityType: 'entries',
            entityId: 'entry-1',
            data: { id: 'entry-1', text: 'remote wins' },
            serverVersion: 2,
            updatedAt: new Date('2024-07-01'), // Newer than local lastSyncedAt
          },
        ],
      });
      const manager = createSyncManager(config);

      // Local is dirty with older lastSyncedAt
      await metadataRepo.create(
        makeMetadata({
          isDirty: true,
          lastSyncedAt: new Date('2024-06-01'),
        })
      );
      localEntities.set('entries:entry-1', { id: 'entry-1', text: 'local version' });

      const result = await manager.pullChanges(new Date('2024-01-01'));

      expect(result.pulled).toBe(1);
      expect(appliedUpdates).toHaveLength(1);
      expect(appliedUpdates[0].data).toEqual({ id: 'entry-1', text: 'remote wins' });

      // Metadata should be clean now
      const metadata = await metadataRepo.getById('entries:entry-1');
      expect(metadata?.isDirty).toBe(false);
    });

    it('should create conflict when local is newer (dirty with newer timestamp)', async () => {
      const { config, metadataRepo, localEntities, appliedUpdates } = createTestConfig({
        pullEntities: async () => [
          {
            entityType: 'entries',
            entityId: 'entry-1',
            data: { id: 'entry-1', text: 'remote version' },
            serverVersion: 2,
            updatedAt: new Date('2024-05-01'), // Older than local lastSyncedAt
          },
        ],
      });
      const manager = createSyncManager(config);

      // Local is dirty with newer lastSyncedAt
      await metadataRepo.create(
        makeMetadata({
          isDirty: true,
          lastSyncedAt: new Date('2024-06-01'),
        })
      );
      localEntities.set('entries:entry-1', { id: 'entry-1', text: 'local version' });

      const result = await manager.pullChanges(new Date('2024-01-01'));

      expect(result.pulled).toBe(0);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].localVersion).toEqual({ id: 'entry-1', text: 'local version' });
      expect(result.conflicts[0].remoteVersion).toEqual({ id: 'entry-1', text: 'remote version' });
      expect(appliedUpdates).toHaveLength(0);
      expect(manager.getStatus()).toBe('conflict');
    });
  });

  describe('resolveConflict', () => {
    it('should apply remote version when resolution is "remote"', async () => {
      const { config, metadataRepo, localEntities, appliedUpdates } = createTestConfig({
        pullEntities: async () => [
          {
            entityType: 'entries',
            entityId: 'entry-1',
            data: { id: 'entry-1', text: 'remote' },
            serverVersion: 2,
            updatedAt: new Date('2023-01-01'),
          },
        ],
      });
      const manager = createSyncManager(config);

      await metadataRepo.create(makeMetadata({ isDirty: true, lastSyncedAt: new Date('2024-06-01') }));
      localEntities.set('entries:entry-1', { id: 'entry-1', text: 'local' });

      await manager.pullChanges(new Date('2024-01-01'));
      expect(manager.getStatus()).toBe('conflict');

      await manager.resolveConflict('entries:entry-1', 'remote');

      expect(manager.getStatus()).toBe('synced');
      expect(appliedUpdates).toHaveLength(1);
      expect(appliedUpdates[0].data).toEqual({ id: 'entry-1', text: 'remote' });
    });

    it('should keep local version when resolution is "local"', async () => {
      const { config, metadataRepo, localEntities, appliedUpdates } = createTestConfig({
        pullEntities: async () => [
          {
            entityType: 'entries',
            entityId: 'entry-1',
            data: { id: 'entry-1', text: 'remote' },
            serverVersion: 2,
            updatedAt: new Date('2023-01-01'),
          },
        ],
      });
      const manager = createSyncManager(config);

      await metadataRepo.create(makeMetadata({ isDirty: true, lastSyncedAt: new Date('2024-06-01') }));
      localEntities.set('entries:entry-1', { id: 'entry-1', text: 'local' });

      await manager.pullChanges(new Date('2024-01-01'));

      await manager.resolveConflict('entries:entry-1', 'local');

      expect(manager.getStatus()).toBe('synced');
      expect(appliedUpdates).toHaveLength(0); // No remote update applied

      // Metadata should be marked dirty so it gets pushed next sync
      const metadata = await metadataRepo.getById('entries:entry-1');
      expect(metadata?.isDirty).toBe(true);
    });

    it('should throw when conflict id does not exist', async () => {
      const { config } = createTestConfig();
      const manager = createSyncManager(config);

      await expect(manager.resolveConflict('nonexistent', 'local')).rejects.toThrow(
        'Conflict not found: nonexistent'
      );
    });
  });

  describe('Property: pushChanges marks all dirty entities clean on success', () => {
    /**
     * **Validates: Requirements 8.1, 8.2**
     *
     * For any set of dirty entities, pushing changes should mark them all
     * as clean (isDirty = false) with updated server versions.
     */
    it('should mark all dirty entities clean after successful push', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              entityType: fc.constantFrom('entries', 'layouts', 'collections'),
              entityId: fc.uuid(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (entities) => {
            const { config, metadataRepo, localEntities } = createTestConfig({
              pushEntity: async () => 5,
            });
            const manager = createSyncManager(config);

            // Create dirty metadata and local entities for each
            for (const entity of entities) {
              const id = `${entity.entityType}:${entity.entityId}`;
              await metadataRepo.create({
                id,
                entityType: entity.entityType,
                entityId: entity.entityId,
                lastSyncedAt: new Date('2024-01-01'),
                localVersion: 1,
                serverVersion: 1,
                isDirty: true,
              });
              localEntities.set(id, { id: entity.entityId, data: 'test' });
            }

            const result = await manager.pushChanges();

            // All should be pushed
            expect(result.pushed).toBe(entities.length);

            // All metadata should be clean
            const allMetadata = await metadataRepo.getAll();
            for (const m of allMetadata) {
              expect(m.isDirty).toBe(false);
              expect(m.serverVersion).toBe(5);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property: last-write-wins conflict resolution', () => {
    /**
     * **Validates: Requirements 8.1, 8.2, 8.3**
     *
     * For any dirty local entity and a remote update, if the remote
     * updatedAt is strictly after the local lastSyncedAt, the remote
     * version should win and be applied.
     */
    it('remote wins when remote updatedAt > local lastSyncedAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }).filter(d => !isNaN(d.getTime())),
          fc.nat({ max: 365 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (localSyncDate, dayOffset, localText, remoteText) => {
            // Remote is strictly newer
            const remoteDate = new Date(localSyncDate.getTime() + (dayOffset + 1) * 86400000);

            const appliedUpdates: RemoteUpdate[] = [];
            const localEntities = new Map<string, unknown>();

            const metadataRepo = new InMemoryRepository<SyncMetadataRecord>();
            const config: SyncManagerConfig = {
              metadataRepo,
              pushEntity: async () => 2,
              pullEntities: async () => [
                {
                  entityType: 'entries',
                  entityId: 'e1',
                  data: { text: remoteText },
                  serverVersion: 2,
                  updatedAt: remoteDate,
                },
              ],
              getLocalEntity: async (type, id) => localEntities.get(`${type}:${id}`) ?? null,
              applyRemoteUpdate: async (update) => {
                appliedUpdates.push(update);
                localEntities.set(`${update.entityType}:${update.entityId}`, update.data);
              },
            };

            const manager = createSyncManager(config);

            await metadataRepo.create({
              id: 'entries:e1',
              entityType: 'entries',
              entityId: 'e1',
              lastSyncedAt: localSyncDate,
              localVersion: 1,
              serverVersion: 1,
              isDirty: true,
            });
            localEntities.set('entries:e1', { text: localText });

            const result = await manager.pullChanges(new Date('2020-01-01'));

            // Remote should win
            expect(result.pulled).toBe(1);
            expect(appliedUpdates).toHaveLength(1);
            expect(appliedUpdates[0].data).toEqual({ text: remoteText });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property: getStatus reflects sync state correctly', () => {
    /**
     * **Validates: Requirements 8.1, 8.2, 8.3**
     *
     * The status should be 'synced' initially, 'error' after a failed operation,
     * and 'conflict' when unresolved conflicts exist.
     */
    it('status transitions are consistent with operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('push-success', 'push-fail', 'pull-conflict', 'pull-success'),
          async (scenario) => {
            const localEntities = new Map<string, unknown>();
            const metadataRepo = new InMemoryRepository<SyncMetadataRecord>();

            let pushShouldFail = false;
            let pullResult: RemoteUpdate[] = [];

            const config: SyncManagerConfig = {
              metadataRepo,
              pushEntity: async () => {
                if (pushShouldFail) throw new Error('fail');
                return 2;
              },
              pullEntities: async () => pullResult,
              getLocalEntity: async (type, id) => localEntities.get(`${type}:${id}`) ?? null,
              applyRemoteUpdate: async (update) => {
                localEntities.set(`${update.entityType}:${update.entityId}`, update.data);
              },
            };

            const manager = createSyncManager(config);
            expect(manager.getStatus()).toBe('synced');

            if (scenario === 'push-success') {
              await metadataRepo.create({
                id: 'entries:e1',
                entityType: 'entries',
                entityId: 'e1',
                lastSyncedAt: new Date(),
                localVersion: 1,
                serverVersion: 1,
                isDirty: true,
              });
              localEntities.set('entries:e1', { id: 'e1' });
              await manager.pushChanges();
              expect(manager.getStatus()).toBe('synced');
            } else if (scenario === 'push-fail') {
              pushShouldFail = true;
              await metadataRepo.create({
                id: 'entries:e1',
                entityType: 'entries',
                entityId: 'e1',
                lastSyncedAt: new Date(),
                localVersion: 1,
                serverVersion: 1,
                isDirty: true,
              });
              localEntities.set('entries:e1', { id: 'e1' });
              await manager.pushChanges();
              expect(manager.getStatus()).toBe('error');
            } else if (scenario === 'pull-conflict') {
              pullResult = [
                {
                  entityType: 'entries',
                  entityId: 'e1',
                  data: { text: 'remote' },
                  serverVersion: 2,
                  updatedAt: new Date('2020-01-01'),
                },
              ];
              await metadataRepo.create({
                id: 'entries:e1',
                entityType: 'entries',
                entityId: 'e1',
                lastSyncedAt: new Date('2024-01-01'),
                localVersion: 1,
                serverVersion: 1,
                isDirty: true,
              });
              localEntities.set('entries:e1', { text: 'local' });
              await manager.pullChanges(new Date('2020-01-01'));
              expect(manager.getStatus()).toBe('conflict');
            } else if (scenario === 'pull-success') {
              pullResult = [
                {
                  entityType: 'entries',
                  entityId: 'e-new',
                  data: { text: 'new' },
                  serverVersion: 1,
                  updatedAt: new Date(),
                },
              ];
              await manager.pullChanges(new Date('2020-01-01'));
              expect(manager.getStatus()).toBe('synced');
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
