import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateLayout, validateLayoutName, isLayoutNameUnique } from './layout-validator';
import type { Layout, ContentArea, ContentAreaType } from '@/types';

// === Helpers ===

const VALID_TYPES: ContentAreaType[] = ['text', 'checklist', 'image', 'blank'];

function makeContentArea(overrides: Partial<ContentArea> = {}): ContentArea {
  return {
    id: 'area-1',
    type: 'text',
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    ...overrides,
  };
}

function makeLayout(overrides: Partial<Layout> = {}): Layout {
  return {
    id: 'layout-1',
    userId: 'user-1',
    name: 'Test Layout',
    isBuiltIn: false,
    contentAreas: [makeContentArea()],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// === Arbitraries for property-based tests ===

const validContentAreaTypeArb = fc.constantFrom(...VALID_TYPES);

const validWidthArb = fc.integer({ min: 5, max: 100 });
const validHeightArb = fc.integer({ min: 5, max: 100 });

const validContentAreaArb = fc.record({
  id: fc.uuid(),
  type: validContentAreaTypeArb,
  x: fc.integer({ min: 0, max: 100 }),
  y: fc.integer({ min: 0, max: 100 }),
  width: validWidthArb,
  height: validHeightArb,
});

const validContentAreasArb = fc.array(validContentAreaArb, { minLength: 1, maxLength: 20 });

const validLayoutArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  isBuiltIn: fc.boolean(),
  contentAreas: validContentAreasArb,
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// === Unit Tests: validateLayout ===

describe('validateLayout', () => {
  it('accepts a layout with 1 valid content area', () => {
    const layout = makeLayout({ contentAreas: [makeContentArea()] });
    const result = validateLayout(layout);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a layout with 20 valid content areas', () => {
    const areas = Array.from({ length: 20 }, (_, i) =>
      makeContentArea({ id: `area-${i}` })
    );
    const layout = makeLayout({ contentAreas: areas });
    const result = validateLayout(layout);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a layout with 0 content areas', () => {
    const layout = makeLayout({ contentAreas: [] });
    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects a layout with 21 content areas', () => {
    const areas = Array.from({ length: 21 }, (_, i) =>
      makeContentArea({ id: `area-${i}` })
    );
    const layout = makeLayout({ contentAreas: areas });
    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at most 20'))).toBe(true);
  });

  it('rejects a content area with width below 5%', () => {
    const layout = makeLayout({
      contentAreas: [makeContentArea({ width: 4 })],
    });
    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('width'))).toBe(true);
  });

  it('rejects a content area with width above 100%', () => {
    const layout = makeLayout({
      contentAreas: [makeContentArea({ width: 101 })],
    });
    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('width'))).toBe(true);
  });

  it('rejects a content area with height below 5%', () => {
    const layout = makeLayout({
      contentAreas: [makeContentArea({ height: 4 })],
    });
    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('height'))).toBe(true);
  });

  it('rejects a content area with height above 100%', () => {
    const layout = makeLayout({
      contentAreas: [makeContentArea({ height: 101 })],
    });
    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('height'))).toBe(true);
  });

  it('rejects a content area with an invalid type', () => {
    const layout = makeLayout({
      contentAreas: [makeContentArea({ type: 'invalid' as ContentAreaType })],
    });
    const result = validateLayout(layout);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('invalid type'))).toBe(true);
  });

  it('accepts all valid content area types', () => {
    for (const type of VALID_TYPES) {
      const layout = makeLayout({
        contentAreas: [makeContentArea({ type })],
      });
      const result = validateLayout(layout);
      expect(result.valid).toBe(true);
    }
  });

  it('accepts boundary width values (5 and 100)', () => {
    const layout5 = makeLayout({
      contentAreas: [makeContentArea({ width: 5 })],
    });
    const layout100 = makeLayout({
      contentAreas: [makeContentArea({ width: 100 })],
    });
    expect(validateLayout(layout5).valid).toBe(true);
    expect(validateLayout(layout100).valid).toBe(true);
  });

  it('accepts boundary height values (5 and 100)', () => {
    const layout5 = makeLayout({
      contentAreas: [makeContentArea({ height: 5 })],
    });
    const layout100 = makeLayout({
      contentAreas: [makeContentArea({ height: 100 })],
    });
    expect(validateLayout(layout5).valid).toBe(true);
    expect(validateLayout(layout100).valid).toBe(true);
  });
});

