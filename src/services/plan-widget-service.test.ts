import { describe, it, expect, vi, beforeEach } from "vitest";

// Track calls for assertions
let dbCallIndex = 0;
const dbCallResults: unknown[] = [];

function setDbCallResults(...results: unknown[]) {
  dbCallIndex = 0;
  dbCallResults.length = 0;
  dbCallResults.push(...results);
}

vi.mock("@/db", () => {
  // Each db.select().from(table) or db.select().from(table).where() returns a promise
  // We track sequential calls and return results in order
  const createSelectChain = () => {
    let currentResult: unknown;
    const chain = {
      from: vi.fn(() => {
        // Capture the result for this call (if no .where() is called, this resolves)
        currentResult = dbCallResults[dbCallIndex++];
        // Make the chain thenable so it can be awaited directly
        chain.then = (resolve: (v: unknown) => void) => {
          return Promise.resolve(currentResult).then(resolve);
        };
        return chain;
      }),
      where: vi.fn(() => {
        // .where() is called after .from(), so use the current result
        const result = currentResult;
        return Promise.resolve(result);
      }),
      then: undefined as unknown,
    };
    // Make chain work as a Promise
    (chain as Record<string, unknown>)[Symbol.toStringTag] = "Promise";
    return chain;
  };

  const mockInsertChain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn(() => {
      const result = dbCallResults[dbCallIndex++];
      return Promise.resolve(result);
    }),
  };

  return {
    db: {
      select: () => createSelectChain(),
      insert: () => mockInsertChain,
      _insertChain: mockInsertChain,
    },
  };
});

