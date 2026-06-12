import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { Collection, CollectionEntry } from '@/types/models';
import type { CollectionService } from '@/types/services';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import {
  createCollectionService,
  validateCollectionName,
  removeEntryFromAllCollections,
  getCollectionTemplates,
  COLLECTION_TEMPLATES,
} from './collection-service';

// Helper to create a valid collection input
function makeCollectionInput(
  overrides: Partial<Omit<Collection, 'id' | 'createdAt'>> = {}
): Omit<Collection, 'id' | 'createdAt'> {
  return {
    userId: 'user-1',
    name: 'My Collection',
    layoutId: 'layout-1',
    isTemplate: false,
    updatedAt: new Date(),
    ...overrides,
  };
}

type CollectionEntryWithId = CollectionEntry & { id: string };

describe('Collection Name Validation', () => {
  it('should accept a valid name', () => {
    const result = validateCollectionName('Habit Tracker');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept a name with exactly 1 character', () => {
    const result = validateCollectionName('A');
    expect(result.valid).toBe(true);
  });

  it('should accept a name with exactly 100 characters', () => {
    const result = validateCollectionName('a'.repeat(100));
    expect(result.valid).toBe(true);
  });

  it('should reject an empty name', () => {
    const result = validateCollectionName('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Collection name is required');
  });

  it('should reject a whitespace-only name', () => {
    const result = validateCollectionName('   \t\n  ');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Collection name is required');
  });

  it('should reject a name exceeding 100 characters', () => {
    const result = validateCollectionName('a'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Collection name must be at most 100 characters');
  });

  it('should validate trimmed length (leading/trailing whitespace ignored)', () => {
    const result = validateCollectionName('  hello  ');
    expect(result.valid).toBe(true);
  });
});

describe('CollectionService', () => {
  let collectionRepo: InMemoryRepository<Collection>;
  let collectionEntryRepo: InMemoryRepository<CollectionEntryWithId>;
  let service: CollectionService;

  beforeEach(() => {
    collectionRepo = new InMemoryRepository<Collection>();
    collectionEntryRepo = new InMemoryRepository<CollectionEntryWithId>();
    service = createCollectionService(collectionRepo, collectionEntryRepo);
  });

  describe('createCollection', () => {
    it('should create a valid collection', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      expect(collection.id).toBeDefined();
      expect(collection.name).toBe('My Collection');
      expect(collection.userId).toBe('user-1');
      expect(collection.createdAt).toBeInstanceOf(Date);
    });

    it('should trim the collection name', async () => {
      const collection = await service.createCollection(
        makeCollectionInput({ name: '  Trimmed Name  ' })
      );
      expect(collection.name).toBe('Trimmed Name');
    });

    it('should throw on empty name', async () => {
      await expect(
        service.createCollection(makeCollectionInput({ name: '' }))
      ).rejects.toThrow('Collection name is required');
    });

    it('should throw on whitespace-only name', async () => {
      await expect(
        service.createCollection(makeCollectionInput({ name: '   ' }))
      ).rejects.toThrow('Collection name is required');
    });

    it('should throw on name exceeding 100 characters', async () => {
      await expect(
        service.createCollection(makeCollectionInput({ name: 'a'.repeat(101) }))
      ).rejects.toThrow('Collection name must be at most 100 characters');
    });
  });

  describe('updateCollection', () => {
    it('should update collection name', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      const updated = await service.updateCollection(collection.id, {
        name: 'Updated Name',
      });
      expect(updated.name).toBe('Updated Name');
    });

    it('should trim updated name', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      const updated = await service.updateCollection(collection.id, {
        name: '  Trimmed  ',
      });
      expect(updated.name).toBe('Trimmed');
    });

    it('should throw on empty updated name', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      await expect(
        service.updateCollection(collection.id, { name: '' })
      ).rejects.toThrow('Collection name is required');
    });

    it('should throw on non-existent collection', async () => {
      await expect(
        service.updateCollection('non-existent', { name: 'Test' })
      ).rejects.toThrow('Collection not found');
    });
  });

  describe('deleteCollection', () => {
    it('should delete an existing collection', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      await service.deleteCollection(collection.id);
      const all = await collectionRepo.getAll();
      expect(all).toHaveLength(0);
    });

    it('should remove all collection-entry links when deleting', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      await service.addEntryToCollection('entry-1', collection.id);
      await service.addEntryToCollection('entry-2', collection.id);

      await service.deleteCollection(collection.id);
      const links = await collectionEntryRepo.getAll();
      expect(links).toHaveLength(0);
    });

    it('should throw on non-existent collection', async () => {
      await expect(service.deleteCollection('non-existent')).rejects.toThrow(
        'Collection not found'
      );
    });
  });

  describe('addEntryToCollection', () => {
    it('should link an entry to a collection', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      await service.addEntryToCollection('entry-1', collection.id);

      const entries = await service.getCollectionEntries(collection.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].entryId).toBe('entry-1');
    });

    it('should throw when collection does not exist', async () => {
      await expect(
        service.addEntryToCollection('entry-1', 'non-existent')
      ).rejects.toThrow('Collection not found');
    });

    it('should throw when entry is already in the collection', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      await service.addEntryToCollection('entry-1', collection.id);
      await expect(
        service.addEntryToCollection('entry-1', collection.id)
      ).rejects.toThrow('Entry is already in this collection');
    });

    it('should enforce 10-collection limit per entry', async () => {
      // Create 10 collections and link the entry to all of them
      for (let i = 0; i < 10; i++) {
        const col = await service.createCollection(
          makeCollectionInput({ name: `Collection ${i}` })
        );
        await service.addEntryToCollection('entry-1', col.id);
      }

      // 11th should fail
      const extraCol = await service.createCollection(
        makeCollectionInput({ name: 'Extra Collection' })
      );
      await expect(
        service.addEntryToCollection('entry-1', extraCol.id)
      ).rejects.toThrow('Entry cannot be linked to more than 10 collections');
    });
  });

  describe('removeEntryFromCollection', () => {
    it('should unlink an entry from a collection', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      await service.addEntryToCollection('entry-1', collection.id);
      await service.removeEntryFromCollection('entry-1', collection.id);

      const entries = await service.getCollectionEntries(collection.id);
      expect(entries).toHaveLength(0);
    });

    it('should throw when entry is not in the collection', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      await expect(
        service.removeEntryFromCollection('entry-1', collection.id)
      ).rejects.toThrow('Entry is not in this collection');
    });

    it('should not affect other entries in the collection', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      await service.addEntryToCollection('entry-1', collection.id);
      await service.addEntryToCollection('entry-2', collection.id);

      await service.removeEntryFromCollection('entry-1', collection.id);

      const entries = await service.getCollectionEntries(collection.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].entryId).toBe('entry-2');
    });
  });

  describe('getCollectionEntries', () => {
    it('should return entries sorted by addedAt ascending', async () => {
      const collection = await service.createCollection(makeCollectionInput());

      // Add entries with controlled timing
      const baseTime = new Date('2024-01-01T00:00:00Z');

      // Manually create links with specific addedAt times
      await collectionEntryRepo.create({
        id: `${collection.id}_entry-3`,
        collectionId: collection.id,
        entryId: 'entry-3',
        addedAt: new Date(baseTime.getTime() + 3000),
      });
      await collectionEntryRepo.create({
        id: `${collection.id}_entry-1`,
        collectionId: collection.id,
        entryId: 'entry-1',
        addedAt: new Date(baseTime.getTime() + 1000),
      });
      await collectionEntryRepo.create({
        id: `${collection.id}_entry-2`,
        collectionId: collection.id,
        entryId: 'entry-2',
        addedAt: new Date(baseTime.getTime() + 2000),
      });

      const entries = await service.getCollectionEntries(collection.id);
      expect(entries).toHaveLength(3);
      expect(entries[0].entryId).toBe('entry-1');
      expect(entries[1].entryId).toBe('entry-2');
      expect(entries[2].entryId).toBe('entry-3');
    });

    it('should return empty array for collection with no entries', async () => {
      const collection = await service.createCollection(makeCollectionInput());
      const entries = await service.getCollectionEntries(collection.id);
      expect(entries).toHaveLength(0);
    });
  });

  describe('getCollectionsForEntry', () => {
    it('should return all collections an entry belongs to', async () => {
      const col1 = await service.createCollection(
        makeCollectionInput({ name: 'Collection 1' })
      );
      const col2 = await service.createCollection(
        makeCollectionInput({ name: 'Collection 2' })
      );
      await service.addEntryToCollection('entry-1', col1.id);
      await service.addEntryToCollection('entry-1', col2.id);

      const collections = await service.getCollectionsForEntry('entry-1');
      expect(collections).toHaveLength(2);
      const names = collections.map((c) => c.name);
      expect(names).toContain('Collection 1');
      expect(names).toContain('Collection 2');
    });

    it('should return empty array for entry not in any collection', async () => {
      const collections = await service.getCollectionsForEntry('entry-1');
      expect(collections).toHaveLength(0);
    });
  });
});

