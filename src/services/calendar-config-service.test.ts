import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { CalendarConfig, CalendarSizing, EntryType, WeekDay, LayoutDensity } from '@/types/models';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import {
  createCalendarConfigService,
  clampSizingValue,
  clampCalendarSizing,
  getDefaultCalendarConfig,
  validateWeekStartDay,
  validateColorTheme,
  validateLayoutDensity,
  validateVisibleEntryTypes,
  filterEntriesByVisibility,
  BUILT_IN_COLOR_THEMES,
  type CalendarConfigService,
} from './calendar-config-service';

const VALID_WEEK_DAYS: WeekDay[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const VALID_ENTRY_TYPES: EntryType[] = ['task', 'event', 'note'];

const VALID_LAYOUT_DENSITIES: LayoutDensity[] = ['compact', 'standard', 'expanded'];

describe('CalendarConfig - Validation Helpers', () => {
  describe('validateWeekStartDay', () => {
    it('should accept all valid week days', () => {
      for (const day of VALID_WEEK_DAYS) {
        expect(validateWeekStartDay(day)).toBe(true);
      }
    });

    it('should reject invalid values', () => {
      expect(validateWeekStartDay('invalid')).toBe(false);
      expect(validateWeekStartDay('')).toBe(false);
      expect(validateWeekStartDay(undefined)).toBe(false);
      expect(validateWeekStartDay(null)).toBe(false);
      expect(validateWeekStartDay(123)).toBe(false);
    });
  });

  describe('validateColorTheme', () => {
    it('should accept non-empty strings', () => {
      expect(validateColorTheme('default')).toBe(true);
      expect(validateColorTheme('ocean')).toBe(true);
      expect(validateColorTheme('custom-theme')).toBe(true);
    });

    it('should reject empty or whitespace-only strings', () => {
      expect(validateColorTheme('')).toBe(false);
      expect(validateColorTheme('   ')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validateColorTheme(undefined)).toBe(false);
      expect(validateColorTheme(null)).toBe(false);
      expect(validateColorTheme(123)).toBe(false);
    });
  });

  describe('validateLayoutDensity', () => {
    it('should accept valid densities', () => {
      for (const density of VALID_LAYOUT_DENSITIES) {
        expect(validateLayoutDensity(density)).toBe(true);
      }
    });

    it('should reject invalid values', () => {
      expect(validateLayoutDensity('invalid')).toBe(false);
      expect(validateLayoutDensity('')).toBe(false);
      expect(validateLayoutDensity(undefined)).toBe(false);
    });
  });

  describe('validateVisibleEntryTypes', () => {
    it('should accept valid entry type arrays', () => {
      expect(validateVisibleEntryTypes(['task'])).toBe(true);
      expect(validateVisibleEntryTypes(['task', 'event'])).toBe(true);
      expect(validateVisibleEntryTypes(['task', 'event', 'note'])).toBe(true);
      expect(validateVisibleEntryTypes([])).toBe(true);
    });

    it('should reject arrays with invalid types', () => {
      expect(validateVisibleEntryTypes(['invalid'])).toBe(false);
      expect(validateVisibleEntryTypes(['task', 'invalid'])).toBe(false);
    });

    it('should reject non-array values', () => {
      expect(validateVisibleEntryTypes('task')).toBe(false);
      expect(validateVisibleEntryTypes(undefined)).toBe(false);
      expect(validateVisibleEntryTypes(null)).toBe(false);
    });
  });
});

describe('CalendarConfig - Sizing Constraints', () => {
  describe('clampSizingValue', () => {
    it('should return value unchanged when within 10-90% range', () => {
      expect(clampSizingValue(50)).toBe(50);
      expect(clampSizingValue(10)).toBe(10);
      expect(clampSizingValue(90)).toBe(90);
    });

    it('should clamp values below 10% to 10%', () => {
      expect(clampSizingValue(0)).toBe(10);
      expect(clampSizingValue(5)).toBe(10);
      expect(clampSizingValue(9.9)).toBe(10);
      expect(clampSizingValue(-100)).toBe(10);
    });

    it('should clamp values above 90% to 90%', () => {
      expect(clampSizingValue(91)).toBe(90);
      expect(clampSizingValue(100)).toBe(90);
      expect(clampSizingValue(200)).toBe(90);
    });
  });

  describe('clampCalendarSizing', () => {
    it('should clamp all areas to 10-90% range', () => {
      const sizing: CalendarSizing = {
        areas: [
          { id: 'a1', widthPercent: 5, heightPercent: 95 },
          { id: 'a2', widthPercent: 50, heightPercent: 50 },
        ],
      };
      const result = clampCalendarSizing(sizing);
      expect(result.areas[0].widthPercent).toBe(10);
      expect(result.areas[0].heightPercent).toBe(90);
      expect(result.areas[1].widthPercent).toBe(50);
      expect(result.areas[1].heightPercent).toBe(50);
    });

    it('should preserve area ids', () => {
      const sizing: CalendarSizing = {
        areas: [{ id: 'my-area', widthPercent: 50, heightPercent: 50 }],
      };
      const result = clampCalendarSizing(sizing);
      expect(result.areas[0].id).toBe('my-area');
    });
  });
});

describe('CalendarConfig - Default Config', () => {
  it('should create default config with monday as week start', () => {
    const config = getDefaultCalendarConfig('user-1');
    expect(config.weekStartDay).toBe('monday');
  });

  it('should create default config with all entry types visible', () => {
    const config = getDefaultCalendarConfig('user-1');
    expect(config.visibleEntryTypes).toEqual(['task', 'event', 'note']);
  });

  it('should create default config with default color theme', () => {
    const config = getDefaultCalendarConfig('user-1');
    expect(config.colorTheme).toBe('default');
  });

  it('should create default config with standard layout density', () => {
    const config = getDefaultCalendarConfig('user-1');
    expect(config.layoutDensity).toBe('standard');
  });

  it('should not have custom sizing by default', () => {
    const config = getDefaultCalendarConfig('user-1');
    expect(config.customSizing).toBeUndefined();
  });
});

describe('CalendarConfig - Built-in Color Themes', () => {
  it('should provide at least 3 built-in color themes', () => {
    expect(BUILT_IN_COLOR_THEMES.length).toBeGreaterThanOrEqual(3);
  });

  it('should include default theme', () => {
    expect(BUILT_IN_COLOR_THEMES).toContain('default');
  });
});

describe('CalendarConfig - Entry Visibility Filtering', () => {
  const entries = [
    { type: 'task' as EntryType, text: 'Task 1' },
    { type: 'event' as EntryType, text: 'Event 1' },
    { type: 'note' as EntryType, text: 'Note 1' },
    { type: 'task' as EntryType, text: 'Task 2' },
  ];

  it('should return all entries when all types visible', () => {
    const result = filterEntriesByVisibility(entries, ['task', 'event', 'note']);
    expect(result).toHaveLength(4);
  });

  it('should filter to only tasks', () => {
    const result = filterEntriesByVisibility(entries, ['task']);
    expect(result).toHaveLength(2);
    result.forEach((e) => expect(e.type).toBe('task'));
  });

  it('should filter to only events', () => {
    const result = filterEntriesByVisibility(entries, ['event']);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('event');
  });

  it('should return empty when no types visible', () => {
    const result = filterEntriesByVisibility(entries, []);
    expect(result).toHaveLength(0);
  });
});

describe('CalendarConfigService', () => {
  let repository: InMemoryRepository<CalendarConfig>;
  let service: CalendarConfigService;

  beforeEach(() => {
    repository = new InMemoryRepository<CalendarConfig>();
    service = createCalendarConfigService(repository);
  });

  describe('getCalendarConfig', () => {
    it('should return default config when none exists', async () => {
      const config = await service.getCalendarConfig('user-1');
      expect(config.userId).toBe('user-1');
      expect(config.weekStartDay).toBe('monday');
      expect(config.visibleEntryTypes).toEqual(['task', 'event', 'note']);
      expect(config.colorTheme).toBe('default');
      expect(config.layoutDensity).toBe('standard');
    });

    it('should return existing config if one exists', async () => {
      // Pre-populate
      await repository.create({
        id: 'config-1',
        userId: 'user-1',
        weekStartDay: 'sunday',
        colorTheme: 'ocean',
        layoutDensity: 'compact',
        visibleEntryTypes: ['task'],
      });

      const config = await service.getCalendarConfig('user-1');
      expect(config.weekStartDay).toBe('sunday');
      expect(config.colorTheme).toBe('ocean');
      expect(config.layoutDensity).toBe('compact');
      expect(config.visibleEntryTypes).toEqual(['task']);
    });
  });

  describe('updateCalendarConfig', () => {
    it('should update week start day', async () => {
      const config = await service.updateCalendarConfig('user-1', {
        weekStartDay: 'sunday',
      });
      expect(config.weekStartDay).toBe('sunday');
    });

    it('should update color theme', async () => {
      const config = await service.updateCalendarConfig('user-1', {
        colorTheme: 'ocean',
      });
      expect(config.colorTheme).toBe('ocean');
    });

    it('should update layout density', async () => {
      const config = await service.updateCalendarConfig('user-1', {
        layoutDensity: 'expanded',
      });
      expect(config.layoutDensity).toBe('expanded');
    });

    it('should update visible entry types', async () => {
      const config = await service.updateCalendarConfig('user-1', {
        visibleEntryTypes: ['task', 'event'],
      });
      expect(config.visibleEntryTypes).toEqual(['task', 'event']);
    });

    it('should allow hiding all entry types', async () => {
      const config = await service.updateCalendarConfig('user-1', {
        visibleEntryTypes: [],
      });
      expect(config.visibleEntryTypes).toEqual([]);
    });

    it('should clamp custom sizing values to 10-90%', async () => {
      const config = await service.updateCalendarConfig('user-1', {
        customSizing: {
          areas: [
            { id: 'a1', widthPercent: 5, heightPercent: 95 },
            { id: 'a2', widthPercent: 50, heightPercent: 50 },
          ],
        },
      });
      expect(config.customSizing!.areas[0].widthPercent).toBe(10);
      expect(config.customSizing!.areas[0].heightPercent).toBe(90);
      expect(config.customSizing!.areas[1].widthPercent).toBe(50);
      expect(config.customSizing!.areas[1].heightPercent).toBe(50);
    });

    it('should throw on invalid week start day', async () => {
      await expect(
        service.updateCalendarConfig('user-1', {
          weekStartDay: 'invalid' as WeekDay,
        })
      ).rejects.toThrow('Invalid week start day');
    });

    it('should throw on invalid color theme', async () => {
      await expect(
        service.updateCalendarConfig('user-1', {
          colorTheme: '',
        })
      ).rejects.toThrow('Invalid color theme');
    });

    it('should throw on invalid layout density', async () => {
      await expect(
        service.updateCalendarConfig('user-1', {
          layoutDensity: 'invalid' as LayoutDensity,
        })
      ).rejects.toThrow('Invalid layout density');
    });

    it('should throw on invalid visible entry types', async () => {
      await expect(
        service.updateCalendarConfig('user-1', {
          visibleEntryTypes: ['invalid'] as unknown as EntryType[],
        })
      ).rejects.toThrow('Invalid visible entry types');
    });

    it('should persist changes across calls', async () => {
      await service.updateCalendarConfig('user-1', { weekStartDay: 'friday' });
      const config = await service.getCalendarConfig('user-1');
      expect(config.weekStartDay).toBe('friday');
    });

    it('should only update specified fields', async () => {
      await service.updateCalendarConfig('user-1', { weekStartDay: 'wednesday' });
      const config = await service.updateCalendarConfig('user-1', { colorTheme: 'forest' });
      expect(config.weekStartDay).toBe('wednesday');
      expect(config.colorTheme).toBe('forest');
    });
  });
});

describe('CalendarConfigService - Property-Based Tests', () => {
  let repository: InMemoryRepository<CalendarConfig>;
  let service: CalendarConfigService;

  beforeEach(() => {
    repository = new InMemoryRepository<CalendarConfig>();
    service = createCalendarConfigService(repository);
  });

  // Arbitraries
  const weekDayArb = fc.constantFrom<WeekDay>(...VALID_WEEK_DAYS);
  const entryTypeArb = fc.constantFrom<EntryType>(...VALID_ENTRY_TYPES);
  const layoutDensityArb = fc.constantFrom<LayoutDensity>(...VALID_LAYOUT_DENSITIES);
  const colorThemeArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

  const sizingValueArb = fc.double({ min: -200, max: 300, noNaN: true });
  const sizingAreaArb = fc.record({
    id: fc.uuid(),
    widthPercent: sizingValueArb,
    heightPercent: sizingValueArb,
  });
  const calendarSizingArb = fc.record({
    areas: fc.array(sizingAreaArb, { minLength: 1, maxLength: 5 }),
  });

  /**
   * **Validates: Requirements 6.6**
   * Property 14: Calendar sizing constraints
   * For any sizing value, the system should clamp to at least 10% and at most 90%.
   */
  it('should clamp any sizing value to 10-90% range', () => {
    fc.assert(
      fc.property(sizingValueArb, (value) => {
        const clamped = clampSizingValue(value);
        return clamped >= 10 && clamped <= 90;
      })
    );
  });

  /**
   * **Validates: Requirements 6.6**
   * Property 14: Values within range are preserved
   */
  it('should preserve sizing values already within 10-90% range', () => {
    fc.assert(
      fc.property(fc.double({ min: 10, max: 90, noNaN: true }), (value) => {
        return clampSizingValue(value) === value;
      })
    );
  });

  /**
   * **Validates: Requirements 6.6**
   * Property 14: All areas in CalendarSizing are clamped
   */
  it('should clamp all areas in a CalendarSizing to 10-90%', () => {
    fc.assert(
      fc.property(calendarSizingArb, (sizing) => {
        const clamped = clampCalendarSizing(sizing);
        return clamped.areas.every(
          (area) =>
            area.widthPercent >= 10 &&
            area.widthPercent <= 90 &&
            area.heightPercent >= 10 &&
            area.heightPercent <= 90
        );
      })
    );
  });

  /**
   * **Validates: Requirements 6.1**
   * Property 12: Week start day configuration accepts any valid day
   */
  it('should accept any valid week start day configuration', () => {
    fc.assert(
      fc.asyncProperty(weekDayArb, async (day) => {
        const config = await service.updateCalendarConfig('user-1', {
          weekStartDay: day,
        });
        return config.weekStartDay === day;
      })
    );
  });

  /**
   * **Validates: Requirements 6.4**
   * Property 13: Entry type visibility filtering
   * For any subset of entry types, filtering returns exactly matching entries.
   */
  it('should filter entries to only those with visible types', () => {
    const entryArb = fc.record({
      type: entryTypeArb,
      text: fc.string({ minLength: 1, maxLength: 50 }),
    });

    const visibleTypesArb = fc.subarray(VALID_ENTRY_TYPES, { minLength: 0, maxLength: 3 });

    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 0, maxLength: 20 }),
        visibleTypesArb,
        (entries, visibleTypes) => {
          const filtered = filterEntriesByVisibility(entries, visibleTypes);
          // All filtered entries have a visible type
          const allVisible = filtered.every((e) => visibleTypes.includes(e.type));
          // No entries with visible types were excluded
          const noneExcluded = entries
            .filter((e) => visibleTypes.includes(e.type))
            .every((e) => filtered.includes(e));
          return allVisible && noneExcluded;
        }
      )
    );
  });

  /**
   * **Validates: Requirements 6.4, 6.5**
   * Hiding all entry types returns empty results
   */
  it('should return no entries when all types are hidden', () => {
    const entryArb = fc.record({
      type: entryTypeArb,
      text: fc.string({ minLength: 1, maxLength: 50 }),
    });

    fc.assert(
      fc.property(fc.array(entryArb, { minLength: 1, maxLength: 20 }), (entries) => {
        const filtered = filterEntriesByVisibility(entries, []);
        return filtered.length === 0;
      })
    );
  });

  /**
   * **Validates: Requirements 6.1**
   * Week start day defaults to monday
   */
  it('should default to monday as week start day', () => {
    fc.assert(
      fc.asyncProperty(fc.uuid(), async (userId) => {
        const config = await service.getCalendarConfig(userId);
        return config.weekStartDay === 'monday';
      })
    );
  });

  /**
   * **Validates: Requirements 6.2, 6.3**
   * Color theme can be updated to any valid theme
   */
  it('should accept any non-empty string as color theme', () => {
    fc.assert(
      fc.asyncProperty(colorThemeArb, async (theme) => {
        const config = await service.updateCalendarConfig('user-1', {
          colorTheme: theme,
        });
        return config.colorTheme === theme;
      })
    );
  });

  /**
   * **Validates: Requirements 6.6**
   * Custom sizing is persisted with clamped values
   */
  it('should persist custom sizing with clamped values', () => {
    fc.assert(
      fc.asyncProperty(calendarSizingArb, async (sizing) => {
        const config = await service.updateCalendarConfig('user-1', {
          customSizing: sizing,
        });
        return config.customSizing!.areas.every(
          (area) =>
            area.widthPercent >= 10 &&
            area.widthPercent <= 90 &&
            area.heightPercent >= 10 &&
            area.heightPercent <= 90
        );
      })
    );
  });
});
