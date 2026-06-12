import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { Layout, ContentArea, ContentAreaType } from '@/types/models';
import type { LayoutService } from '@/types/services';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import { createLayoutService, getBuiltInLayouts } from './layout-service';

// === Helpers ===

function makeContentArea(overrides: Partial<ContentArea> = {}): ContentArea {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    ...overrides,
  };
}

function makeLayoutInput(
  overrides: Partial<Omit<Layout, 'id' | 'createdAt'>> = {}
): Omit<Layout, 'id' | 'createdAt'> {
  return {
    userId: 'user-1',
    name: 'My Custom Layout',
    isBuiltIn: false,
    contentAreas: [makeContentArea()],
    updatedAt: new Date(),
    ...overrides,
  };
}

// === Arbitraries for property-based tests ===

const validContentAreaTypeArb = fc.constantFrom<ContentAreaType>('text', 'checklist', 'image', 'blank');

const validContentAreaArb: fc.Arbitrary<ContentArea> = fc.record({
  id: fc.uuid(),
  type: validContentAreaTypeArb,
  x: fc.integer({ min: 0, max: 100 }),
  y: fc.integer({ min: 0, max: 100 }),
  width: fc.integer({ min: 5, max: 100 }),
  height: fc.integer({ min: 5, max: 100 }),
});

const validLayoutNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);

const validContentAreasArb = fc.array(validContentAreaArb, { minLength: 1, maxLength: 20 });

// === Unit Tests ===

