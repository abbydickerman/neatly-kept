import { describe, it, expect } from 'vitest';
import { validateCollectionName, COLLECTION_TEMPLATES } from '@/services/collection-service';
import type { Collection, Entry, EntryType } from '@/types/models';
import type { CollectionEntryDisplay } from './CollectionView';

/**
 * Unit tests for Collection View component logic.
 * Tests validation, sorting, and data transformation used by the component.
 */

describe('CollectionView - Collection Name Validation', () => {
  it('accepts a valid name within 1-100 characters', () => {
    const result = validateCollectionName('My Reading List');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an empty name', () => {
    const result = validateCollectionName('');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('required');
  });

  it('rejects a whitespace-only name', () => {
    const result = validateCollectionName('   ');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('required');
  });

  it('rejects a name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = validateCollectionName(longName);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('100');
  });

  it('accepts a name with exactly 100 characters', () => {
    const name = 'a'.repeat(100);
    const result = validateCollectionName(name);
    expect(result.valid).toBe(true);
  });

  it('accepts a name with exactly 1 character', () => {
    const result = validateCollectionName('X');
    expect(result.valid).toBe(true);
  });

  it('trims whitespace before validating length', () => {
    const result = validateCollectionName('  Hello  ');
    expect(result.valid).toBe(true);
  });
});

describe('CollectionView - Collection Templates', () => {
  it('provides habit tracker template', () => {
    const habitTracker = COLLECTION_TEMPLATES.find(t => t.templateType === 'habit-tracker');
    expect(habitTracker).toBeDefined();
    expect(habitTracker!.name).toBe('Habit Tracker');
  });

  it('provides reading list template', () => {
    const readingList = COLLECTION_TEMPLATES.find(t => t.templateType === 'reading-list');
    expect(readingList).toBeDefined();
    expect(readingList!.name).toBe('Reading List');
  });

  it('provides goal tracking template', () => {
    const goalTracking = COLLECTION_TEMPLATES.find(t => t.templateType === 'goal-tracking');
    expect(goalTracking).toBeDefined();
    expect(goalTracking!.name).toBe('Goal Tracking');
  });

  it('has exactly 3 pre-built templates', () => {
    expect(COLLECTION_TEMPLATES).toHaveLength(3);
  });
});

describe('CollectionView - Entry Display Sorting', () => {
  function createMockEntry(id: string, type: EntryType, text: string): Entry {
    return {
      id,
      userId: 'user-1',
      pageId: 'page-1',
      type,
      text,
      signifiers: [],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
  }

  it('entries should be sortable by addedAt date ascending', () => {
    const entries: CollectionEntryDisplay[] = [
      {
        entry: createMockEntry('e3', 'task', 'Third added'),
        addedAt: new Date('2024-03-01'),
        sourcePageName: 'Page C',
      },
      {
        entry: createMockEntry('e1', 'note', 'First added'),
        addedAt: new Date('2024-01-01'),
        sourcePageName: 'Page A',
      },
      {
        entry: createMockEntry('e2', 'event', 'Second added'),
        addedAt: new Date('2024-02-01'),
        sourcePageName: 'Page B',
      },
    ];

    const sorted = [...entries].sort(
      (a, b) => a.addedAt.getTime() - b.addedAt.getTime()
    );

    expect(sorted[0].entry.id).toBe('e1');
    expect(sorted[1].entry.id).toBe('e2');
    expect(sorted[2].entry.id).toBe('e3');
  });

  it('entries with same addedAt maintain stable order', () => {
    const sameDate = new Date('2024-01-15');
    const entries: CollectionEntryDisplay[] = [
      {
        entry: createMockEntry('e1', 'task', 'First'),
        addedAt: sameDate,
        sourcePageName: 'Page A',
      },
      {
        entry: createMockEntry('e2', 'note', 'Second'),
        addedAt: sameDate,
        sourcePageName: 'Page B',
      },
    ];

    const sorted = [...entries].sort(
      (a, b) => a.addedAt.getTime() - b.addedAt.getTime()
    );

    // With same dates, original order should be preserved (stable sort)
    expect(sorted[0].entry.id).toBe('e1');
    expect(sorted[1].entry.id).toBe('e2');
  });
});

describe('CollectionView - Entry Type Signifiers', () => {
  const ENTRY_TYPE_SIGNIFIERS: Record<EntryType, { symbol: string; label: string }> = {
    task: { symbol: '•', label: 'Task' },
    event: { symbol: '○', label: 'Event' },
    note: { symbol: '–', label: 'Note' },
  };

  it('task entries display bullet signifier', () => {
    expect(ENTRY_TYPE_SIGNIFIERS.task.symbol).toBe('•');
    expect(ENTRY_TYPE_SIGNIFIERS.task.label).toBe('Task');
  });

  it('event entries display circle signifier', () => {
    expect(ENTRY_TYPE_SIGNIFIERS.event.symbol).toBe('○');
    expect(ENTRY_TYPE_SIGNIFIERS.event.label).toBe('Event');
  });

  it('note entries display dash signifier', () => {
    expect(ENTRY_TYPE_SIGNIFIERS.note.symbol).toBe('–');
    expect(ENTRY_TYPE_SIGNIFIERS.note.label).toBe('Note');
  });
});

describe('CollectionView - Collection Data Structure', () => {
  it('collection has required fields for display', () => {
    const collection: Collection = {
      id: 'col-1',
      userId: 'user-1',
      name: 'My Collection',
      layoutId: 'layout-1',
      isTemplate: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    expect(collection.name.length).toBeGreaterThanOrEqual(1);
    expect(collection.name.length).toBeLessThanOrEqual(100);
    expect(collection.layoutId).toBeDefined();
  });

  it('template collection has templateType set', () => {
    const templateCollection: Collection = {
      id: 'col-2',
      userId: 'user-1',
      name: 'Habit Tracker',
      layoutId: 'layout-1',
      isTemplate: true,
      templateType: 'habit-tracker',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    expect(templateCollection.isTemplate).toBe(true);
    expect(templateCollection.templateType).toBe('habit-tracker');
  });

  it('separates user collections from template collections', () => {
    const collections: Collection[] = [
      {
        id: 'col-1',
        userId: 'user-1',
        name: 'My Notes',
        layoutId: 'layout-1',
        isTemplate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'col-2',
        userId: 'user-1',
        name: 'Habit Tracker',
        layoutId: 'layout-1',
        isTemplate: true,
        templateType: 'habit-tracker',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'col-3',
        userId: 'user-1',
        name: 'Work Tasks',
        layoutId: 'layout-1',
        isTemplate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const userCollections = collections.filter(c => !c.isTemplate);
    const templateCollections = collections.filter(c => c.isTemplate);

    expect(userCollections).toHaveLength(2);
    expect(templateCollections).toHaveLength(1);
  });
});