vi.mock("@/db/schema", () => ({
  plans: { id: "id", name: "name", widgetDefinitions: "widgetDefinitions" },
  planActivations: {
    userId: "userId",
    planId: "planId",
    isActive: "isActive",
    activatedAt: "activatedAt",
  },
  planWidgetData: {
    id: "id",
    userId: "userId",
    planId: "planId",
    widgetType: "widgetType",
    date: "date",
    value: "value",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", conditions: args })),
}));

import {
  getWidgetsForDate,
  getWidgetData,
  saveWidgetData,
} from "./plan-widget-service";
import { db } from "@/db";

describe("plan-widget-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCallIndex = 0;
    dbCallResults.length = 0;
  });

  describe("getWidgetsForDate", () => {
    it("returns empty array when user has no active plan activations", async () => {
      // Call 1: planActivations.where() -> empty
      setDbCallResults([]);

      const result = await getWidgetsForDate("user-1", new Date("2024-06-15"));

      expect(result).toEqual([]);
    });

    it("returns injected widgets from active plans with attached data", async () => {
      const activatedAt = new Date("2024-06-01T10:00:00Z");

      setDbCallResults(
        // Call 1: planActivations.where() -> one activation
        [
          {
            id: "activation-1",
            userId: "user-1",
            planId: "plan-1",
            isActive: true,
            activatedAt,
            deactivatedAt: null,
          },
        ],
        // Call 2: plans (all) -> one plan
        [
          {
            id: "plan-1",
            name: "Diet Plan",
            description: "Track meals",
            isBuiltIn: true,
            widgetDefinitions: [
              {
                widgetType: "breakfast",
                label: "Breakfast",
                targetZoneType: "daily-content",
                frequency: "daily",
                inputType: "free-text",
              },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        // Call 3: planWidgetData.where() -> one data record
        [
          {
            id: "data-1",
            userId: "user-1",
            planId: "plan-1",
            widgetType: "breakfast",
            date: "2024-06-15",
            value: "Oatmeal",
            createdAt: new Date("2024-06-15T08:00:00Z"),
            updatedAt: new Date("2024-06-15T08:00:00Z"),
          },
        ]
      );

      const result = await getWidgetsForDate("user-1", new Date("2024-06-15"));

      expect(result).toHaveLength(1);
      expect(result[0].planId).toBe("plan-1");
      expect(result[0].planName).toBe("Diet Plan");
      expect(result[0].definition.widgetType).toBe("breakfast");
      expect(result[0].data).not.toBeNull();
      expect(result[0].data!.value).toBe("Oatmeal");
    });

    it("returns widgets from multiple active plans sorted by activation order", async () => {
      const earlierActivation = new Date("2024-06-01T10:00:00Z");
      const laterActivation = new Date("2024-06-05T10:00:00Z");

      setDbCallResults(
        // Call 1: two activations
        [
          {
            id: "activation-2",
            userId: "user-1",
            planId: "plan-2",
            isActive: true,
            activatedAt: laterActivation,
            deactivatedAt: null,
          },
          {
            id: "activation-1",
            userId: "user-1",
            planId: "plan-1",
            isActive: true,
            activatedAt: earlierActivation,
            deactivatedAt: null,
          },
        ],
        // Call 2: two plans
        [
          {
            id: "plan-1",
            name: "Diet Plan",
            widgetDefinitions: [
              {
                widgetType: "breakfast",
                label: "Breakfast",
                targetZoneType: "daily-content",
                frequency: "daily",
                inputType: "free-text",
              },
            ],
          },
          {
            id: "plan-2",
            name: "Exercise Plan",
            widgetDefinitions: [
              {
                widgetType: "workout",
                label: "Workout",
                targetZoneType: "daily-content",
                frequency: "daily",
                inputType: "free-text",
              },
            ],
          },
        ],
        // Call 3: no widget data
        []
      );

      const result = await getWidgetsForDate("user-1", new Date("2024-06-15"));

      expect(result).toHaveLength(2);
      // Earlier activation should come first
      expect(result[0].planName).toBe("Diet Plan");
      expect(result[1].planName).toBe("Exercise Plan");
    });

    it("returns widgets with null data when no data exists for the date", async () => {
      const activatedAt = new Date("2024-06-01T10:00:00Z");

      setDbCallResults(
        // Call 1: one activation
        [
          {
            id: "activation-1",
            userId: "user-1",
            planId: "plan-1",
            isActive: true,
            activatedAt,
            deactivatedAt: null,
          },
        ],
        // Call 2: one plan with two widgets
        [
          {
            id: "plan-1",
            name: "Diet Plan",
            widgetDefinitions: [
              {
                widgetType: "breakfast",
                label: "Breakfast",
                targetZoneType: "daily-content",
                frequency: "daily",
                inputType: "free-text",
              },
              {
                widgetType: "lunch",
                label: "Lunch",
                targetZoneType: "daily-content",
                frequency: "daily",
                inputType: "free-text",
              },
            ],
          },
        ],
        // Call 3: no widget data
        []
      );

      const result = await getWidgetsForDate("user-1", new Date("2024-06-15"));

      expect(result).toHaveLength(2);
      expect(result[0].data).toBeNull();
      expect(result[1].data).toBeNull();
    });

    it("skips activations whose plan does not exist", async () => {
      const activatedAt = new Date("2024-06-01T10:00:00Z");

      setDbCallResults(
        // Activation references a plan that doesn't exist
        [
          {
            id: "activation-1",
            userId: "user-1",
            planId: "nonexistent-plan",
            isActive: true,
            activatedAt,
            deactivatedAt: null,
          },
        ],
        // No matching plan
        [],
        // No widget data
        []
      );

      const result = await getWidgetsForDate("user-1", new Date("2024-06-15"));

      expect(result).toEqual([]);
    });
  });

  describe("getWidgetData", () => {
    it("returns null when no data exists for the given params", async () => {
      setDbCallResults([]);

      const result = await getWidgetData(
        "user-1",
        "plan-1",
        "breakfast",
        new Date("2024-06-15")
      );

      expect(result).toBeNull();
    });

    it("returns the widget data record when it exists", async () => {
      setDbCallResults([
        {
          id: "data-1",
          userId: "user-1",
          planId: "plan-1",
          widgetType: "breakfast",
          date: "2024-06-15",
          value: "Oatmeal with berries",
          createdAt: new Date("2024-06-15T08:00:00Z"),
          updatedAt: new Date("2024-06-15T08:00:00Z"),
        },
      ]);

      const result = await getWidgetData(
        "user-1",
        "plan-1",
        "breakfast",
        new Date("2024-06-15")
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe("data-1");
      expect(result!.userId).toBe("user-1");
      expect(result!.planId).toBe("plan-1");
      expect(result!.widgetType).toBe("breakfast");
      expect(result!.value).toBe("Oatmeal with berries");
      expect(result!.date).toEqual(new Date("2024-06-15"));
    });
  });

  describe("saveWidgetData", () => {
    it("upserts widget data and returns the saved record", async () => {
      const savedRow = {
        id: "data-1",
        userId: "user-1",
        planId: "plan-1",
        widgetType: "breakfast",
        date: "2024-06-15",
        value: "Eggs and toast",
        createdAt: new Date("2024-06-15T08:00:00Z"),
        updatedAt: new Date("2024-06-15T08:30:00Z"),
      };

      setDbCallResults([savedRow]);

      const result = await saveWidgetData(
        "user-1",
        "plan-1",
        "breakfast",
        new Date("2024-06-15"),
        "Eggs and toast"
      );

      expect(result.id).toBe("data-1");
      expect(result.userId).toBe("user-1");
      expect(result.planId).toBe("plan-1");
      expect(result.widgetType).toBe("breakfast");
      expect(result.value).toBe("Eggs and toast");
      expect(result.date).toEqual(new Date("2024-06-15"));

      // Verify insert was called with correct values
      const insertChain = (db as unknown as { _insertChain: Record<string, ReturnType<typeof vi.fn>> })._insertChain;
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          planId: "plan-1",
          widgetType: "breakfast",
          date: "2024-06-15",
          value: "Eggs and toast",
        })
      );

      // Verify onConflictDoUpdate was called with upsert config
      expect(insertChain.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.any(Array),
          set: expect.objectContaining({
            value: "Eggs and toast",
          }),
        })
      );
    });

    it("formats single-digit months and days with zero padding", async () => {
      const savedRow = {
        id: "data-2",
        userId: "user-1",
        planId: "plan-1",
        widgetType: "lunch",
        date: "2024-01-05",
        value: "Salad",
        createdAt: new Date("2024-01-05T12:00:00Z"),
        updatedAt: new Date("2024-01-05T12:00:00Z"),
      };

      setDbCallResults([savedRow]);

      await saveWidgetData(
        "user-1",
        "plan-1",
        "lunch",
        new Date("2024-01-05"),
        "Salad"
      );

      const insertChain = (db as unknown as { _insertChain: Record<string, ReturnType<typeof vi.fn>> })._insertChain;
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          date: "2024-01-05",
        })
      );
    });
  });
});