// === Unit Tests: validateLayoutName ===

describe('validateLayoutName', () => {
  it('accepts a valid name', () => {
    const result = validateLayoutName('My Layout');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an empty name', () => {
    const result = validateLayoutName('');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
  });

  it('rejects a whitespace-only name', () => {
    const result = validateLayoutName('   ');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('empty'))).toBe(true);
  });

  it('accepts a 1-character name', () => {
    const result = validateLayoutName('A');
    expect(result.valid).toBe(true);
  });

  it('accepts a 50-character name', () => {
    const result = validateLayoutName('A'.repeat(50));
    expect(result.valid).toBe(true);
  });

  it('rejects a 51-character name', () => {
    const result = validateLayoutName('A'.repeat(51));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('50'))).toBe(true);
  });

  it('trims whitespace before checking length', () => {
    // "  A  " trimmed is "A" which is 1 char - valid
    const result = validateLayoutName('  A  ');
    expect(result.valid).toBe(true);
  });

  it('rejects name that is only spaces exceeding 50 chars when trimmed is empty', () => {
    const result = validateLayoutName(' '.repeat(60));
    expect(result.valid).toBe(false);
  });
});

// === Unit Tests: isLayoutNameUnique ===

describe('isLayoutNameUnique', () => {
  const existingLayouts: Layout[] = [
    makeLayout({ id: 'layout-1', name: 'Daily Log' }),
    makeLayout({ id: 'layout-2', name: 'Weekly Spread' }),
  ];

  it('accepts a unique name', () => {
    const result = isLayoutNameUnique('Monthly Log', existingLayouts);
    expect(result.valid).toBe(true);
  });

  it('rejects a duplicate name (exact match)', () => {
    const result = isLayoutNameUnique('Daily Log', existingLayouts);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('already exists'))).toBe(true);
  });

  it('rejects a duplicate name (case-insensitive)', () => {
    const result = isLayoutNameUnique('daily log', existingLayouts);
    expect(result.valid).toBe(false);
  });

  it('rejects a duplicate name (different casing)', () => {
    const result = isLayoutNameUnique('DAILY LOG', existingLayouts);
    expect(result.valid).toBe(false);
  });

  it('allows the same name when excluding the layout being edited', () => {
    const result = isLayoutNameUnique('Daily Log', existingLayouts, 'layout-1');
    expect(result.valid).toBe(true);
  });

  it('still rejects if name matches a different layout when excluding', () => {
    const result = isLayoutNameUnique('Weekly Spread', existingLayouts, 'layout-1');
    expect(result.valid).toBe(false);
  });

  it('handles leading/trailing whitespace in comparison', () => {
    const result = isLayoutNameUnique('  Daily Log  ', existingLayouts);
    expect(result.valid).toBe(false);
  });

  it('accepts any name when no existing layouts', () => {
    const result = isLayoutNameUnique('Anything', []);
    expect(result.valid).toBe(true);
  });
});

// === Property-Based Tests ===

/**
 * **Validates: Requirements 2.1, 2.2**
 * Property 1: Layout validation enforces content area constraints
 */
