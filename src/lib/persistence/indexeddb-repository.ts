import type { Repository } from '@/types/services';

const DB_NAME = 'digital-bullet-journal-cache';
const DB_VERSION = 1;

/**
 * Store configuration for the IndexedDB database.
 * Defines key paths and indexes for each object store.
 */
interface StoreConfig {
  keyPath: string | string[];
  indexes: { name: string; keyPath: string | string[]; options?: IDBIndexParameters }[];
}

export const STORE_CONFIGS: Record<string, StoreConfig> = {
  layouts: {
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name' },
      { name: 'isBuiltIn', keyPath: 'isBuiltIn' },
    ],
  },
  journalPages: {
    keyPath: 'id',
    indexes: [
      { name: 'layoutId', keyPath: 'layoutId' },
      { name: 'createdAt', keyPath: 'createdAt' },
    ],
  },
  entries: {
    keyPath: 'id',
    indexes: [
      { name: 'pageId', keyPath: 'pageId' },
      { name: 'type', keyPath: 'type' },
      { name: 'date', keyPath: 'date' },
      { name: 'state', keyPath: 'state' },
    ],
  },
  collections: {
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name' },
      { name: 'isTemplate', keyPath: 'isTemplate' },
    ],
  },
  collectionEntries: {
    keyPath: ['collectionId', 'entryId'],
    indexes: [
      { name: 'collectionId', keyPath: 'collectionId' },
      { name: 'entryId', keyPath: 'entryId' },
    ],
  },
  calendarConfig: {
    keyPath: 'id',
    indexes: [],
  },
  syncMetadata: {
    keyPath: ['entityType', 'entityId'],
    indexes: [
      { name: 'isDirty', keyPath: 'isDirty' },
      { name: 'lastSyncedAt', keyPath: 'lastSyncedAt' },
    ],
  },
  galleryTemplatesCache: {
    keyPath: 'id',
    indexes: [
      { name: 'category', keyPath: 'category' },
      { name: 'isFeatured', keyPath: 'isFeatured' },
    ],
  },
};

/**
 * Opens (or creates) the IndexedDB database with all required stores.
 */
export function openDatabase(indexedDB?: IDBFactory): Promise<IDBDatabase> {
  const factory = indexedDB ?? globalThis.indexedDB;
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      for (const [storeName, config] of Object.entries(STORE_CONFIGS)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
          for (const index of config.indexes) {
            store.createIndex(index.name, index.keyPath, index.options);
          }
        }
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * IndexedDB implementation of the Repository interface.
 * Provides offline caching for all entity types.
 */
export class IndexedDBRepository<T extends { id: string }> implements Repository<T> {
  private dbPromise: Promise<IDBDatabase>;
  private storeName: string;

  constructor(storeName: string, indexedDB?: IDBFactory) {
    if (!STORE_CONFIGS[storeName]) {
      throw new Error(`Unknown store: ${storeName}. Valid stores: ${Object.keys(STORE_CONFIGS).join(', ')}`);
    }
    this.storeName = storeName;
    this.dbPromise = openDatabase(indexedDB);
  }

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.storeName, mode);
    return tx.objectStore(this.storeName);
  }

  async getById(id: string): Promise<T | null> {
    const store = await this.getStore('readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<T[]> {
    const store = await this.getStore('readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async create(item: T): Promise<T> {
    const store = await this.getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async update(id: string, changes: Partial<T>): Promise<T> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Item not found: ${id}`);
    }
    const updated = { ...existing, ...changes };
    const store = await this.getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const store = await this.getStore('readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.getAll();
    return all.filter(predicate);
  }

  /** Close the underlying database connection */
  async close(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
  }
}
