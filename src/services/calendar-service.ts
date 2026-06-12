import type { Entry, CalendarPeriod, CalendarPeriodType, CalendarConfig } from '@/types/models';
import type { CalendarService, Repository } from '@/types/services';

/**
 * Returns the start of the day (midnight) for a given date in local time.
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the end of the day (23:59:59.999) for a given date in local time.
 */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Creates a daily period for the given date.
 * Start: beginning of the day, End: end of the day.
 */
export function createDailyPeriod(date: Date): CalendarPeriod {
  return {
    type: 'daily',
    startDate: startOfDay(date),
    endDate: endOfDay(date),
  };
}

/**
 * Creates a weekly period containing the given date.
 * The week starts on the specified weekStartDay (default: Monday).
 * The period spans exactly 7 days.
 */
export function createWeeklyPeriod(date: Date, weekStartDay: number = 1): CalendarPeriod {
  const d = startOfDay(date);
  const currentDay = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = (currentDay - weekStartDay + 7) % 7;
  const start = new Date(d);
  start.setDate(start.getDate() - diff);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    type: 'weekly',
    startDate: startOfDay(start),
    endDate: endOfDay(end),
  };
}

/**
 * Creates a monthly period for the month containing the given date.
 * Start: first day of the month, End: last day of the month.
 */
export function createMonthlyPeriod(date: Date): CalendarPeriod {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    type: 'monthly',
    startDate: startOfDay(start),
    endDate: endOfDay(end),
  };
}

/**
 * Returns the next adjacent period from the given period.
 */
export function getNextPeriod(period: CalendarPeriod): CalendarPeriod {
  const { type, startDate } = period;

  switch (type) {
    case 'daily': {
      const next = new Date(startDate);
      next.setDate(next.getDate() + 1);
      return createDailyPeriod(next);
    }
    case 'weekly': {
      const next = new Date(startDate);
      next.setDate(next.getDate() + 7);
      return createWeeklyPeriod(next, startDate.getDay());
    }
    case 'monthly': {
      const next = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
      return createMonthlyPeriod(next);
    }
  }
}

/**
 * Returns the previous adjacent period from the given period.
 */
export function getPreviousPeriod(period: CalendarPeriod): CalendarPeriod {
  const { type, startDate } = period;

  switch (type) {
    case 'daily': {
      const prev = new Date(startDate);
      prev.setDate(prev.getDate() - 1);
      return createDailyPeriod(prev);
    }
    case 'weekly': {
      const prev = new Date(startDate);
      prev.setDate(prev.getDate() - 7);
      return createWeeklyPeriod(prev, startDate.getDay());
    }
    case 'monthly': {
      const prev = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
      return createMonthlyPeriod(prev);
    }
  }
}

/**
 * Checks if a date falls within a period (inclusive of start and end dates).
 * Comparison is date-only (ignores time component).
 */
export function isDateInPeriod(date: Date, period: CalendarPeriod): boolean {
  const d = startOfDay(date);
  const start = startOfDay(period.startDate);
  const end = startOfDay(period.endDate);
  return d >= start && d <= end;
}

/**
 * Creates a CalendarService implementation backed by entry and config repositories.
 */
export function createCalendarService(
  entryRepository: Repository<Entry>,
  configRepository: Repository<CalendarConfig>
): CalendarService {
  return {
    async getEntriesForPeriod(period: CalendarPeriod): Promise<Entry[]> {
      return entryRepository.query((entry) => {
        if (!entry.date) return false;
        const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
        return isDateInPeriod(entryDate, period);
      });
    },

    async getCalendarConfig(): Promise<CalendarConfig> {
      const configs = await configRepository.getAll();
      if (configs.length > 0) {
        return configs[0];
      }
      // Return default config if none exists
      const defaultConfig: CalendarConfig = {
        id: crypto.randomUUID(),
        userId: '',
        weekStartDay: 'monday',
        colorTheme: 'default',
        layoutDensity: 'standard',
        visibleEntryTypes: ['task', 'event', 'note'],
      };
      return configRepository.create(defaultConfig);
    },

    async updateCalendarConfig(changes: Partial<CalendarConfig>): Promise<CalendarConfig> {
      const current = await this.getCalendarConfig();
      return configRepository.update(current.id, changes);
    },
  };
}
