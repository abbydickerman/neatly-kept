import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { Entry, EntryType, Signifier } from '@/types/models';
import type { EntryService } from '@/types/services';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import {
  createEntryService,
  validateEntryText,
  validateEntryType,
  validateSignifiers,
  validateEntry,
  getDefaultSignifier,
} from './entry-service';

// Helper to create a valid entry input
function makeEntryInput(overrides: Partial<Omit<Entry, 'id' | 'createdAt'>> = {}): Omit<Entry, 'id' | 'createdAt'> {
  return {
    userId: 'user-1',
    pageId: 'page-1',
    type: 'task',
    text: 'Buy groceries',
    signifiers: [],
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create a full Entry for validateEntry tests
function makeFullEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'entry-1',
    userId: 'user-1',
    pageId: 'page-1',
    type: 'task',
    text: 'Buy groceries',
    signifiers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Entry Validation', () => {
  describe('validateEntryText', () => {
    it('should reject empty text', () => {
      const result = validateEntryText('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry text is required');
    });

    it('should reject whitespace-only text', () => {
      const result = validateEntryText('   \t\n  ');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry text is required');
    });

    it('should accept text with 1 character (trimmed)', () => {
      const result = validateEntryText('a');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept text with exactly 500 characters', () => {
      const result = validateEntryText('a'.repeat(500));
      expect(result.valid).toBe(true);
    });

    it('should reject text exceeding 500 characters', () => {
      const result = validateEntryText('a'.repeat(501));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry text must be at most 500 characters');
    });

    it('should validate trimmed length (leading/trailing whitespace ignored)', () => {
      const result = validateEntryText('  hello  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateEntryType', () => {
    it('should accept task type', () => {
      expect(validateEntryType('task').valid).toBe(true);
    });

    it('should accept event type', () => {
      expect(validateEntryType('event').valid).toBe(true);
    });

    it('should accept note type', () => {
      expect(validateEntryType('note').valid).toBe(true);
    });

    it('should reject undefined type', () => {
      const result = validateEntryType(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry type is required');
    });

    it('should reject invalid type', () => {
      const result = validateEntryType('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry type must be one of: task, event, note');
    });
  });

  describe('validateSignifiers', () => {
    it('should accept empty signifiers', () => {
      expect(validateSignifiers([]).valid).toBe(true);
    });

    it('should accept up to 3 signifiers', () => {
      const signifiers: Signifier[] = [
        { id: '1', symbol: '•', category: 'type', label: 'Task' },
        { id: '2', symbol: '★', category: 'priority', label: 'Important' },
        { id: '3', symbol: '#', category: 'category', label: 'Work' },
      ];
      expect(validateSignifiers(signifiers).valid).toBe(true);
    });

    it('should reject more than 3 signifiers', () => {
      const signifiers: Signifier[] = [
        { id: '1', symbol: '•', category: 'type', label: 'Task' },
        { id: '2', symbol: '★', category: 'priority', label: 'Important' },
        { id: '3', symbol: '#', category: 'category', label: 'Work' },
        { id: '4', symbol: '@', category: 'category', label: 'Personal' },
      ];
      const result = validateSignifiers(signifiers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum of 3 signifiers allowed per entry');
    });

    it('should reject more than 1 priority signifier', () => {
      const signifiers: Signifier[] = [
        { id: '1', symbol: '★', category: 'priority', label: 'Important' },
        { id: '2', symbol: '!', category: 'priority', label: 'Urgent' },
      ];
      const result = validateSignifiers(signifiers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum of 1 priority signifier allowed per entry');
    });

    it('should accept up to 2 category signifiers', () => {
      const signifiers: Signifier[] = [
        { id: '1', symbol: '#', category: 'category', label: 'Work' },
        { id: '2', symbol: '@', category: 'category', label: 'Personal' },
      ];
      expect(validateSignifiers(signifiers).valid).toBe(true);
    });

    it('should reject more than 2 category signifiers', () => {
      const signifiers: Signifier[] = [
        { id: '1', symbol: '#', category: 'category', label: 'Work' },
        { id: '2', symbol: '@', category: 'category', label: 'Personal' },
        { id: '3', symbol: '&', category: 'category', label: 'Health' },
      ];
      const result = validateSignifiers(signifiers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum of 2 category signifiers allowed per entry');
    });
  });

  describe('validateEntry (full)', () => {
    it('should accept a valid entry', () => {
      const entry = makeFullEntry();
      expect(validateEntry(entry).valid).toBe(true);
    });

    it('should collect multiple errors', () => {
      const entry = makeFullEntry({ type: 'invalid' as EntryType, text: '' });
      const result = validateEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getDefaultSignifier', () => {
    it('should return bullet for tasks', () => {
      const sig = getDefaultSignifier('task');
      expect(sig.symbol).toBe('•');
      expect(sig.category).toBe('type');
    });

    it('should return circle for events', () => {
      const sig = getDefaultSignifier('event');
      expect(sig.symbol).toBe('○');
      expect(sig.category).toBe('type');
    });

    it('should return dash for notes', () => {
      const sig = getDefaultSignifier('note');
      expect(sig.symbol).toBe('–');
      expect(sig.category).toBe('type');
    });
  });
});

describe('EntryService', () => {
  let repository: InMemoryRepository<Entry>;
  let service: EntryService;

  beforeEach(() => {
    repository = new InMemoryRepository<Entry>();
    service = createEntryService(repository);
  });

  describe('createEntry', () => {
    it('should create a valid task entry with default signifier', async () => {
      const entry = await service.createEntry(makeEntryInput());
      expect(entry.id).toBeDefined();
      expect(entry.type).toBe('task');
      expect(entry.text).toBe('Buy groceries');
      expect(entry.state).toBe('incomplete');
      expect(entry.signifiers).toHaveLength(1);
      expect(entry.signifiers[0].symbol).toBe('•');
    });

    it('should create a valid event entry with default signifier', async () => {
      const entry = await service.createEntry(makeEntryInput({ type: 'event' }));
      expect(entry.signifiers[0].symbol).toBe('○');
    });

    it('should create a valid note entry with default signifier', async () => {
      const entry = await service.createEntry(makeEntryInput({ type: 'note' }));
      expect(entry.signifiers[0].symbol).toBe('–');
    });

    it('should trim text before saving', async () => {
      const entry = await service.createEntry(makeEntryInput({ text: '  hello world  ' }));
      expect(entry.text).toBe('hello world');
    });

    it('should throw on empty text', async () => {
      await expect(service.createEntry(makeEntryInput({ text: '' }))).rejects.toThrow(
        'Entry text is required'
      );
    });

    it('should throw on whitespace-only text', async () => {
      await expect(service.createEntry(makeEntryInput({ text: '   ' }))).rejects.toThrow(
        'Entry text is required'
      );
    });

    it('should throw on text exceeding 500 chars', async () => {
      await expect(
        service.createEntry(makeEntryInput({ text: 'a'.repeat(501) }))
      ).rejects.toThrow('Entry text must be at most 500 characters');
    });

    it('should throw on invalid type', async () => {
      await expect(
        service.createEntry(makeEntryInput({ type: 'invalid' as EntryType }))
      ).rejects.toThrow('Entry type must be one of: task, event, note');
    });

    it('should throw on too many signifiers', async () => {
      const signifiers: Signifier[] = [
        { id: '1', symbol: '•', category: 'type', label: 'Task' },
        { id: '2', symbol: '★', category: 'priority', label: 'Important' },
        { id: '3', symbol: '#', category: 'category', label: 'Work' },
        { id: '4', symbol: '@', category: 'category', label: 'Personal' },
      ];
      await expect(
        service.createEntry(makeEntryInput({ signifiers }))
      ).rejects.toThrow('Maximum of 3 signifiers allowed per entry');
    });

    it('should not add default signifier if type signifier already present', async () => {
      const signifiers: Signifier[] = [
        { id: 'custom', symbol: '▶', category: 'type', label: 'Custom Task' },
      ];
      const entry = await service.createEntry(makeEntryInput({ signifiers }));
      expect(entry.signifiers).toHaveLength(1);
      expect(entry.signifiers[0].symbol).toBe('▶');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const entry = await service.createEntry(makeEntryInput());
      const after = new Date();
      expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(entry.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('updateEntry', () => {
    it('should update entry text', async () => {
      const entry = await service.createEntry(makeEntryInput());
      const updated = await service.updateEntry(entry.id, { text: 'Updated text' });
      expect(updated.text).toBe('Updated text');
    });

    it('should trim updated text', async () => {
      const entry = await service.createEntry(makeEntryInput());
      const updated = await service.updateEntry(entry.id, { text: '  trimmed  ' });
      expect(updated.text).toBe('trimmed');
    });

    it('should throw on empty updated text', async () => {
      const entry = await service.createEntry(makeEntryInput());
      await expect(service.updateEntry(entry.id, { text: '' })).rejects.toThrow(
        'Entry text is required'
      );
    });

    it('should throw on non-existent entry', async () => {
      await expect(service.updateEntry('non-existent', { text: 'hi' })).rejects.toThrow(
        'Entry not found'
      );
    });

    it('should validate signifiers on update', async () => {
      const entry = await service.createEntry(makeEntryInput());
      const badSignifiers: Signifier[] = [
        { id: '1', symbol: '★', category: 'priority', label: 'A' },
        { id: '2', symbol: '!', category: 'priority', label: 'B' },
      ];
      await expect(
        service.updateEntry(entry.id, { signifiers: badSignifiers })
      ).rejects.toThrow('Maximum of 1 priority signifier allowed per entry');
    });
  });

  describe('deleteEntry', () => {
    it('should delete an existing entry', async () => {
      const entry = await service.createEntry(makeEntryInput());
      await service.deleteEntry(entry.id);
      const entries = await service.getEntriesByPage('page-1');
      expect(entries).toHaveLength(0);
    });

    it('should throw on non-existent entry', async () => {
      await expect(service.deleteEntry('non-existent')).rejects.toThrow('Entry not found');
    });
  });

  describe('getEntriesByPage', () => {
    it('should return entries for a specific page', async () => {
      await service.createEntry(makeEntryInput({ pageId: 'page-1' }));
      await service.createEntry(makeEntryInput({ pageId: 'page-1', text: 'Second' }));
      await service.createEntry(makeEntryInput({ pageId: 'page-2', text: 'Other page' }));

      const entries = await service.getEntriesByPage('page-1');
      expect(entries).toHaveLength(2);
      entries.forEach((e) => expect(e.pageId).toBe('page-1'));
    });

    it('should return empty array for page with no entries', async () => {
      const entries = await service.getEntriesByPage('empty-page');
      expect(entries).toHaveLength(0);
    });
  });

  describe('getEntriesByDateRange', () => {
    it('should return entries within date range', async () => {
      await service.createEntry(
        makeEntryInput({ type: 'event', text: 'Jan event', date: new Date('2024-01-15') })
      );
      await service.createEntry(
        makeEntryInput({ type: 'event', text: 'Feb event', date: new Date('2024-02-15') })
      );
      await service.createEntry(
        makeEntryInput({ type: 'event', text: 'Mar event', date: new Date('2024-03-15') })
      );

      const entries = await service.getEntriesByDateRange(
        new Date('2024-01-01'),
        new Date('2024-02-28')
      );
      expect(entries).toHaveLength(2);
    });

    it('should include entries on boundary dates (inclusive)', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      await service.createEntry(
        makeEntryInput({ type: 'event', text: 'Start', date: startDate })
      );
      await service.createEntry(
        makeEntryInput({ type: 'event', text: 'End', date: endDate })
      );

      const entries = await service.getEntriesByDateRange(startDate, endDate);
      expect(entries).toHaveLength(2);
    });

    it('should exclude entries without a date', async () => {
      await service.createEntry(makeEntryInput({ text: 'No date task' }));
      const entries = await service.getEntriesByDateRange(
        new Date('2020-01-01'),
        new Date('2030-12-31')
      );
      expect(entries).toHaveLength(0);
    });
  });
});

describe('EntryService - Property-Based Tests', () => {
  let repository: InMemoryRepository<Entry>;
  let service: EntryService;

  beforeEach(() => {
    repository = new InMemoryRepository<Entry>();
    service = createEntryService(repository);
  });

  // Arbitrary for valid entry types
  const entryTypeArb = fc.constantFrom<EntryType>('task', 'event', 'note');

  // Arbitrary for valid entry text (1-500 chars, non-whitespace-only)
  const validTextArb = fc
    .string({ minLength: 1, maxLength: 500 })
    .filter((s) => s.trim().length > 0);

  // Arbitrary for invalid text (empty or whitespace-only)
  const invalidTextArb = fc.constantFrom('', ' ', '  \t\n  ', '\n', '\t');

  /**
   * **Validates: Requirements 4.1, 4.5, 4.6**
   * Property 8: Entry validation correctness
   */
  it('should accept any valid type and text combination', () => {
    fc.assert(
      fc.property(entryTypeArb, validTextArb, (type, text) => {
        const entry = makeFullEntry({ type, text });
        const result = validateEntry(entry);
        return result.valid === true;
      })
    );
  });

  /**
   * **Validates: Requirements 4.5, 4.6**
   * Property 8: Entry validation rejects empty/whitespace text
   */
  it('should reject empty or whitespace-only text', () => {
    fc.assert(
      fc.property(entryTypeArb, invalidTextArb, (type, text) => {
        const entry = makeFullEntry({ type, text });
        const result = validateEntry(entry);
        return result.valid === false;
      })
    );
  });

  /**
   * **Validates: Requirements 4.6**
   * Property 8: Entry validation rejects text exceeding 500 chars
   */
  it('should reject text exceeding 500 characters', () => {
    fc.assert(
      fc.property(
        entryTypeArb,
        fc.string({ minLength: 501, maxLength: 1000 }).filter((s) => s.trim().length > 500),
        (type, text) => {
          const entry = makeFullEntry({ type, text });
          const result = validateEntry(entry);
          return result.valid === false;
        }
      )
    );
  });

  /**
   * **Validates: Requirements 4.4**
   * Property 9: Signifier composition constraints
   */
  it('should accept signifier sets with at most 3 total, at most 1 priority, at most 2 category', () => {
    const signifierArb = fc
      .record({
        id: fc.uuid(),
        symbol: fc.string({ minLength: 1, maxLength: 3 }),
        category: fc.constantFrom<'type' | 'priority' | 'category'>('type', 'priority', 'category'),
        label: fc.string({ minLength: 1, maxLength: 20 }),
      })
      .map((s) => s as Signifier);

    const validSignifiersArb = fc
      .array(signifierArb, { minLength: 0, maxLength: 3 })
      .filter((sigs) => {
        const priorityCount = sigs.filter((s) => s.category === 'priority').length;
        const categoryCount = sigs.filter((s) => s.category === 'category').length;
        return priorityCount <= 1 && categoryCount <= 2;
      });

    fc.assert(
      fc.property(validSignifiersArb, (signifiers) => {
        const result = validateSignifiers(signifiers);
        return result.valid === true;
      })
    );
  });

  /**
   * **Validates: Requirements 4.4**
   * Property 9: Signifier composition rejects invalid combinations
   */
  it('should reject signifier sets exceeding constraints', () => {
    const prioritySignifier: Signifier = {
      id: 'p1',
      symbol: '★',
      category: 'priority',
      label: 'Priority',
    };

    // More than 1 priority should fail
    const twoPriority: Signifier[] = [
      prioritySignifier,
      { ...prioritySignifier, id: 'p2', symbol: '!' },
    ];
    expect(validateSignifiers(twoPriority).valid).toBe(false);

    // More than 3 total should fail
    const fourSignifiers: Signifier[] = [
      { id: '1', symbol: '•', category: 'type', label: 'A' },
      { id: '2', symbol: '★', category: 'priority', label: 'B' },
      { id: '3', symbol: '#', category: 'category', label: 'C' },
      { id: '4', symbol: '@', category: 'category', label: 'D' },
    ];
    expect(validateSignifiers(fourSignifiers).valid).toBe(false);
  });

  /**
   * **Validates: Requirements 4.2**
   * Default signifiers are assigned correctly per type
   */
  it('should assign correct default signifier for each entry type', () => {
    fc.assert(
      fc.asyncProperty(entryTypeArb, validTextArb, async (type, text) => {
        const entry = await service.createEntry(makeEntryInput({ type, text }));
        const typeSignifier = entry.signifiers.find((s) => s.category === 'type');
        expect(typeSignifier).toBeDefined();

        if (type === 'task') expect(typeSignifier!.symbol).toBe('•');
        if (type === 'event') expect(typeSignifier!.symbol).toBe('○');
        if (type === 'note') expect(typeSignifier!.symbol).toBe('–');
      })
    );
  });
});
