import type { Layout, ContentArea } from '@/types/models';
import type { LayoutService, ValidationResult, Repository } from '@/types/services';
import { validateLayout, validateLayoutName, isLayoutNameUnique } from '@/lib/validators/layout-validator';

/**
 * Built-in layout definitions.
 * These are always available and cannot be modified or deleted.
 */
const BUILT_IN_LAYOUTS: Layout[] = [
  {
    id: 'builtin-daily-log',
    userId: 'system',
    name: 'Daily Log',
    isBuiltIn: true,
    contentAreas: [
      { id: 'daily-header', type: 'text', x: 0, y: 0, width: 100, height: 10 },
      { id: 'daily-tasks', type: 'checklist', x: 0, y: 10, width: 100, height: 60 },
      { id: 'daily-notes', type: 'text', x: 0, y: 70, width: 100, height: 30 },
    ],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'builtin-weekly-spread',
    userId: 'system',
    name: 'Weekly Spread',
    isBuiltIn: true,
    contentAreas: [
      { id: 'weekly-header', type: 'text', x: 0, y: 0, width: 100, height: 10 },
      { id: 'weekly-mon', type: 'checklist', x: 0, y: 10, width: 50, height: 30 },
      { id: 'weekly-tue', type: 'checklist', x: 50, y: 10, width: 50, height: 30 },
      { id: 'weekly-wed', type: 'checklist', x: 0, y: 40, width: 50, height: 30 },
      { id: 'weekly-thu', type: 'checklist', x: 50, y: 40, width: 50, height: 30 },
      { id: 'weekly-fri', type: 'checklist', x: 0, y: 70, width: 33, height: 30 },
      { id: 'weekly-sat', type: 'checklist', x: 33, y: 70, width: 34, height: 30 },
      { id: 'weekly-sun', type: 'checklist', x: 67, y: 70, width: 33, height: 30 },
    ],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'builtin-monthly-log',
    userId: 'system',
    name: 'Monthly Log',
    isBuiltIn: true,
    contentAreas: [
      { id: 'monthly-header', type: 'text', x: 0, y: 0, width: 100, height: 10 },
      { id: 'monthly-calendar', type: 'text', x: 0, y: 10, width: 60, height: 90 },
      { id: 'monthly-tasks', type: 'checklist', x: 60, y: 10, width: 40, height: 90 },
    ],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'builtin-blank-page',
    userId: 'system',
    name: 'Blank Page',
    isBuiltIn: true,
    contentAreas: [
      { id: 'blank-area', type: 'blank', x: 0, y: 0, width: 100, height: 100 },
    ],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
];

/**
 * Returns the list of built-in layouts.
 */
export function getBuiltInLayouts(): Layout[] {
  return BUILT_IN_LAYOUTS.map((layout) => ({ ...layout }));
}

/**
 * Creates a LayoutService implementation backed by a Repository.
 * The repository stores custom layouts only; built-in layouts are always available in memory.
 */
export function createLayoutService(repository: Repository<Layout>): LayoutService {
  return {
    getBuiltInLayouts(): Layout[] {
      return getBuiltInLayouts();
    },

    async getCustomLayouts(): Promise<Layout[]> {
      return repository.getAll();
    },

    async getAllLayouts(): Promise<Layout[]> {
      const customLayouts = await repository.getAll();
      return [...getBuiltInLayouts(), ...customLayouts];
    },

    async createCustomLayout(layoutData: Omit<Layout, 'id' | 'createdAt'>): Promise<Layout> {
      // Validate layout name
      const nameResult = validateLayoutName(layoutData.name);
      if (!nameResult.valid) {
        throw new Error(nameResult.errors.join('; '));
      }

      // Check name uniqueness against all layouts (built-in + custom)
      const allLayouts = await this.getAllLayouts();
      const uniqueResult = isLayoutNameUnique(layoutData.name, allLayouts);
      if (!uniqueResult.valid) {
        throw new Error(uniqueResult.errors.join('; '));
      }

      // Build the full layout for structural validation
      const now = new Date();
      const layout: Layout = {
        ...layoutData,
        id: crypto.randomUUID(),
        isBuiltIn: false,
        createdAt: now,
        updatedAt: now,
      };

      // Validate layout structure (content areas)
      const structureResult = validateLayout(layout);
      if (!structureResult.valid) {
        throw new Error(structureResult.errors.join('; '));
      }

      return repository.create(layout);
    },

    async updateCustomLayout(id: string, changes: Partial<Layout>): Promise<Layout> {
      const existing = await repository.getById(id);
      if (!existing) {
        throw new Error(`Layout not found: ${id}`);
      }

      if (existing.isBuiltIn) {
        throw new Error('Cannot modify a built-in layout');
      }

      // Validate name if being updated
      if (changes.name !== undefined) {
        const nameResult = validateLayoutName(changes.name);
        if (!nameResult.valid) {
          throw new Error(nameResult.errors.join('; '));
        }

        // Check uniqueness excluding the current layout
        const allLayouts = await this.getAllLayouts();
        const uniqueResult = isLayoutNameUnique(changes.name, allLayouts, id);
        if (!uniqueResult.valid) {
          throw new Error(uniqueResult.errors.join('; '));
        }
      }

      // Validate content areas if being updated
      if (changes.contentAreas !== undefined) {
        const merged: Layout = { ...existing, ...changes, updatedAt: new Date() };
        const structureResult = validateLayout(merged);
        if (!structureResult.valid) {
          throw new Error(structureResult.errors.join('; '));
        }
      }

      // Prevent changing isBuiltIn or id
      const { id: _id, isBuiltIn: _isBuiltIn, ...safeChanges } = changes;

      return repository.update(id, { ...safeChanges, updatedAt: new Date() });
    },

    async deleteCustomLayout(id: string): Promise<void> {
      const existing = await repository.getById(id);
      if (!existing) {
        throw new Error(`Layout not found: ${id}`);
      }

      if (existing.isBuiltIn) {
        throw new Error('Cannot delete a built-in layout');
      }

      // Delete the layout from the repository.
      // Journal pages referencing this layout are preserved — they retain
      // the layoutId reference. The database schema uses ON DELETE SET NULL
      // for the foreign key, and the client-side service simply removes
      // the layout without touching journal pages.
      await repository.delete(id);
    },

    validateLayout(layout: Layout): ValidationResult {
      return validateLayout(layout);
    },
  };
}
