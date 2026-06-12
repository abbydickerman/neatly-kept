import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LayoutTemplate, InjectedWidget, TemplateArea } from "@/types/layout-plan";

// Mock dependencies
const mockSelect = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => mockSelect(),
  },
}));

vi.mock("@/db/schema", () => ({
  entries: {
    userId: "user_id",
    date: "date",
    id: "id",
    pageId: "page_id",
    type: "type",
    text: "text",
    signifiers: "signifiers",
    state: "state",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
}));

const mockGetActiveWeeklyTemplate = vi.fn();
const mockGetActiveMonthlyTemplate = vi.fn();

vi.mock("@/services/layout-selection-service", () => ({
  getActiveWeeklyTemplate: (...args: unknown[]) => mockGetActiveWeeklyTemplate(...args),
  getActiveMonthlyTemplate: (...args: unknown[]) => mockGetActiveMonthlyTemplate(...args),
}));

const mockGetWidgetsForDate = vi.fn();

vi.mock("@/services/plan-widget-service", () => ({
  getWidgetsForDate: (...args: unknown[]) => mockGetWidgetsForDate(...args),
}));

import { computeDailyView, extractDayColumn } from "./daily-view-computer";

describe("daily-view-computer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractDayColumn", () => {
    const sampleAreas: TemplateArea[] = [
      { id: "header", type: "header", label: "Week Header", x: 0, y: 0, width: 100, height: 8 },
      { id: "mon", type: "day-column", dayOfWeek: 1, label: "Monday", x: 0, y: 8, width: 25, height: 46 },
      { id: "tue", type: "day-column", dayOfWeek: 2, label: "Tuesday", x: 25, y: 8, width: 25, height: 46 },
      { id: "wed", type: "day-column", dayOfWeek: 3, label: "Wednesday", x: 50, y: 8, width: 25, height: 46 },
      { id: "thu", type: "day-column", dayOfWeek: 4, label: "Thursday", x: 75, y: 8, width: 25, height: 46 },
      { id: "fri", type: "day-column", dayOfWeek: 5, label: "Friday", x: 0, y: 54, width: 25, height: 46 },
      { id: "sat", type: "day-column", dayOfWeek: 6, label: "Saturday", x: 25, y: 54, width: 25, height: 46 },
      { id: "sun", type: "day-column", dayOfWeek: 0, label: "Sunday", x: 50, y: 54, width: 25, height: 46 },
      { id: "side-panel", type: "side-panel", label: "Side Panel", x: 75, y: 54, width: 25, height: 46 },
    ];

    it("returns the correct day column for Monday (1)", () => {
      const result = extractDayColumn(sampleAreas, 1);
      expect(result).toEqual(sampleAreas[1]);
      expect(result?.label).toBe("Monday");
    });

    it("returns the correct day column for Sunday (0)", () => {
      const result = extractDayColumn(sampleAreas, 0);
      expect(result).toEqual(sampleAreas[7]);
      expect(result?.label).toBe("Sunday");
    });

    it("returns the correct day column for Saturday (6)", () => {
      const result = extractDayColumn(sampleAreas, 6);
      expect(result).toEqual(sampleAreas[6]);
      expect(result?.label).toBe("Saturday");
    });

    it("returns null when areas is empty", () => {
      const result = extractDayColumn([], 1);
      expect(result).toBeNull();
    });

    it("returns null when no day-column matches the dayOfWeek", () => {
      const areasWithoutMonday = sampleAreas.filter((a) => a.dayOfWeek !== 1);
      const result = extractDayColumn(areasWithoutMonday, 1);
      expect(result).toBeNull();
    });

    it("ignores non-day-column areas even if they have a matching dayOfWeek", () => {
      const mixedAreas: TemplateArea[] = [
        { id: "header", type: "header", dayOfWeek: 1, label: "Header", x: 0, y: 0, width: 100, height: 8 },
        { id: "mon", type: "day-column", dayOfWeek: 1, label: "Monday", x: 0, y: 8, width: 25, height: 46 },
      ];
      const result = extractDayColumn(mixedAreas, 1);
      expect(result?.id).toBe("mon");
      expect(result?.type).toBe("day-column");
    });
  });

  describe("computeDailyView", () => {
    const weeklyTemplate: LayoutTemplate = {
      id: "tmpl-weekly-1",
      name: "Classic Weekly",
      description: "A classic weekly spread",
      category: "weekly",
      isBuiltIn: true,
      structure: {
        areas: [
          { id: "mon", type: "day-column", dayOfWeek: 1, label: "Monday", x: 0, y: 8, width: 25, height: 46 },
          { id: "tue", type: "day-column", dayOfWeek: 2, label: "Tuesday", x: 25, y: 8, width: 25, height: 46 },
          { id: "wed", type: "day-column", dayOfWeek: 3, label: "Wednesday", x: 50, y: 8, width: 25, height: 46 },
          { id: "thu", type: "day-column", dayOfWeek: 4, label: "Thursday", x: 75, y: 8, width: 25, height: 46 },
          { id: "fri", type: "day-column", dayOfWeek: 5, label: "Friday", x: 0, y: 54, width: 25, height: 46 },
          { id: "sat", type: "day-column", dayOfWeek: 6, label: "Saturday", x: 25, y: 54, width: 25, height: 46 },
          { id: "sun", type: "day-column", dayOfWeek: 0, label: "Sunday", x: 50, y: 54, width: 25, height: 46 },
        ],
      },
      injectionZones: [],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    const monthlyTemplate: LayoutTemplate = {
      id: "tmpl-monthly-1",
      name: "Month at a Glance",
      description: "Full month overview",
      category: "monthly",
      isBuiltIn: true,
      structure: { areas: [] },
      injectionZones: [],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    it("returns a complete computed daily view with active layouts", async () => {
      // Monday, June 3, 2024
      const date = new Date(2024, 5, 3);

      mockGetActiveWeeklyTemplate.mockResolvedValue(weeklyTemplate);
      mockGetActiveMonthlyTemplate.mockResolvedValue(monthlyTemplate);
      mockGetWidgetsForDate.mockResolvedValue([]);

      // entries query returns empty
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      const result = await computeDailyView("user-1", date);

      expect(result.date).toEqual(date);
      expect(result.dayOfWeek).toBe(1); // Monday
      expect(result.dayColumn).toEqual(weeklyTemplate.structure.areas[0]);
      expect(result.dayColumn?.label).toBe("Monday");
      expect(result.entries).toEqual([]);
      expect(result.dailyWidgets).toEqual([]);
      expect(result.monthlyContext.monthlyTemplate).toEqual(monthlyTemplate);
      expect(result.monthlyContext.monthlyGoalsWidgets).toEqual([]);
      expect(result.hasWeeklyLayout).toBe(true);
      expect(result.hasMonthlyLayout).toBe(true);
    });

    it("returns dayColumn as null when no weekly template is active", async () => {
      const date = new Date(2024, 5, 3);

      mockGetActiveWeeklyTemplate.mockResolvedValue(null);
      mockGetActiveMonthlyTemplate.mockResolvedValue(null);
      mockGetWidgetsForDate.mockResolvedValue([]);
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      const result = await computeDailyView("user-1", date);

      expect(result.dayColumn).toBeNull();
      expect(result.hasWeeklyLayout).toBe(false);
      expect(result.hasMonthlyLayout).toBe(false);
    });

    it("separates daily widgets from monthly goal widgets", async () => {
      const date = new Date(2024, 5, 5); // Wednesday

      const dailyWidget: InjectedWidget = {
        planId: "plan-diet",
        planName: "Diet Plan",
        definition: {
          widgetType: "breakfast",
          label: "Breakfast",
          targetZoneType: "daily-content",
          frequency: "daily",
          inputType: "free-text",
        },
        data: null,
        activationOrder: 1,
      };

      const monthlyWidget: InjectedWidget = {
        planId: "plan-goals",
        planName: "Goal Tracker",
        definition: {
          widgetType: "monthly-goals",
          label: "Monthly Goals",
          targetZoneType: "monthly-goals",
          frequency: "monthly",
          inputType: "checklist",
        },
        data: null,
        activationOrder: 2,
      };

      const supplementaryWidget: InjectedWidget = {
        planId: "plan-diet",
        planName: "Diet Plan",
        definition: {
          widgetType: "grocery-list",
          label: "Grocery List",
          targetZoneType: "supplementary",
          frequency: "weekly",
          inputType: "checklist",
        },
        data: null,
        activationOrder: 1,
      };

      mockGetActiveWeeklyTemplate.mockResolvedValue(weeklyTemplate);
      mockGetActiveMonthlyTemplate.mockResolvedValue(monthlyTemplate);
      mockGetWidgetsForDate.mockResolvedValue([dailyWidget, monthlyWidget, supplementaryWidget]);
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      const result = await computeDailyView("user-1", date);

      // Only daily-content + daily frequency widgets go into dailyWidgets
      expect(result.dailyWidgets).toEqual([dailyWidget]);
      // Monthly goals go into monthlyContext
      expect(result.monthlyContext.monthlyGoalsWidgets).toEqual([monthlyWidget]);
    });

    it("includes entries fetched from the database", async () => {
      const date = new Date(2024, 5, 3); // Monday

      const mockEntryRow = {
        id: "entry-1",
        userId: "user-1",
        pageId: "page-1",
        type: "task",
        text: "Buy groceries",
        signifiers: [{ id: "sig-bullet", symbol: "•", category: "type", label: "Task" }],
        date: "2024-06-03",
        state: "incomplete",
        createdAt: new Date("2024-06-03T10:00:00Z"),
        updatedAt: new Date("2024-06-03T10:00:00Z"),
      };

      mockGetActiveWeeklyTemplate.mockResolvedValue(weeklyTemplate);
      mockGetActiveMonthlyTemplate.mockResolvedValue(null);
      mockGetWidgetsForDate.mockResolvedValue([]);
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [mockEntryRow],
        }),
      });

      const result = await computeDailyView("user-1", date);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe("entry-1");
      expect(result.entries[0].text).toBe("Buy groceries");
      expect(result.entries[0].type).toBe("task");
    });

    it("correctly identifies the day-of-week for different dates", async () => {
      mockGetActiveWeeklyTemplate.mockResolvedValue(weeklyTemplate);
      mockGetActiveMonthlyTemplate.mockResolvedValue(null);
      mockGetWidgetsForDate.mockResolvedValue([]);
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      // Sunday, June 2, 2024
      const sunday = new Date(2024, 5, 2);
      const sundayResult = await computeDailyView("user-1", sunday);
      expect(sundayResult.dayOfWeek).toBe(0);
      expect(sundayResult.dayColumn?.label).toBe("Sunday");

      // Saturday, June 8, 2024
      const saturday = new Date(2024, 5, 8);
      const saturdayResult = await computeDailyView("user-1", saturday);
      expect(saturdayResult.dayOfWeek).toBe(6);
      expect(saturdayResult.dayColumn?.label).toBe("Saturday");
    });

    it("passes the correct userId and date to dependencies", async () => {
      const date = new Date(2024, 5, 3);

      mockGetActiveWeeklyTemplate.mockResolvedValue(null);
      mockGetActiveMonthlyTemplate.mockResolvedValue(null);
      mockGetWidgetsForDate.mockResolvedValue([]);
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      await computeDailyView("user-42", date);

      expect(mockGetActiveWeeklyTemplate).toHaveBeenCalledWith("user-42");
      expect(mockGetActiveMonthlyTemplate).toHaveBeenCalledWith("user-42");
      expect(mockGetWidgetsForDate).toHaveBeenCalledWith("user-42", date);
    });
  });
});