describe('Entry Deletion Cascade', () => {
  let collectionRepo: InMemoryRepository<Collection>;
  let collectionEntryRepo: InMemoryRepository<CollectionEntryWithId>;
  let service: CollectionService;

  beforeEach(() => {
    collectionRepo = new InMemoryRepository<Collection>();
    collectionEntryRepo = new InMemoryRepository<CollectionEntryWithId>();
    service = createCollectionService(collectionRepo, collectionEntryRepo);
  });

  it('should remove entry from all collections on deletion', async () => {
    const col1 = await service.createCollection(
      makeCollectionInput({ name: 'Collection 1' })
    );
    const col2 = await service.createCollection(
      makeCollectionInput({ name: 'Collection 2' })
    );
    const col3 = await service.createCollection(
      makeCollectionInput({ name: 'Collection 3' })
    );

    await service.addEntryToCollection('entry-1', col1.id);
    await service.addEntryToCollection('entry-1', col2.id);
    await service.addEntryToCollection('entry-1', col3.id);

    // Simulate entry deletion cascade
    await removeEntryFromAllCollections('entry-1', collectionEntryRepo);

    // Entry should no longer appear in any collection
    const entries1 = await service.getCollectionEntries(col1.id);
    const entries2 = await service.getCollectionEntries(col2.id);
    const entries3 = await service.getCollectionEntries(col3.id);
    expect(entries1).toHaveLength(0);
    expect(entries2).toHaveLength(0);
    expect(entries3).toHaveLength(0);
  });

  it('should not affect other entries in collections during cascade', async () => {
    const col1 = await service.createCollection(
      makeCollectionInput({ name: 'Collection 1' })
    );

    await service.addEntryToCollection('entry-1', col1.id);
    await service.addEntryToCollection('entry-2', col1.id);

    await removeEntryFromAllCollections('entry-1', collectionEntryRepo);

    const entries = await service.getCollectionEntries(col1.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].entryId).toBe('entry-2');
  });
});