describe('LayoutService - Built-in Layouts', () => {
  it('should return at least 4 built-in layouts', () => {
    const builtIns = getBuiltInLayouts();
    expect(builtIns.length).toBeGreaterThanOrEqual(4);
  });

  it('should include daily log, weekly spread, monthly log, and blank page', () => {
    const builtIns = getBuiltInLayouts();
    const names = builtIns.map((l) => l.name);
    expect(names).toContain('Daily Log');
    expect(names).toContain('Weekly Spread');
    expect(names).toContain('Monthly Log');
    expect(names).toContain('Blank Page');
  });

  it('should mark all built-in layouts as isBuiltIn: true', () => {
    const builtIns = getBuiltInLayouts();
    builtIns.forEach((layout) => {
      expect(layout.isBuiltIn).toBe(true);
    });
  });

  it('should return copies (not references) of built-in layouts', () => {
    const first = getBuiltInLayouts();
    const second = getBuiltInLayouts();
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it('each built-in layout should have at least 1 content area', () => {
    const builtIns = getBuiltInLayouts();
    builtIns.forEach((layout) => {
      expect(layout.contentAreas.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('LayoutService - CRUD Operations', () => {
  let repository: InMemoryRepository<Layout>;
  let service: LayoutService;

  beforeEach(() => {
    repository = new InMemoryRepository<Layout>();
    service = createLayoutService(repository);
  });

  describe('getBuiltInLayouts', () => {
    it('should return built-in layouts from the service', () => {
      const builtIns = service.getBuiltInLayouts();
      expect(builtIns.length).toBeGreaterThanOrEqual(4);
      builtIns.forEach((l) => expect(l.isBuiltIn).toBe(true));
    });
  });

  describe('getCustomLayouts', () => {
    it('should return empty array when no custom layouts exist', async () => {
      const customs = await service.getCustomLayouts();
      expect(customs).toHaveLength(0);
    });

    it('should return only custom layouts', async () => {
      await service.createCustomLayout(makeLayoutInput());
      const customs = await service.getCustomLayouts();
      expect(customs).toHaveLength(1);
      expect(customs[0].isBuiltIn).toBe(false);
    });
  });

  describe('getAllLayouts', () => {
    it('should return built-in layouts when no custom layouts exist', async () => {
      const all = await service.getAllLayouts();
      expect(all.length).toBeGreaterThanOrEqual(4);
    });

    it('should return both built-in and custom layouts', async () => {
      await service.createCustomLayout(makeLayoutInput());
      const all = await service.getAllLayouts();
      const builtInCount = all.filter((l) => l.isBuiltIn).length;
      const customCount = all.filter((l) => !l.isBuiltIn).length;
      expect(builtInCount).toBeGreaterThanOrEqual(4);
      expect(customCount).toBe(1);
    });
  });

  describe('createCustomLayout', () => {
    it('should create a valid custom layout', async () => {
      const layout = await service.createCustomLayout(makeLayoutInput());
      expect(layout.id).toBeDefined();
      expect(layout.name).toBe('My Custom Layout');
      expect(layout.isBuiltIn).toBe(false);
      expect(layout.createdAt).toBeInstanceOf(Date);
      expect(layout.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate a unique ID', async () => {
      const layout1 = await service.createCustomLayout(makeLayoutInput({ name: 'Layout A' }));
      const layout2 = await service.createCustomLayout(makeLayoutInput({ name: 'Layout B' }));
      expect(layout1.id).not.toBe(layout2.id);
    });

    it('should throw on empty name', async () => {
      await expect(
        service.createCustomLayout(makeLayoutInput({ name: '' }))
      ).rejects.toThrow('Layout name cannot be empty');
    });

    it('should throw on whitespace-only name', async () => {
      await expect(
        service.createCustomLayout(makeLayoutInput({ name: '   ' }))
      ).rejects.toThrow('Layout name cannot be empty');
    });

    it('should throw on name exceeding 50 characters', async () => {
      await expect(
        service.createCustomLayout(makeLayoutInput({ name: 'a'.repeat(51) }))
      ).rejects.toThrow('Layout name must be at most 50 characters');
    });

    it('should throw on duplicate name (case-insensitive)', async () => {
      await service.createCustomLayout(makeLayoutInput({ name: 'My Layout' }));
      await expect(
        service.createCustomLayout(makeLayoutInput({ name: 'my layout' }))
      ).rejects.toThrow('A layout with this name already exists');
    });

    it('should throw on name that duplicates a built-in layout', async () => {
      await expect(
        service.createCustomLayout(makeLayoutInput({ name: 'Daily Log' }))
      ).rejects.toThrow('A layout with this name already exists');
    });

    it('should throw on empty content areas', async () => {
      await expect(
        service.createCustomLayout(makeLayoutInput({ contentAreas: [] }))
      ).rejects.toThrow('Layout must have at least 1 content area');
    });

    it('should throw on more than 20 content areas', async () => {
      const areas = Array.from({ length: 21 }, (_, i) =>
        makeContentArea({ id: `area-${i}` })
      );
      await expect(
        service.createCustomLayout(makeLayoutInput({ contentAreas: areas }))
      ).rejects.toThrow('Layout must have at most 20 content areas');
    });

    it('should throw on content area with width below 5%', async () => {
      await expect(
        service.createCustomLayout(
          makeLayoutInput({ contentAreas: [makeContentArea({ width: 4 })] })
        )
      ).rejects.toThrow('width must be between 5% and 100%');
    });

    it('should throw on content area with height below 5%', async () => {
      await expect(
        service.createCustomLayout(
          makeLayoutInput({ contentAreas: [makeContentArea({ height: 3 })] })
        )
      ).rejects.toThrow('height must be between 5% and 100%');
    });

    it('should force isBuiltIn to false for custom layouts', async () => {
      const layout = await service.createCustomLayout(
        makeLayoutInput({ isBuiltIn: true } as any)
      );
      expect(layout.isBuiltIn).toBe(false);
    });
  });

  describe('updateCustomLayout', () => {
    it('should update layout name', async () => {
      const layout = await service.createCustomLayout(makeLayoutInput());
      const updated = await service.updateCustomLayout(layout.id, { name: 'Renamed' });
      expect(updated.name).toBe('Renamed');
    });

    it('should update content areas', async () => {
      const layout = await service.createCustomLayout(makeLayoutInput());
      const newAreas = [makeContentArea({ type: 'checklist', width: 80 })];
      const updated = await service.updateCustomLayout(layout.id, { contentAreas: newAreas });
      expect(updated.contentAreas).toHaveLength(1);
      expect(updated.contentAreas[0].type).toBe('checklist');
    });

    it('should update updatedAt timestamp', async () => {
      const layout = await service.createCustomLayout(makeLayoutInput());
      const before = new Date();
      const updated = await service.updateCustomLayout(layout.id, { name: 'New Name' });
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should throw on non-existent layout', async () => {
      await expect(
        service.updateCustomLayout('non-existent', { name: 'X' })
      ).rejects.toThrow('Layout not found');
    });

    it('should throw on built-in layout modification', async () => {
      // Manually insert a built-in layout into the repo to simulate
      const builtIn: Layout = {
        id: 'builtin-test',
        userId: 'system',
        name: 'Test Built-in',
        isBuiltIn: true,
        contentAreas: [makeContentArea()],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await repository.create(builtIn);

      await expect(
        service.updateCustomLayout('builtin-test', { name: 'Hacked' })
      ).rejects.toThrow('Cannot modify a built-in layout');
    });

    it('should throw on invalid name update', async () => {
      const layout = await service.createCustomLayout(makeLayoutInput());
      await expect(
        service.updateCustomLayout(layout.id, { name: '' })
      ).rejects.toThrow('Layout name cannot be empty');
    });

    it('should throw on duplicate name update', async () => {
      await service.createCustomLayout(makeLayoutInput({ name: 'First' }));
      const second = await service.createCustomLayout(makeLayoutInput({ name: 'Second' }));
      await expect(
        service.updateCustomLayout(second.id, { name: 'First' })
      ).rejects.toThrow('A layout with this name already exists');
    });

    it('should allow renaming to the same name (no false duplicate)', async () => {
      const layout = await service.createCustomLayout(makeLayoutInput({ name: 'Same' }));
      const updated = await service.updateCustomLayout(layout.id, { name: 'Same' });
      expect(updated.name).toBe('Same');
    });

    it('should throw on invalid content areas update', async () => {
      const layout = await service.createCustomLayout(makeLayoutInput());
      await expect(
        service.updateCustomLayout(layout.id, { contentAreas: [] })
      ).rejects.toThrow('Layout must have at least 1 content area');
    });
  });

  describe('deleteCustomLayout', () => {
    it('should delete a custom layout', async () => {
      const layout = await service.createCustomLayout(makeLayoutInput());
      await service.deleteCustomLayout(layout.id);
      const customs = await service.getCustomLayouts();
      expect(customs).toHaveLength(0);
    });

    it('should throw on non-existent layout', async () => {
      await expect(service.deleteCustomLayout('non-existent')).rejects.toThrow(
        'Layout not found'
      );
    });

    it('should throw on built-in layout deletion', async () => {
      const builtIn: Layout = {
        id: 'builtin-nodelete',
        userId: 'system',
        name: 'No Delete',
        isBuiltIn: true,
        contentAreas: [makeContentArea()],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await repository.create(builtIn);

      await expect(service.deleteCustomLayout('builtin-nodelete')).rejects.toThrow(
        'Cannot delete a built-in layout'
      );
    });

    it('should not affect other layouts when deleting one', async () => {
      const layout1 = await service.createCustomLayout(makeLayoutInput({ name: 'Keep Me' }));
      const layout2 = await service.createCustomLayout(makeLayoutInput({ name: 'Delete Me' }));
      await service.deleteCustomLayout(layout2.id);

      const customs = await service.getCustomLayouts();
      expect(customs).toHaveLength(1);
      expect(customs[0].id).toBe(layout1.id);
    });
  });

  describe('validateLayout', () => {
    it('should validate a correct layout', () => {
      const layout: Layout = {
        id: 'test',
        userId: 'user-1',
        name: 'Valid',
        isBuiltIn: false,
        contentAreas: [makeContentArea()],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = service.validateLayout(layout);
      expect(result.valid).toBe(true);
    });

    it('should reject a layout with no content areas', () => {
      const layout: Layout = {
        id: 'test',
        userId: 'user-1',
        name: 'Invalid',
        isBuiltIn: false,
        contentAreas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = service.validateLayout(layout);
      expect(result.valid).toBe(false);
    });
  });
});

describe('LayoutService - Property-Based Tests', () => {
  let repository: InMemoryRepository<Layout>;
  let service: LayoutService;

  beforeEach(() => {
    repository = new InMemoryRepository<Layout>();
    service = createLayoutService(repository);
  });

  /**
   * **Validates: Requirements 2.3**
   * Property 4: Layout persistence round-trip
   * For any valid custom layout, saving it and retrieving it should produce equivalent data.
   */
  it('round-trip: created layout is retrievable with equivalent data', () => {
    fc.assert(
      fc.asyncProperty(validLayoutNameArb, validContentAreasArb, async (name, contentAreas) => {
        // Fresh repository for each test to avoid name collisions
        const repo = new InMemoryRepository<Layout>();
        const svc = createLayoutService(repo);

        const input = makeLayoutInput({ name, contentAreas });
        const created = await svc.createCustomLayout(input);

        // Retrieve via getCustomLayouts
        const customs = await svc.getCustomLayouts();
        const found = customs.find((l) => l.id === created.id);

        expect(found).toBeDefined();
        expect(found!.name).toBe(name);
        expect(found!.contentAreas).toHaveLength(contentAreas.length);
        expect(found!.isBuiltIn).toBe(false);
        expect(found!.userId).toBe('user-1');
      }),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 2.7**
   * Property 5: Layout deletion preserves journal pages
   * Deleting a layout removes it from the gallery but does not affect external references.
   */
  it('deletion removes layout from gallery', () => {
    fc.assert(
      fc.asyncProperty(validLayoutNameArb, validContentAreasArb, async (name, contentAreas) => {
        const repo = new InMemoryRepository<Layout>();
        const svc = createLayoutService(repo);

        const created = await svc.createCustomLayout(makeLayoutInput({ name, contentAreas }));
        await svc.deleteCustomLayout(created.id);

        const customs = await svc.getCustomLayouts();
        const found = customs.find((l) => l.id === created.id);
        expect(found).toBeUndefined();

        // Built-in layouts remain unaffected
        const all = await svc.getAllLayouts();
        const builtIns = all.filter((l) => l.isBuiltIn);
        expect(builtIns.length).toBeGreaterThanOrEqual(4);
      }),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 2.6**
   * Property 3: Layout name uniqueness enforcement
   * Saving a layout with a duplicate name (case-insensitive) should fail.
   */
  it('rejects duplicate layout names (case-insensitive)', () => {
    fc.assert(
      fc.asyncProperty(validLayoutNameArb, async (name) => {
        const repo = new InMemoryRepository<Layout>();
        const svc = createLayoutService(repo);

        // Skip names that collide with built-in layouts
        const builtInNames = getBuiltInLayouts().map((l) => l.name.trim().toLowerCase());
        if (builtInNames.includes(name.trim().toLowerCase())) return;

        await svc.createCustomLayout(makeLayoutInput({ name }));

        // Attempt to create with same name (different case)
        const variants = [name, name.toUpperCase(), name.toLowerCase()];
        for (const variant of variants) {
          await expect(
            svc.createCustomLayout(makeLayoutInput({ name: variant }))
          ).rejects.toThrow('A layout with this name already exists');
        }
      }),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 1.2, 2.4**
   * Built-in layouts are always present in getAllLayouts alongside custom layouts.
   */
  it('getAllLayouts always includes built-in layouts', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(validLayoutNameArb, { minLength: 0, maxLength: 5 }),
        async (names) => {
          const repo = new InMemoryRepository<Layout>();
          const svc = createLayoutService(repo);

          // Deduplicate names and filter out built-in name collisions
          const builtInNames = getBuiltInLayouts().map((l) => l.name.trim().toLowerCase());
          const uniqueNames = [...new Set(names.map((n) => n.trim()))]
            .filter((n) => n.length > 0 && n.length <= 50)
            .filter((n) => !builtInNames.includes(n.toLowerCase()));

          for (const name of uniqueNames) {
            await svc.createCustomLayout(makeLayoutInput({ name }));
          }

          const all = await svc.getAllLayouts();
          const builtIns = all.filter((l) => l.isBuiltIn);
          expect(builtIns.length).toBeGreaterThanOrEqual(4);

          const builtInLayoutNames = builtIns.map((l) => l.name);
          expect(builtInLayoutNames).toContain('Daily Log');
          expect(builtInLayoutNames).toContain('Weekly Spread');
          expect(builtInLayoutNames).toContain('Monthly Log');
          expect(builtInLayoutNames).toContain('Blank Page');
        }
      ),
      { numRuns: 15 }
    );
  });
});
