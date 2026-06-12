import type { Entry, EntryType, Signifier } from '@/types/models';
import type { EntryService, ValidationResult, Repository } from '@/types/services';

// Default signifiers for each entry type
const DEFAULT_SIGNIFIERS: Record<EntryType, Signifier> = {
  task: {
    id: 'sig-bullet',
    symbol: '•',
    category: 'type',
    label: 'Task',
  },
  event: {
    id: 'sig-circle',
    symbol: '○',
    category: 'type',
    label: 'Event',
  },
  note: {
    id: 'sig-dash',
    symbol: '–',
    category: 'type',
    label: 'Note',
  },
};

const VALID_ENTRY_TYPES: EntryType[] = ['task', 'event', 'note'];

/**
 * Validates an entry's text field.
 * Text must be 1-500 characters after trimming, and cannot be empty or whitespace-only.
 */
export function validateEntryText(text: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    errors.push('Entry text is required');
  } else if (trimmed.length > 500) {
    errors.push('Entry text must be at most 500 characters');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates an entry's type field.
 * Type must be one of: 'task', 'event', 'note'.
 */
export function validateEntryType(type: unknown): ValidationResult {
  const errors: string[] = [];

  if (!type) {
    errors.push('Entry type is required');
  } else if (!VALID_ENTRY_TYPES.includes(type as EntryType)) {
    errors.push('Entry type must be one of: task, event, note');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates signifier composition constraints.
 * Max 3 total signifiers, max 1 priority, max 2 category.
 */
export function validateSignifiers(signifiers: Signifier[]): ValidationResult {
  const errors: string[] = [];

  if (signifiers.length > 3) {
    errors.push('Maximum of 3 signifiers allowed per entry');
  }

  const priorityCount = signifiers.filter((s) => s.category === 'priority').length;
  if (priorityCount > 1) {
    errors.push('Maximum of 1 priority signifier allowed per entry');
  }

  const categoryCount = signifiers.filter((s) => s.category === 'category').length;
  if (categoryCount > 2) {
    errors.push('Maximum of 2 category signifiers allowed per entry');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Full entry validation combining type, text, and signifier checks.
 */
export function validateEntry(entry: Entry): ValidationResult {
  const errors: string[] = [];

  const typeResult = validateEntryType(entry.type);
  errors.push(...typeResult.errors);

  const textResult = validateEntryText(entry.text);
  errors.push(...textResult.errors);

  const signifierResult = validateSignifiers(entry.signifiers);
  errors.push(...signifierResult.errors);

  return { valid: errors.length === 0, errors };
}

/**
 * Returns the default signifier for a given entry type.
 */
export function getDefaultSignifier(type: EntryType): Signifier {
  return DEFAULT_SIGNIFIERS[type];
}

/**
 * Creates an EntryService implementation backed by a Repository.
 */
export function createEntryService(repository: Repository<Entry>): EntryService {
  return {
    async createEntry(entryData: Omit<Entry, 'id' | 'createdAt'>): Promise<Entry> {
      // Validate type
      const typeResult = validateEntryType(entryData.type);
      if (!typeResult.valid) {
        throw new Error(typeResult.errors.join('; '));
      }

      // Validate text (trim before validation)
      const trimmedText = entryData.text.trim();
      const textResult = validateEntryText(entryData.text);
      if (!textResult.valid) {
        throw new Error(textResult.errors.join('; '));
      }

      // Validate signifiers
      const signifierResult = validateSignifiers(entryData.signifiers);
      if (!signifierResult.valid) {
        throw new Error(signifierResult.errors.join('; '));
      }

      // Assign default signifier if no type signifier is present
      const hasTypeSignifier = entryData.signifiers.some((s) => s.category === 'type');
      const signifiers = hasTypeSignifier
        ? entryData.signifiers
        : [getDefaultSignifier(entryData.type), ...entryData.signifiers];

      // Re-validate signifiers after adding default (in case it pushes over limit)
      const finalSignifierResult = validateSignifiers(signifiers);
      if (!finalSignifierResult.valid) {
        throw new Error(finalSignifierResult.errors.join('; '));
      }

      const now = new Date();
      const entry: Entry = {
        ...entryData,
        id: crypto.randomUUID(),
        text: trimmedText,
        signifiers,
        state: entryData.type === 'task' ? (entryData.state ?? 'incomplete') : entryData.state,
        createdAt: now,
        updatedAt: now,
      };

      return repository.create(entry);
    },

    async updateEntry(id: string, changes: Partial<Entry>): Promise<Entry> {
      const existing = await repository.getById(id);
      if (!existing) {
        throw new Error(`Entry not found: ${id}`);
      }

      // Validate text if being updated
      if (changes.text !== undefined) {
        const textResult = validateEntryText(changes.text);
        if (!textResult.valid) {
          throw new Error(textResult.errors.join('; '));
        }
        changes.text = changes.text.trim();
      }

      // Validate type if being updated
      if (changes.type !== undefined) {
        const typeResult = validateEntryType(changes.type);
        if (!typeResult.valid) {
          throw new Error(typeResult.errors.join('; '));
        }
      }

      // Validate signifiers if being updated
      if (changes.signifiers !== undefined) {
        const signifierResult = validateSignifiers(changes.signifiers);
        if (!signifierResult.valid) {
          throw new Error(signifierResult.errors.join('; '));
        }
      }

      return repository.update(id, { ...changes, updatedAt: new Date() });
    },

    async deleteEntry(id: string): Promise<void> {
      const existing = await repository.getById(id);
      if (!existing) {
        throw new Error(`Entry not found: ${id}`);
      }
      return repository.delete(id);
    },

    async getEntriesByPage(pageId: string): Promise<Entry[]> {
      return repository.query((entry) => entry.pageId === pageId);
    },

    async getEntriesByDateRange(start: Date, end: Date): Promise<Entry[]> {
      return repository.query((entry) => {
        if (!entry.date) return false;
        const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });
    },

    validateEntry,
  };
}
