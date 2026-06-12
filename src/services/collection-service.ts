import type { Collection, CollectionEntry } from '@/types/models';
import type { CollectionService, ValidationResult, Repository } from '@/types/services';

/**
 * Maximum number of collections an entry can be linked to simultaneously.
 */
const MAX_COLLECTIONS_PER_ENTRY = 10;

/**
 * Pre-built collection templates with default configurations.
 */
export const COLLECTION_TEMPLATES: Array<{
  name: string;
  templateType: 'habit-tracker' | 'reading-list' | 'goal-tracking';
}> = [
  { name: 'Habit Tracker', templateType: 'habit-tracker' },
  { name: 'Reading List', templateType: 'reading-list' },
  { name: 'Goal Tracking', templateType: 'goal-tracking' },
];

/**
 * Validates a collection name.
 * Name must be 1-100 characters after trimming.
 */
export function validateCollectionName(name: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    errors.push('Collection name is required');
  } else if (trimmed.length > 100) {
    errors.push('Collection name must be at most 100 characters');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates a CollectionService implementation backed by repositories.
 */
export function createCollectionService(
  collectionRepository: Repository<Collection>,
  collectionEntryRepository: Repository<CollectionEntry & { id: string }>,
  entryRepository?: Repository<{ id: string; pageId: string }>
): CollectionService {
  return {
    async createCollection(
      collectionData: Omit<Collection, 'id' | 'createdAt'>
    ): Promise<Collection> {
      const nameResult = validateCollectionName(collectionData.name);
      if (!nameResult.valid) {
        throw new Error(nameResult.errors.join('; '));
      }

      const now = new Date();
      const collection: Collection = {
        ...collectionData,
        id: crypto.randomUUID(),
        name: collectionData.name.trim(),
        createdAt: now,
        updatedAt: now,
      };

      return collectionRepository.create(collection);
    },

    async updateCollection(
      id: string,
      changes: Partial<Collection>
    ): Promise<Collection> {
      const existing = await collectionRepository.getById(id);
      if (!existing) {
        throw new Error(`Collection not found: ${id}`);
      }

      if (changes.name !== undefined) {
        const nameResult = validateCollectionName(changes.name);
        if (!nameResult.valid) {
          throw new Error(nameResult.errors.join('; '));
        }
        changes.name = changes.name.trim();
      }

      return collectionRepository.update(id, { ...changes, updatedAt: new Date() });
    },

    async deleteCollection(id: string): Promise<void> {
      const existing = await collectionRepository.getById(id);
      if (!existing) {
        throw new Error(`Collection not found: ${id}`);
      }

      // Remove all collection-entry links for this collection
      const links = await collectionEntryRepository.query(
        (ce) => ce.collectionId === id
      );
      for (const link of links) {
        await collectionEntryRepository.delete(link.id);
      }

      await collectionRepository.delete(id);
    },

    async addEntryToCollection(
      entryId: string,
      collectionId: string
    ): Promise<void> {
      // Verify collection exists
      const collection = await collectionRepository.getById(collectionId);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      // Check if entry is already in this collection
      const existingLink = await collectionEntryRepository.query(
        (ce) => ce.entryId === entryId && ce.collectionId === collectionId
      );
      if (existingLink.length > 0) {
        throw new Error('Entry is already in this collection');
      }

      // Check 10-collection limit per entry
      const entryCollections = await collectionEntryRepository.query(
        (ce) => ce.entryId === entryId
      );
      if (entryCollections.length >= MAX_COLLECTIONS_PER_ENTRY) {
        throw new Error(
          `Entry cannot be linked to more than ${MAX_COLLECTIONS_PER_ENTRY} collections`
        );
      }

      const link: CollectionEntry & { id: string } = {
        id: `${collectionId}_${entryId}`,
        collectionId,
        entryId,
        addedAt: new Date(),
      };

      await collectionEntryRepository.create(link);
    },

    async removeEntryFromCollection(
      entryId: string,
      collectionId: string
    ): Promise<void> {
      const links = await collectionEntryRepository.query(
        (ce) => ce.entryId === entryId && ce.collectionId === collectionId
      );

      if (links.length === 0) {
        throw new Error('Entry is not in this collection');
      }

      await collectionEntryRepository.delete(links[0].id);
    },

    async getCollectionEntries(
      collectionId: string
    ): Promise<CollectionEntry[]> {
      const links = await collectionEntryRepository.query(
        (ce) => ce.collectionId === collectionId
      );

      // Sort by addedAt ascending
      return links
        .map(({ collectionId, entryId, addedAt }) => ({ collectionId, entryId, addedAt }))
        .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());
    },

    async getCollectionsForEntry(entryId: string): Promise<Collection[]> {
      const links = await collectionEntryRepository.query(
        (ce) => ce.entryId === entryId
      );

      const collections: Collection[] = [];
      for (const link of links) {
        const collection = await collectionRepository.getById(link.collectionId);
        if (collection) {
          collections.push(collection);
        }
      }

      return collections;
    },
  };
}

/**
 * Removes an entry from all collections it is linked to.
 * This implements the entry deletion cascade behavior (Requirement 7.6).
 */
export async function removeEntryFromAllCollections(
  entryId: string,
  collectionEntryRepository: Repository<CollectionEntry & { id: string }>
): Promise<void> {
  const links = await collectionEntryRepository.query(
    (ce) => ce.entryId === entryId
  );

  for (const link of links) {
    await collectionEntryRepository.delete(link.id);
  }
}

/**
 * Creates pre-built collection templates for a user.
 * Returns the created template collections.
 */
export function getCollectionTemplates(): Array<{
  name: string;
  templateType: 'habit-tracker' | 'reading-list' | 'goal-tracking';
}> {
  return [...COLLECTION_TEMPLATES];
}