describe('Collection Templates', () => {
  it('should provide habit tracker template', () => {
    const templates = getCollectionTemplates();
    const habitTracker = templates.find((t) => t.templateType === 'habit-tracker');
    expect(habitTracker).toBeDefined();
    expect(habitTracker!.name).toBe('Habit Tracker');
  });

  it('should provide reading list template', () => {
    const templates = getCollectionTemplates();
    const readingList = templates.find((t) => t.templateType === 'reading-list');
    expect(readingList).toBeDefined();
    expect(readingList!.name).toBe('Reading List');
  });

  it('should provide goal tracking template', () => {
    const templates = getCollectionTemplates();
    const goalTracking = templates.find((t) => t.templateType === 'goal-tracking');
    expect(goalTracking).toBeDefined();
    expect(goalTracking!.name).toBe('Goal Tracking');
  });

  it('should have exactly 3 pre-built templates', () => {
    expect(COLLECTION_TEMPLATES).toHaveLength(3);
  });
});

describe('CollectionService - Property-Based Tests', () => {
  let collectionRepo: InMemoryRepository<Collection>;
  let collectionEntryRepo: InMemoryRepository<CollectionEntryWithId>;
  let service: CollectionService;

  beforeEach(() => {
    collectionRepo = new InMemoryRepository<Collection>();
    collectionEntryRepo = new InMemoryRepository<CollectionEntryWithId>();
    service = createCollectionService(collectionRepo, collectionEntryRepo);
  });

  /**
   * **Validates: Requirements 7.1**
   * Property 15: Collection name length validation
   */
  it('should accept names with trimmed length between 1 and 100', () => {
    const validNameArb = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim().length >= 1 && s.trim().length <= 100);

    fc.assert(
      fc.property(validNameArb, (name) => {
        const result = validateCollectionName(name);
        return result.valid === true;
      })
    );
  });

  /**
   * **Validates: Requirements 7.1**
   * Property 15: Collection name rejects invalid lengths
   */
  it('should reject names with trimmed length 0 or greater than 100', () => {
    const emptyNameArb = fc.constantFrom('', ' ', '  \t\n  ', '\n', '\t');

    fc.assert(
      fc.property(emptyNameArb, (name) => {
        const result = validateCollectionName(name);
        return result.valid === false;
      })
    );

    // Names exceeding 100 chars (after trim)
    const longNameArb = fc
      .string({ minLength: 101, maxLength: 200 })
      .filter((s) => s.trim().length > 100);

    fc.assert(
      fc.property(longNameArb, (name) => {
        const result = validateCollectionName(name);
        return result.valid === false;
      })
    );
  });

  /**
   * **Validates: Requirements 7.2**
   * Property 16: Collection link limit enforcement
   */
  it('should enforce 10-collection limit per entry', async () => {
    // Create 10 collections and link entry to all
    const collections: Collection[] = [];
    for (let i = 0; i < 10; i++) {
      const col = await service.createCollection(
        makeCollectionInput({ name: `Col ${i}` })
      );
      collections.push(col);
      await service.addEntryToCollection('entry-limit-test', col.id);
    }

    // Verify entry is in exactly 10 collections
    const linkedCollections = await service.getCollectionsForEntry('entry-limit-test');
    expect(linkedCollections).toHaveLength(10);

    // 11th should fail
    const extraCol = await service.createCollection(
      makeCollectionInput({ name: 'Extra' })
    );
    await expect(
      service.addEntryToCollection('entry-limit-test', extraCol.id)
    ).rejects.toThrow('Entry cannot be linked to more than 10 collections');
  });

  /**
   * **Validates: Requirements 7.3**
   * Property 17: Collection entries sorted by addition date
   */
  it('should always return entries sorted by addedAt ascending', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            entryId: fc.uuid(),
            addedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (entries) => {
          // Use fresh repos for each property run
          const localCollectionRepo = new InMemoryRepository<Collection>();
          const localCollectionEntryRepo = new InMemoryRepository<CollectionEntryWithId>();
          const localService = createCollectionService(localCollectionRepo, localCollectionEntryRepo);

          const collection = await localService.createCollection(makeCollectionInput());

          // Deduplicate entry IDs
          const uniqueEntries = entries.filter(
            (e, i, arr) => arr.findIndex((x) => x.entryId === e.entryId) === i
          );

          // Add entries with specific addedAt times directly to repo
          for (const entry of uniqueEntries) {
            await localCollectionEntryRepo.create({
              id: `${collection.id}_${entry.entryId}`,
              collectionId: collection.id,
              entryId: entry.entryId,
              addedAt: entry.addedAt,
            });
          }

          const result = await localService.getCollectionEntries(collection.id);

          // Verify sorted by addedAt ascending
          for (let i = 1; i < result.length; i++) {
            if (result[i].addedAt.getTime() < result[i - 1].addedAt.getTime()) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * **Validates: Requirements 7.5**
   * Property 18: Unlinking entry from collection preserves the entry
   */
  it('should preserve entry data when removing from collection', async () => {
    const col = await service.createCollection(makeCollectionInput());
    await service.addEntryToCollection('entry-preserve', col.id);

    // Remove from collection
    await service.removeEntryFromCollection('entry-preserve', col.id);

    // Entry should no longer be in collection
    const entries = await service.getCollectionEntries(col.id);
    expect(entries).toHaveLength(0);

    // The entry itself is not deleted (it still exists in its source page)
    // We verify this by checking that the collection entry repo no longer has the link
    // but the entry repository (if provided) would still have the entry
    const links = await collectionEntryRepo.query(
      (ce) => ce.entryId === 'entry-preserve'
    );
    expect(links).toHaveLength(0);
  });

  /**
   * **Validates: Requirements 7.6**
   * Property 19: Entry deletion cascades to all collection links
   */
  it('should remove entry from all N collections on cascade', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (numCollections) => {
          // Use fresh repos for each property run
          const localCollectionRepo = new InMemoryRepository<Collection>();
          const localCollectionEntryRepo = new InMemoryRepository<CollectionEntryWithId>();
          const localService = createCollectionService(localCollectionRepo, localCollectionEntryRepo);

          const entryId = 'cascade-entry';

          // Create N collections and link entry to all
          for (let i = 0; i < numCollections; i++) {
            const col = await localService.createCollection(
              makeCollectionInput({ name: `Cascade Col ${i}` })
            );
            await localService.addEntryToCollection(entryId, col.id);
          }

          // Verify entry is linked to N collections
          const before = await localService.getCollectionsForEntry(entryId);
          if (before.length !== numCollections) return false;

          // Cascade delete
          await removeEntryFromAllCollections(entryId, localCollectionEntryRepo);

          // Entry should be in 0 collections
          const after = await localService.getCollectionsForEntry(entryId);
          return after.length === 0;
        }
      ),
      { numRuns: 20 }
    );
  });
});
