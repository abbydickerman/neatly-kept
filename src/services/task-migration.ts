import type { Entry, Signifier, JournalPage } from '@/types/models';
import type { Repository } from '@/types/services';
import { taskStateMachine } from '@/services/task-state-machine';

/**
 * Migration signifier added to the original entry when it is migrated.
 */
export const MIGRATION_SIGNIFIER: Signifier = {
  id: 'sig-migrated',
  symbol: '>',
  category: 'type',
  label: 'Migrated',
};

export interface MigrationResult {
  originalEntry: Entry;
  newEntry: Entry;
}

export interface MigrateTaskOptions {
  entryId: string;
  targetPageId: string;
}

/**
 * Migrates a task entry to a target journal page.
 *
 * Creates a new entry on the target page with the same text, type 'task',
 * and state 'incomplete'. Updates the original entry to state 'migrated'
 * with a migration signifier.
 *
 * Validates:
 * - The entry exists and is a task
 * - The task is in 'incomplete' state (only valid state for migration)
 * - The target page exists
 *
 * If validation fails, the task is retained in its current state.
 */
export function createTaskMigrationService(
  entryRepository: Repository<Entry>,
  pageRepository: Repository<JournalPage>
) {
  return {
    async migrateTask(options: MigrateTaskOptions): Promise<MigrationResult> {
      const { entryId, targetPageId } = options;

      // Fetch the original entry
      const originalEntry = await entryRepository.getById(entryId);
      if (!originalEntry) {
        throw new Error(`Entry not found: ${entryId}`);
      }

      // Validate it's a task
      if (originalEntry.type !== 'task') {
        throw new Error('Only task entries can be migrated');
      }

      // Validate the task is in a state that allows migration
      const newState = taskStateMachine.transition(originalEntry.state ?? 'incomplete', 'migrate');
      if (newState === null) {
        throw new Error(
          `Cannot migrate task in state '${originalEntry.state}': only incomplete tasks can be migrated`
        );
      }

      // Validate target page exists
      const targetPage = await pageRepository.getById(targetPageId);
      if (!targetPage) {
        throw new Error(`Target page not found: ${targetPageId}`);
      }

      // Create new entry on target page with same text, type 'task', state 'incomplete'
      const now = new Date();
      const newEntry: Entry = {
        id: crypto.randomUUID(),
        userId: originalEntry.userId,
        pageId: targetPageId,
        type: 'task',
        text: originalEntry.text,
        signifiers: originalEntry.signifiers.filter((s) => s.id !== MIGRATION_SIGNIFIER.id),
        state: 'incomplete',
        date: originalEntry.date,
        createdAt: now,
        updatedAt: now,
      };

      const createdEntry = await entryRepository.create(newEntry);

      // Update original entry to 'migrated' state with migration signifier
      const updatedSignifiers = [
        MIGRATION_SIGNIFIER,
        ...originalEntry.signifiers.filter((s) => s.category !== 'type'),
      ];

      const updatedOriginal = await entryRepository.update(entryId, {
        state: 'migrated',
        signifiers: updatedSignifiers,
        updatedAt: now,
      });

      return {
        originalEntry: updatedOriginal,
        newEntry: createdEntry,
      };
    },
  };
}
