import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  createCalendarService,
  createDailyPeriod,
  createWeeklyPeriod,
  createMonthlyPeriod,
  getNextPeriod,
  getPreviousPeriod,
  isDateInPeriod,
} from './calendar-service';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import type { Entry, CalendarPeriod, CalendarConfig } from '@/types/models';

// Helper to create a test entry with a specific date
function createTestEntry(overrides: Partial<Entry> = {}): Entry {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId: 'user-1',
    pageId: 'page-1',
    type: 'event',
    text: 'Test entry',
    signifiers: [],
    date: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('CalendarService', () => {
  let entryRepo: InMemoryRepository<Entry>;
  let configRepo: InMemoryRepository<CalendarConfig>;
  let service: ReturnType<typeof createCalendarService>;

  beforeEach(() => {
    entryRepo = new InMemoryRepository<Entry>();
    configRepo = new InMemoryRepository<CalendarConfig>();
    service = createCalendarService(entryRepo, configRepo);
  });

  describe('createDailyPeriod', () => {
    it('creates a period spanning a single day', () => {
      const date = new Date(2024, 5, 15, 14, 30); // June 15, 2024 at 2:30 PM
      const period = createDailyPeriod(date);

      expect(period.type).toBe('daily');
      expect(period.startDate.getFullYear()).toBe(2024);
      expect(period.startDate.getMonth()).toBe(5);
      expect(period.startDate.getDate()).toBe(15);
      expect(period.startDate.getHours()).toBe(0);
      expect(period.startDate.getMinutes()).toBe(0);

      expect(period.endDate.getFullYear()).toBe(2024);
      expect(period.endDate.getMonth()).toBe(5);
      expect(period.endDate.getDate()).toBe(15);
      expect(period.endDate.getHours()).toBe(23);
      expect(period.endDate.getMinutes()).toBe(59);
    });
  });

  describe('createWeeklyPeriod', () => {
    it('creates a 7-day period starting on Monday by default', () => {
      // Wednesday June 12, 2024
      const date = new Date(2024, 5, 12);
      const period = createWeeklyPeriod(date, 1); // Monday start

      expect(period.type).toBe('weekly');
      // Should start on Monday June 10
      expect(period.startDate.getDate()).toBe(10);
      expect(period.startDate.getDay()).toBe(1); // Monday
      // Should end on Sunday June 16
      expect(period.endDate.getDate()).toBe(16);
      expect(period.endDate.getDay()).toBe(0); // Sunday
    });

    it('creates a 7-day period starting on Sunday', () => {
      // Wednesday June 12, 2024
      const date = new Date(2024, 5, 12);
      const period = createWeeklyPeriod(date, 0); // Sunday start

      expect(period.type).toBe('weekly');
      // Should start on Sunday June 9
      expect(period.startDate.getDate()).toBe(9);
      expect(period.startDate.getDay()).toBe(0); // Sunday
      // Should end on Saturday June 15
      expect(period.endDate.getDate()).toBe(15);
      expect(period.endDate.getDay()).toBe(6); // Saturday
    });
  });

  describe('createMonthlyPeriod', () => {
    it('creates a period spanning the entire month', () => {
      const date = new Date(2024, 1, 15); // February 15, 2024 (leap year)
      const period = createMonthlyPeriod(date);

      expect(period.type).toBe('monthly');
      expect(period.startDate.getDate()).toBe(1);
      expect(period.startDate.getMonth()).toBe(1);
      expect(period.endDate.getDate()).toBe(29); // Leap year
      expect(period.endDate.getMonth()).toBe(1);
    });

    it('handles months with 30 days', () => {
      const date = new Date(2024, 3, 10); // April 10, 2024
      const period = createMonthlyPeriod(date);

      expect(period.endDate.getDate()).toBe(30);
    });

    it('handles months with 31 days', () => {
      const date = new Date(2024, 0, 20); // January 20, 2024
      const period = createMonthlyPeriod(date);

      expect(period.endDate.getDate()).toBe(31);
    });
  });

  describe('getNextPeriod', () => {
    it('returns the next day for daily periods', () => {
      const period = createDailyPeriod(new Date(2024, 5, 15));
      const next = getNextPeriod(period);

      expect(next.type).toBe('daily');
      expect(next.startDate.getDate()).toBe(16);
      expect(next.startDate.getMonth()).toBe(5);
    });

    it('returns the next week for weekly periods', () => {
      const period = createWeeklyPeriod(new Date(2024, 5, 12), 1);
      const next = getNextPeriod(period);

      expect(next.type).toBe('weekly');
      expect(next.startDate.getDate()).toBe(17);
      expect(next.startDate.getDay()).toBe(1); // Monday
    });

    it('returns the next month for monthly periods', () => {
      const period = createMonthlyPeriod(new Date(2024, 0, 15)); // January
      const next = getNextPeriod(period);

      expect(next.type).toBe('monthly');
      expect(next.startDate.getMonth()).toBe(1); // February
      expect(next.startDate.getDate()).toBe(1);
    });

    it('handles year boundary for monthly periods', () => {
      const period = createMonthlyPeriod(new Date(2024, 11, 15)); // December
      const next = getNextPeriod(period);

      expect(next.startDate.getFullYear()).toBe(2025);
      expect(next.startDate.getMonth()).toBe(0); // January
    });
  });

  describe('getPreviousPeriod', () => {
    it('returns the previous day for daily periods', () => {
      const period = createDailyPeriod(new Date(2024, 5, 15));
      const prev = getPreviousPeriod(period);

      expect(prev.type).toBe('daily');
      expect(prev.startDate.getDate()).toBe(14);
    });

    it('returns the previous week for weekly periods', () => {
      const period = createWeeklyPeriod(new Date(2024, 5, 12), 1);
      const prev = getPreviousPeriod(period);

      expect(prev.type).toBe('weekly');
      expect(prev.startDate.getDate()).toBe(3);
      expect(prev.startDate.getDay()).toBe(1); // Monday
    });

    it('returns the previous month for monthly periods', () => {
      const period = createMonthlyPeriod(new Date(2024, 5, 15)); // June
      const prev = getPreviousPeriod(period);

      expect(prev.type).toBe('monthly');
      expect(prev.startDate.getMonth()).toBe(4); // May
      expect(prev.endDate.getDate()).toBe(31);
    });
  });

  describe('isDateInPeriod', () => {
    it('returns true for dates within the period', () => {
      const period = createWeeklyPeriod(new Date(2024, 5, 12), 1);
      // Period is June 10-16
      expect(isDateInPeriod(new Date(2024, 5, 12), period)).toBe(true);
      expect(isDateInPeriod(new Date(2024, 5, 10), period)).toBe(true); // start
      expect(isDateInPeriod(new Date(2024, 5, 16), period)).toBe(true); // end
    });

    it('returns false for dates outside the period', () => {
      const period = createWeeklyPeriod(new Date(2024, 5, 12), 1);
      expect(isDateInPeriod(new Date(2024, 5, 9), period)).toBe(false);
      expect(isDateInPeriod(new Date(2024, 5, 17), period)).toBe(false);
    });
  });

  describe('getEntriesForPeriod', () => {
    it('returns entries whose date falls within the period', async () => {
      const period = createDailyPeriod(new Date(2024, 5, 15));

      const inPeriod = createTestEntry({ date: new Date(2024, 5, 15, 10, 0) });
      const outOfPeriod = createTestEntry({ date: new Date(2024, 5, 16, 10, 0) });
      const noDate = createTestEntry({ date: undefined });

      await entryRepo.create(inPeriod);
      await entryRepo.create(outOfPeriod);
      await entryRepo.create(noDate);

      const results = await service.getEntriesForPeriod(period);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(inPeriod.id);
    });

    it('excludes entries without a date', async () => {
      const period = createDailyPeriod(new Date(2024, 5, 15));
      const noDate = createTestEntry({ date: undefined });
      await entryRepo.create(noDate);

      const results = await service.getEntriesForPeriod(period);
      expect(results).toHaveLength(0);
    });

    it('includes entries on both boundary dates (inclusive)', async () => {
      const period = createWeeklyPeriod(new Date(2024, 5, 12), 1);
      // Period is June 10-16

      const onStart = createTestEntry({ date: new Date(2024, 5, 10, 0, 0) });
      const onEnd = createTestEntry({ date: new Date(2024, 5, 16, 23, 59) });

      await entryRepo.create(onStart);
      await entryRepo.create(onEnd);

      const results = await service.getEntriesForPeriod(period);
      expect(results).toHaveLength(2);
    });
  });
});

// === Property-Based Tests ===

describe('CalendarService - Property-Based Tests', () => {
  /**
   * **Validates: Requirements 5.2**
   * Property 10: Calendar period filtering returns correct entries
   *
   * For any set of entries with dates and any calendar period,
   * querying entries for that period should return exactly those entries
   * whose date falls within the period's start and end dates (inclusive), and no others.
   */
  describe('Property 10: Calendar period filtering returns correct entries', () => {
    // Arbitrary for generating a date within a reasonable range
    const arbDate = fc.date({
      min: new Date(2020, 0, 1),
      max: new Date(2030, 11, 31),
    }).filter((d) => !isNaN(d.getTime()));

    const arbPeriodType = fc.constantFrom<'daily' | 'weekly' | 'monthly'>('daily', 'weekly', 'monthly');

    // Generate a period from a date and type
    function periodFromDateAndType(date: Date, type: 'daily' | 'weekly' | 'monthly'): CalendarPeriod {
      switch (type) {
        case 'daily':
          return createDailyPeriod(date);
        case 'weekly':
          return createWeeklyPeriod(date, 1);
        case 'monthly':
          return createMonthlyPeriod(date);
      }
    }

    it('returns exactly entries whose date is within the period', () => {
      fc.assert(
        fc.property(
          arbPeriodType,
          arbDate,
          fc.array(arbDate, { minLength: 0, maxLength: 20 }),
          (periodType, periodDate, entryDates) => {
            const period = periodFromDateAndType(periodDate, periodType);

            // Determine which entries should be in the period
            const expectedInPeriod = entryDates.filter((d) => isDateInPeriod(d, period));
            const expectedOutOfPeriod = entryDates.filter((d) => !isDateInPeriod(d, period));

            // Verify: every date in expectedInPeriod is within bounds
            for (const d of expectedInPeriod) {
              const dayStart = new Date(d);
              dayStart.setHours(0, 0, 0, 0);
              const periodStart = new Date(period.startDate);
              periodStart.setHours(0, 0, 0, 0);
              const periodEnd = new Date(period.endDate);
              periodEnd.setHours(0, 0, 0, 0);
              expect(dayStart >= periodStart && dayStart <= periodEnd).toBe(true);
            }

            // Verify: every date in expectedOutOfPeriod is outside bounds
            for (const d of expectedOutOfPeriod) {
              const dayStart = new Date(d);
              dayStart.setHours(0, 0, 0, 0);
              const periodStart = new Date(period.startDate);
              periodStart.setHours(0, 0, 0, 0);
              const periodEnd = new Date(period.endDate);
              periodEnd.setHours(0, 0, 0, 0);
              expect(dayStart < periodStart || dayStart > periodEnd).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getEntriesForPeriod returns only entries within the period', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPeriodType,
          arbDate,
          fc.array(arbDate, { minLength: 1, maxLength: 10 }),
          async (periodType, periodDate, entryDates) => {
            const entryRepo = new InMemoryRepository<Entry>();
            const configRepo = new InMemoryRepository<CalendarConfig>();
            const service = createCalendarService(entryRepo, configRepo);

            const period = periodFromDateAndType(periodDate, periodType);

            // Create entries with the generated dates
            const entries: Entry[] = [];
            for (const date of entryDates) {
              const entry = createTestEntry({ date });
              await entryRepo.create(entry);
              entries.push(entry);
            }

            const results = await service.getEntriesForPeriod(period);

            // Every returned entry should be in the period
            for (const entry of results) {
              expect(isDateInPeriod(entry.date!, period)).toBe(true);
            }

            // Every entry in the period should be returned
            const expectedIds = entries
              .filter((e) => e.date && isDateInPeriod(e.date, period))
              .map((e) => e.id)
              .sort();
            const resultIds = results.map((e) => e.id).sort();
            expect(resultIds).toEqual(expectedIds);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Validates: Requirements 5.4**
   * Property 11: Calendar period navigation round-trip
   *
   * For any calendar period, navigating to the next period and then back
   * to the previous period should return to the original period's start and end dates.
   */
  describe('Property 11: Calendar period navigation round-trip', () => {
    const arbDate = fc.date({
      min: new Date(2020, 0, 1),
      max: new Date(2029, 11, 31),
    }).filter((d) => !isNaN(d.getTime()));

    const arbPeriodType = fc.constantFrom<'daily' | 'weekly' | 'monthly'>('daily', 'weekly', 'monthly');

    function periodFromDateAndType(date: Date, type: 'daily' | 'weekly' | 'monthly'): CalendarPeriod {
      switch (type) {
        case 'daily':
          return createDailyPeriod(date);
        case 'weekly':
          return createWeeklyPeriod(date, 1);
        case 'monthly':
          return createMonthlyPeriod(date);
      }
    }

    it('next then previous returns to original period', () => {
      fc.assert(
        fc.property(arbPeriodType, arbDate, (periodType, date) => {
          const original = periodFromDateAndType(date, periodType);
          const next = getNextPeriod(original);
          const backToOriginal = getPreviousPeriod(next);

          expect(backToOriginal.startDate.getTime()).toBe(original.startDate.getTime());
          expect(backToOriginal.endDate.getTime()).toBe(original.endDate.getTime());
          expect(backToOriginal.type).toBe(original.type);
        }),
        { numRuns: 100 }
      );
    });

    it('previous then next returns to original period', () => {
      fc.assert(
        fc.property(arbPeriodType, arbDate, (periodType, date) => {
          const original = periodFromDateAndType(date, periodType);
          const prev = getPreviousPeriod(original);
          const backToOriginal = getNextPeriod(prev);

          expect(backToOriginal.startDate.getTime()).toBe(original.startDate.getTime());
          expect(backToOriginal.endDate.getTime()).toBe(original.endDate.getTime());
          expect(backToOriginal.type).toBe(original.type);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Validates: Requirements 5.1**
   * Weekly periods always span exactly 7 days.
   */
  describe('Weekly period spans exactly 7 days', () => {
    const arbDate = fc.date({
      min: new Date(2020, 0, 1),
      max: new Date(2030, 11, 31),
    }).filter((d) => !isNaN(d.getTime()));

    const arbWeekStartDay = fc.integer({ min: 0, max: 6 });

    it('weekly period always spans 7 days', () => {
      fc.assert(
        fc.property(arbDate, arbWeekStartDay, (date, weekStartDay) => {
          const period = createWeeklyPeriod(date, weekStartDay);

          // Calculate day difference using date components (avoids DST issues)
          const startDate = period.startDate.getDate();
          const startMonth = period.startDate.getMonth();
          const startYear = period.startDate.getFullYear();
          const endDate = period.endDate.getDate();
          const endMonth = period.endDate.getMonth();
          const endYear = period.endDate.getFullYear();

          // Use UTC dates to compute the difference without DST interference
          const startUtc = Date.UTC(startYear, startMonth, startDate);
          const endUtc = Date.UTC(endYear, endMonth, endDate);
          const diffDays = (endUtc - startUtc) / (1000 * 60 * 60 * 24);

          expect(diffDays).toBe(6); // 7 days inclusive = 6 day difference
          expect(period.startDate.getDay()).toBe(weekStartDay);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Validates: Requirements 5.1**
   * Monthly periods start on day 1 and end on the last day of the month.
   */
  describe('Monthly period boundaries', () => {
    const arbDate = fc.date({
      min: new Date(2020, 0, 1),
      max: new Date(2030, 11, 31),
    }).filter((d) => !isNaN(d.getTime()));

    it('monthly period starts on day 1 and ends on last day of month', () => {
      fc.assert(
        fc.property(arbDate, (date) => {
          const period = createMonthlyPeriod(date);

          expect(period.startDate.getDate()).toBe(1);
          expect(period.startDate.getMonth()).toBe(date.getMonth());
          expect(period.startDate.getFullYear()).toBe(date.getFullYear());

          // End date should be last day of the same month
          const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
          expect(period.endDate.getDate()).toBe(lastDay);
          expect(period.endDate.getMonth()).toBe(date.getMonth());
        }),
        { numRuns: 100 }
      );
    });
  });
});