describe('Property: Layout validation enforces content area constraints', () => {
  it('accepts any layout with 1-20 valid content areas', () => {
    fc.assert(
      fc.property(validLayoutArb, (layout) => {
        const result = validateLayout(layout);
        return result.valid === true && result.errors.length === 0;
      })
    );
  });

  it('rejects layouts with 0 content areas', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          userId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          isBuiltIn: fc.boolean(),
          contentAreas: fc.constant([] as ContentArea[]),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        (layout) => {
          const result = validateLayout(layout);
          return result.valid === false && result.errors.length > 0;
        }
      )
    );
  });

  it('rejects layouts with more than 20 content areas', () => {
    fc.assert(
      fc.property(
        fc.array(validContentAreaArb, { minLength: 21, maxLength: 30 }),
        (contentAreas) => {
          const layout = makeLayout({ contentAreas });
          const result = validateLayout(layout);
          return result.valid === false;
        }
      )
    );
  });

  it('rejects content areas with width outside 5-100%', () => {
    const invalidWidthArb = fc.oneof(
      fc.integer({ min: -100, max: 4 }),
      fc.integer({ min: 101, max: 500 })
    );
    fc.assert(
      fc.property(invalidWidthArb, (width) => {
        const layout = makeLayout({
          contentAreas: [makeContentArea({ width })],
        });
        const result = validateLayout(layout);
        return result.valid === false;
      })
    );
  });

  it('rejects content areas with height outside 5-100%', () => {
    const invalidHeightArb = fc.oneof(
      fc.integer({ min: -100, max: 4 }),
      fc.integer({ min: 101, max: 500 })
    );
    fc.assert(
      fc.property(invalidHeightArb, (height) => {
        const layout = makeLayout({
          contentAreas: [makeContentArea({ height })],
        });
        const result = validateLayout(layout);
        return result.valid === false;
      })
    );
  });

  it('rejects content areas with invalid types', () => {
    const invalidTypeArb = fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => !VALID_TYPES.includes(s as ContentAreaType));
    fc.assert(
      fc.property(invalidTypeArb, (type) => {
        const layout = makeLayout({
          contentAreas: [makeContentArea({ type: type as ContentAreaType })],
        });
        const result = validateLayout(layout);
        return result.valid === false;
      })
    );
  });
});

/**
 * **Validates: Requirements 2.5**
 * Property 2: Layout name length validation
 */
describe('Property: Layout name length validation', () => {
  it('accepts names with trimmed length 1-50', () => {
    const validNameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length >= 1 && s.trim().length <= 50);
    fc.assert(
      fc.property(validNameArb, (name) => {
        const result = validateLayoutName(name);
        return result.valid === true;
      })
    );
  });

  it('rejects names with trimmed length 0 (empty or whitespace-only)', () => {
    const emptyNameArb = fc.integer({ min: 0, max: 100 }).map((n) => ' '.repeat(n));
    fc.assert(
      fc.property(emptyNameArb, (name) => {
        const result = validateLayoutName(name);
        return result.valid === false;
      })
    );
  });

  it('rejects names with trimmed length > 50', () => {
    const longNameArb = fc.string({ minLength: 51, maxLength: 200 }).filter(
      (s) => s.trim().length > 50
    );
    fc.assert(
      fc.property(longNameArb, (name) => {
        const result = validateLayoutName(name);
        return result.valid === false;
      })
    );
  });
});

/**
 * **Validates: Requirements 2.6**
 * Property 3: Layout name uniqueness enforcement
 */
describe('Property: Layout name uniqueness enforcement', () => {
  it('rejects names matching existing layouts (case-insensitive)', () => {
    const existingNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
      (s) => s.trim().length > 0
    );
    fc.assert(
      fc.property(existingNameArb, (name) => {
        const existing = [makeLayout({ id: 'existing-1', name })];
        // Test with same name in different case
        const result = isLayoutNameUnique(name.toUpperCase(), existing);
        return result.valid === false;
      })
    );
  });

  it('accepts names not matching any existing layout', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 25 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 25 }).filter((s) => s.trim().length > 0),
        (name1, name2) => {
          // Ensure names are actually different (case-insensitive)
          fc.pre(name1.trim().toLowerCase() !== name2.trim().toLowerCase());
          const existing = [makeLayout({ id: 'existing-1', name: name1 })];
          const result = isLayoutNameUnique(name2, existing);
          return result.valid === true;
        }
      )
    );
  });
});
