import type { CalendarConfig, CalendarSizing, EntryType, WeekDay, LayoutDensity } from '@/types/models';
import type { Repository } from '@/types/services';

// === Built-in Color Themes ===

export const BUILT_IN_COLOR_THEMES = [
  'default',
  'ocean',
  'forest',
  'sunset',
  'lavender',
] as const;

export type BuiltInColorTheme = (typeof BUILT_IN_COLOR_THEMES)[number];

// === Constants ===

const VALID_WEEK_DAYS: WeekDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const VALID_ENTRY_TYPES: EntryType[] = ['task', 'event', 'note'];

const VALID_LAYOUT_DENSITIES: LayoutDensity[] = ['compact', 'standard', 'expanded'];

const SIZING_MIN_PERCENT = 10;
const SIZING_MAX_PERCENT = 90;

// === Default Config ===

export function getDefaultCalendarConfig(userId: string): CalendarConfig {
  return {
    id: `calendar-config-${userId}`,
    userId,
    weekStartDay: 'monday',
    colorTheme: 'default',
    layoutDensity: 'standard',
    visibleEntryTypes: ['task', 'event', 'note'],
  };
}

// === Sizing Constraints ===

/**
 * Clamps a sizing value to the 10-90% range.
 * Values below 10% are clamped to 10%, values above 90% are clamped to 90%.
 */
export function clampSizingValue(value: number): number {
  return Math.min(SIZING_MAX_PERCENT, Math.max(SIZING_MIN_PERCENT, value));
}

/**
 * Clamps all sizing areas to the 10-90% range.
 */
export function clampCalendarSizing(sizing: CalendarSizing): CalendarSizing {
  return {
    areas: sizing.areas.map((area) => ({
      id: area.id,
      widthPercent: clampSizingValue(area.widthPercent),
      heightPercent: clampSizingValue(area.heightPercent),
    })),
  };
}

// === Validation ===

export function validateWeekStartDay(day: unknown): day is WeekDay {
  return typeof day === 'string' && VALID_WEEK_DAYS.includes(day as WeekDay);
}

export function validateColorTheme(theme: unknown): boolean {
  return typeof theme === 'string' && theme.trim().length > 0;
}

export function validateLayoutDensity(density: unknown): density is LayoutDensity {
  return typeof density === 'string' && VALID_LAYOUT_DENSITIES.includes(density as LayoutDensity);
}

export function validateVisibleEntryTypes(types: unknown): types is EntryType[] {
  if (!Array.isArray(types)) return false;
  return types.every(
    (t) => typeof t === 'string' && VALID_ENTRY_TYPES.includes(t as EntryType)
  );
}

// === Service Factory ===

export interface CalendarConfigService {
  getCalendarConfig(userId: string): Promise<CalendarConfig>;
  updateCalendarConfig(userId: string, changes: Partial<CalendarConfig>): Promise<CalendarConfig>;
}

export function createCalendarConfigService(
  repository: Repository<CalendarConfig>
): CalendarConfigService {
  return {
    async getCalendarConfig(userId: string): Promise<CalendarConfig> {
      const configs = await repository.query((c) => c.userId === userId);
      if (configs.length > 0) {
        return configs[0];
      }
      // Create and persist default config if none exists
      const defaultConfig = getDefaultCalendarConfig(userId);
      return repository.create(defaultConfig);
    },

    async updateCalendarConfig(
      userId: string,
      changes: Partial<CalendarConfig>
    ): Promise<CalendarConfig> {
      // Get existing config (or create default)
      const configs = await repository.query((c) => c.userId === userId);
      let existing: CalendarConfig;
      if (configs.length > 0) {
        existing = configs[0];
      } else {
        existing = await repository.create(getDefaultCalendarConfig(userId));
      }

      // Validate and apply changes
      const updatedFields: Partial<CalendarConfig> = {};

      if (changes.weekStartDay !== undefined) {
        if (!validateWeekStartDay(changes.weekStartDay)) {
          throw new Error(
            `Invalid week start day: must be one of ${VALID_WEEK_DAYS.join(', ')}`
          );
        }
        updatedFields.weekStartDay = changes.weekStartDay;
      }

      if (changes.colorTheme !== undefined) {
        if (!validateColorTheme(changes.colorTheme)) {
          throw new Error('Invalid color theme: must be a non-empty string');
        }
        updatedFields.colorTheme = changes.colorTheme;
      }

      if (changes.layoutDensity !== undefined) {
        if (!validateLayoutDensity(changes.layoutDensity)) {
          throw new Error(
            `Invalid layout density: must be one of ${VALID_LAYOUT_DENSITIES.join(', ')}`
          );
        }
        updatedFields.layoutDensity = changes.layoutDensity;
      }

      if (changes.visibleEntryTypes !== undefined) {
        if (!validateVisibleEntryTypes(changes.visibleEntryTypes)) {
          throw new Error(
            `Invalid visible entry types: each must be one of ${VALID_ENTRY_TYPES.join(', ')}`
          );
        }
        updatedFields.visibleEntryTypes = changes.visibleEntryTypes;
      }

      if (changes.customSizing !== undefined) {
        if (changes.customSizing === null) {
          updatedFields.customSizing = undefined;
        } else {
          // Clamp sizing values to 10-90% range
          updatedFields.customSizing = clampCalendarSizing(changes.customSizing);
        }
      }

      return repository.update(existing.id, updatedFields);
    },
  };
}

/**
 * Filters entries by visible entry types from the calendar config.
 * Returns only entries whose type is in the visibleEntryTypes array.
 */
export function filterEntriesByVisibility<T extends { type: EntryType }>(
  entries: T[],
  visibleTypes: EntryType[]
): T[] {
  return entries.filter((entry) => visibleTypes.includes(entry.type));
}
