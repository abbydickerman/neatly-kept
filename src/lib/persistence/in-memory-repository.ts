import type { Repository } from '@/types/services';

/**
 * In-memory implementation of the Repository interface.
 * Useful for testing and as a fallback when IndexedDB is unavailable.
 */
export class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private store: Map<string, T> = new Map();

  async getById(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async getAll(): Promise<T[]> {
    return Array.from(this.store.values());
  }

  async create(item: T): Promise<T> {
    this.store.set(item.id, { ...item });
    return { ...item };
  }

  async update(id: string, changes: Partial<T>): Promise<T> {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Item not found: ${id}`);
    }
    const updated = { ...existing, ...changes };
    this.store.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    return Array.from(this.store.values()).filter(predicate);
  }

  /** Helper for tests: clear all data */
  clear(): void {
    this.store.clear();
  }

  /** Helper for tests: get current size */
  size(): number {
    return this.store.size;
  }
}
