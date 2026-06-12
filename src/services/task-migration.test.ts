import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { createTaskMigrationService, MIGRATION_SIGNIFIER } from './task-migration';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import type { Entry, JournalPage, Signifier } from '@/types/models';

// --- Helpers ---

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    pageId: 'page-1',
    type: 'task',
    text: 'Buy groceries',
    signifiers: [{ id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task' }],
    state: 'incomplete',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makePage(overrides: Partial<JournalPage> = {}): JournalPage {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    layoutId: 'layout-1',
    title: 'Target Page',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// --- Unit Tests ---

describe('Task Migration Service', () => {
  let entryRepo: InMemoryRepository<Entry>;
  let pageRepo: InMemoryRepository<JournalPage>;
  let migrationService: ReturnType<typeof createTaskMigrationService>;

  beforeEach(() => {
    entryRepo = new InMemoryRepository<Entry>();
    pageRepo = new InMemoryRepository<JournalPage>();
    migrationService = createTaskMigrationService(entryRepo, pageRepo);
  });

  describe('migrateTask', () => {
    it('creates a new entry on the target page with same text and incomplete state', async () => {
      const entry = makeEntry({ text: 'Write report' });
      const targetPage = makePage({ id: 'target-page-1' });

      await entryRepo.create(entry);
      await pageRepo.create(targetPage);

      const result = await migrationService.migrateTask({
        entryId: entry.id,
        targetPageId: targetPage.id,
      });

      expect(result.newEntry.pageId).toBe(targetPage.id);
      expect(result.newEntry.text).toBe('Write report');
      expect(result.newEntry.type).toBe('task');
      expect(result.newEntry.state).toBe('incomplete');
      expect(result.newEntry.id).not.toBe(entry.id);
    });

    it('updates the original entry to migrated state with migration signifier', async () => {
      const entry = makeEntry();
      const targetPage = makePage({ id: 'target-page-1' });

      await entryRepo.create(entry);
      await pageRepo.create(targetPage);

      const result = await migrationService.migrateTask({
        entryId: entry.id,
        targetPageId: targetPage.id,
      });

      expect(result.originalEntry.state).toBe('migrated');
      expect(result.originalEntry.signifiers).toContainEqual(MIGRATION_SIGNIFIER);
    });

    it('throws if entry does not exist', async () => {
      const targetPage = makePage({ id: 'target-page-1' });
      await pageRepo.create(targetPage);

      await expect(
        migrationService.migrateTask({
          entryId: 'nonexistent',
          targetPageId: targetPage.id,
        })
      ).rejects.toThrow('Entry not found: nonexistent');
    });

    it('throws if entry is not a task', async () => {
      const entry = makeEntry({ type: 'note', state: undefined });
      const targetPage = makePage({ id: 'target-page-1' });

      await entryRepo.create(entry);
      await pageRepo.create(targetPage);

      await expect(
        migrationService.migrateTask({
          entryId: entry.id,
          targetPageId: targetPage.id,
        })
      ).rejects.toThrow('Only task entries can be migrated');
    });

    it('throws if task is already in a terminal state', async () => {
      const entry = makeEntry({ state: 'complete' });
      const targetPage = makePage({ id: 'target-page-1' });

      await entryRepo.create(entry);
      await pageRepo.create(targetPage);

      await expect(
        migrationService.migrateTask({
          entryId: entry.id,
          targetPageId: targetPage.id,
        })
      ).rejects.toThrow("Cannot migrate task in state 'complete'");
    });

    it('throws if target page does not exist (requirement 3.7)', async () => {
      const entry = makeEntry();
      await entryRepo.create(entry);

      await expect(
        migrationService.migrateTask({
          entryId: entry.id,
          targetPageId: 'nonexistent-page',
        })
      ).rejects.toThrow('Target page not found: nonexistent-page');

      // Verify original entry is unchanged
      const unchanged = await entryRepo.getById(entry.id);
      expect(unchanged!.state).toBe('incomplete');
    });

    it('preserves the original entry date on the new entry', async () => {
      const taskDate = new Date('2024-06-15');
      const entry = makeEntry({ date: taskDate });
      const targetPage = makePage({ id: 'target-page-1' });

      await entryRepo.create(entry);
      await pageRepo.create(targetPage);

      const result = await migrationService.migrateTask({
        entryId: entry.id,
        targetPageId: targetPage.id,
      });

      expect(result.newEntry.date).toEqual(taskDate);
    });

    it('replaces the type signifier with migration signifier on original', async () => {
      const entry = makeEntry({
        signifiers: [
          { id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task' },
          { id: 'sig-priority', symbol: '★', category: 'priority', label: 'Important' },
        ],
      });
      const targetPage = makePage({ id: 'target-page-1' });

      await entryRepo.create(entry);
      await pageRepo.create(targetPage);

      const result = await migrationService.migrateTask({
        entryId: entry.id,
        targetPageId: targetPage.id,
      });

      // Migration signifier replaces the type signifier
      expect(result.originalEntry.signifiers[0]).toEqual(MIGRATION_SIGNIFIER);
      // Priority signifier is preserved
      expect(result.originalEntry.signifiers).toContainEqual({
        id: 'sig-priority',
        symbol: '★',
        category: 'priority',
        label: 'Important',
      });
    });
  });
});

// --- Property-Based Tests ---

describe('Task Migration - Property-Based Tests', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * Property 7: Task migration produces correct results
   * For any task in the incomplete state and any valid target journal page,
   * migrating the task should produce:
   * (a) a new entry on the target page with the same text, type 'task', and state 'incomplete'
   * (b) the original entry updated to state 'migrated' with a migration signifier
   */
  it('migration always produces a new incomplete task with same text on target page and marks original as migrated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (taskText, entryId, sourcePageId, targetPageId) => {
          // Ensure source and target are different pages
          fc.pre(sourcePageId !== targetPageId);

          const entryRepo = new InMemoryRepository<Entry>();
          const pageRepo = new InMemoryRepository<JournalPage>();
          const service = createTaskMigrationService(entryRepo, pageRepo);

          const now = new Date();
          const entry: Entry = {
            id: entryId,
            userId: 'user-1',
            pageId: sourcePageId,
            type: 'task',
            text: taskText,
            signifiers: [{ id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task' }],
            state: 'incomplete',
            createdAt: now,
            updatedAt: now,
          };

          const targetPage: JournalPage = {
            id: targetPageId,
            userId: 'user-1',
            layoutId: 'layout-1',
            title: 'Target',
            createdAt: now,
            updatedAt: now,
          };

          await entryRepo.create(entry);
          await pageRepo.create(targetPage);

          const result = await service.migrateTask({
            entryId: entry.id,
            targetPageId: targetPage.id,
          });

          // (a) New entry on target page with same text, type 'task', state 'incomplete'
          expect(result.newEntry.pageId).toBe(targetPageId);
          expect(result.newEntry.text).toBe(taskText);
          expect(result.newEntry.type).toBe('task');
          expect(result.newEntry.state).toBe('incomplete');
          expect(result.newEntry.id).not.toBe(entryId);

          // (b) Original entry updated to state 'migrated' with migration signifier
          expect(result.originalEntry.state).toBe('migrated');
          expect(result.originalEntry.signifiers).toContainEqual(MIGRATION_SIGNIFIER);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.7**
   *
   * If no valid target page exists, the task should remain in its current state.
   */
  it('migration fails and retains task state when target page does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        fc.uuid(),
        fc.uuid(),
        async (taskText, entryId, fakeTargetPageId) => {
          const entryRepo = new InMemoryRepository<Entry>();
          const pageRepo = new InMemoryRepository<JournalPage>();
          const service = createTaskMigrationService(entryRepo, pageRepo);

          const now = new Date();
          const entry: Entry = {
            id: entryId,
            userId: 'user-1',
            pageId: 'source-page',
            type: 'task',
            text: taskText,
            signifiers: [{ id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task' }],
            state: 'incomplete',
            createdAt: now,
            updatedAt: now,
          };

          await entryRepo.create(entry);

          // Do NOT create the target page — it doesn't exist
          await expect(
            service.migrateTask({
              entryId: entry.id,
              targetPageId: fakeTargetPageId,
            })
          ).rejects.toThrow('Target page not found');

          // Verify original entry is unchanged
          const unchanged = await entryRepo.getById(entryId);
          expect(unchanged!.state).toBe('incomplete');
          expect(unchanged!.pageId).toBe('source-page');
          expect(unchanged!.text).toBe(taskText);
        }
      ),
      { numRuns: 100 }
    );
  });
});
