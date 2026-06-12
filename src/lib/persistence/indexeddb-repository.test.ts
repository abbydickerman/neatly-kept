import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBRepository, openDatabase, STORE_CONFIGS } from './indexeddb-repository';

interface TestEntity {
  id: string;
  name: string;
  value: number;
}

describe('IndexedDBRepository', () => {
  let repo: IndexedDBRepository<TestEntity>;
  let factory: IDBFactory;

  beforeEach(() => {
    // Create a fresh IDBFactory for each test to avoid cross-test contamination
    factory = new IDBFactory();
    repo = new IndexedDBRepository<TestEntity>('layouts', factory);
  });

  afterEach(async () => {
    await repo.close();
  });

  describe('constructor', () => {
    it('should throw for unknown store names', () => {
      expect(() => new IndexedDBRepository('nonexistent', factory)).toThrow(
        'Unknown store: nonexistent'
      );
    });

    it('should accept valid store names', () => {
      const validStores = Object.keys(STORE_CONFIGS);
      for (const storeName of validStores) {
        expect(() => new IndexedDBRepository(storeName, factory)).not.toThrow();
      }
    });
  });

  describe('create', () => {
    it('should store and return the item', async () => {
      const item: TestEntity = { id: '1', name: 'Test', value: 42 };
      const result = await repo.create(item);
      expect(result).toEqual(item);
    });

    it('should reject duplicate ids', async () => {
      const item: TestEntity = { id: '1', name: 'Test', value: 42 };
      await repo.create(item);
      await expect(repo.create(item)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return null for non-existent id', async () => {
      const result = await repo.getById('nonexistent');
      expect(result).toBeNull();
    });

    it('should return the item by id', async () => {
      const item: TestEntity = { id: '1', name: 'Test', value: 42 };
      await repo.create(item);
      const result = await repo.getById('1');
      expect(result).toEqual(item);
    });
  });

  describe('getAll', () => {
    it('should return empty array when store is empty', async () => {
      const result = await repo.getAll();
      expect(result).toEqual([]);
    });

    it('should return all items', async () => {
      const items: TestEntity[] = [
        { id: '1', name: 'First', value: 1 },
        { id: '2', name: 'Second', value: 2 },
        { id: '3', name: 'Third', value: 3 },
      ];
      for (const item of items) {
        await repo.create(item);
      }
      const result = await repo.getAll();
      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(items));
    });
  });

  describe('update', () => {
    it('should throw for non-existent id', async () => {
      await expect(repo.update('nonexistent', { name: 'Updated' })).rejects.toThrow(
        'Item not found: nonexistent'
      );
    });

    it('should merge changes into existing item', async () => {
      const item: TestEntity = { id: '1', name: 'Original', value: 10 };
      await repo.create(item);
      const updated = await repo.update('1', { name: 'Updated' });
      expect(updated).toEqual({ id: '1', name: 'Updated', value: 10 });
    });

    it('should persist the update', async () => {
      const item: TestEntity = { id: '1', name: 'Original', value: 10 };
      await repo.create(item);
      await repo.update('1', { value: 99 });
      const result = await repo.getById('1');
      expect(result).toEqual({ id: '1', name: 'Original', value: 99 });
    });
  });

  describe('delete', () => {
    it('should remove the item', async () => {
      const item: TestEntity = { id: '1', name: 'Test', value: 42 };
      await repo.create(item);
      await repo.delete('1');
      const result = await repo.getById('1');
      expect(result).toBeNull();
    });

    it('should not throw for non-existent id', async () => {
      await expect(repo.delete('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('query', () => {
    it('should return items matching the predicate', async () => {
      const items: TestEntity[] = [
        { id: '1', name: 'Alpha', value: 10 },
        { id: '2', name: 'Beta', value: 20 },
        { id: '3', name: 'Gamma', value: 30 },
      ];
      for (const item of items) {
        await repo.create(item);
      }
      const result = await repo.query((item) => item.value > 15);
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([items[1], items[2]]));
    });

    it('should return empty array when no items match', async () => {
      const item: TestEntity = { id: '1', name: 'Test', value: 5 };
      await repo.create(item);
      const result = await repo.query((item) => item.value > 100);
      expect(result).toEqual([]);
    });
  });
});

describe('openDatabase', () => {
  let factory: IDBFactory;

  beforeEach(() => {
    factory = new IDBFactory();
  });

  it('should create all required object stores', async () => {
    const db = await openDatabase(factory);
    const storeNames = Array.from(db.objectStoreNames);
    const expectedStores = Object.keys(STORE_CONFIGS);
    expect(storeNames).toEqual(expect.arrayContaining(expectedStores));
    expect(storeNames).toHaveLength(expectedStores.length);
    db.close();
  });

  it('should create indexes on the entries store', async () => {
    const db = await openDatabase(factory);
    const tx = db.transaction('entries', 'readonly');
    const store = tx.objectStore('entries');
    const indexNames = Array.from(store.indexNames);
    expect(indexNames).toContain('pageId');
    expect(indexNames).toContain('type');
    expect(indexNames).toContain('date');
    expect(indexNames).toContain('state');
    db.close();
  });

  it('should create indexes on the syncMetadata store', async () => {
    const db = await openDatabase(factory);
    const tx = db.transaction('syncMetadata', 'readonly');
    const store = tx.objectStore('syncMetadata');
    const indexNames = Array.from(store.indexNames);
    expect(indexNames).toContain('isDirty');
    expect(indexNames).toContain('lastSyncedAt');
    db.close();
  });
});

describe('STORE_CONFIGS', () => {
  it('should define all 8 required stores', () => {
    const requiredStores = [
      'layouts',
      'journalPages',
      'entries',
      'collections',
      'collectionEntries',
      'calendarConfig',
      'syncMetadata',
      'galleryTemplatesCache',
    ];
    for (const store of requiredStores) {
      expect(STORE_CONFIGS[store]).toBeDefined();
    }
  });

  it('should use compound key for collectionEntries', () => {
    expect(STORE_CONFIGS.collectionEntries.keyPath).toEqual(['collectionId', 'entryId']);
  });

  it('should use compound key for syncMetadata', () => {
    expect(STORE_CONFIGS.syncMetadata.keyPath).toEqual(['entityType', 'entityId']);
  });
});
