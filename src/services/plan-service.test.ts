import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db chains
const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertOnConflict = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock("@/db", () => {
  const selectChain = {
    from: (...args: unknown[]) => {
      mockSelectFrom(...args);
      return selectChain;
    },
    where: (...args: unknown[]) => {
      mockSelectWhere(...args);
      return mockSelectWhere(...args);
    },
  };
  const insertChain = {
    values: (...args: unknown[]) => {
      mockInsertValues(...args);
      return insertChain;
    },
    onConflictDoUpdate: (...args: unknown[]) => {
      mockInsertOnConflict(...args);
      return insertChain;
    },
    returning: (...args: unknown[]) => {
      return mockInsertReturning(...args);
    },
  };
  const updateChain = {
    set: (...args: unknown[]) => {
      mockUpdateSet(...args);
      return updateChain;
    },
    where: (...args: unknown[]) => {
      mockUpdateWhere(...args);
      return mockUpdateWhere(...args);
    },
  };
  return {
    db: {
      select: () => selectChain,
      insert: () => insertChain,
      update: () => updateChain,
    },
  };
});

vi.mock("@/db/schema", () => ({
  plans: {
    id: "plans.id",
    name: "plans.name",
    isBuiltIn: "plans.is_built_in",
  },
  planActivations: {
    id: "planActivations.id",
    userId: "planActivations.userId",
    planId: "planActivations.planId",
    isActive: "planActivations.isActive",
    activatedAt: "planActivations.activatedAt",
    deactivatedAt: "planActivations.deactivatedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ op: "eq", field: a, value: b })),
  and: vi.fn((...args) => ({ op: "and", conditions: args })),
}));

import {
  getAllPlans,
  getPlanById,
  getActivePlans,
  activatePlan,
  deactivatePlan,
  isPlanActive,
} from "./plan-service";

// Sample data
const samplePlanRow = {
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
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const sampleActivationRow = {
  id: "activation-1",
  userId: "user-1",
  planId: "plan-1",
  isActive: true,
  activatedAt: new Date("2024-06-01"),
  deactivatedAt: null,
};

describe("plan-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllPlans", () => {
    it("returns all plans mapped to Plan type", async () => {
      mockSelectWhere.mockResolvedValue([samplePlanRow]);
      // getAllPlans uses select().from(plans) without where
      // Need to handle the case where from returns the result directly
      mockSelectFrom.mockImplementation(() => {
        // The chain ends at from() for getAllPlans (no where clause)
      });

      // Override to handle the full chain — getAllPlans calls select().from(plans) with no .where()
      // We need a different approach: make from() resolve directly
      const { db } = await import("@/db");
      const originalSelect = db.select;

      // For getAllPlans, the chain is select().from(plans) which should return the rows
      // Let's make from() return a promise-like that resolves to rows
      const selectChainWithResult = {
        from: vi.fn().mockResolvedValue([samplePlanRow]),
        where: vi.fn().mockResolvedValue([samplePlanRow]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChainWithResult as any);

      const result = await getAllPlans();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("plan-1");
      expect(result[0].name).toBe("Diet Plan");
      expect(result[0].isBuiltIn).toBe(true);
      expect(result[0].widgetDefinitions).toHaveLength(1);
      expect(result[0].widgetDefinitions[0].widgetType).toBe("breakfast");

      vi.mocked(db.select).mockRestore();
    });

    it("returns empty array when no plans exist", async () => {
      const { db } = await import("@/db");
      const selectChainEmpty = {
        from: vi.fn().mockResolvedValue([]),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChainEmpty as any);

      const result = await getAllPlans();
      expect(result).toHaveLength(0);

      vi.mocked(db.select).mockRestore();
    });
  });

  describe("getPlanById", () => {
    it("returns the plan when found", async () => {
      const { db } = await import("@/db");
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([samplePlanRow]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChain as any);

      const result = await getPlanById("plan-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("plan-1");
      expect(result!.name).toBe("Diet Plan");

      vi.mocked(db.select).mockRestore();
    });

    it("returns null when plan not found", async () => {
      const { db } = await import("@/db");
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChain as any);

      const result = await getPlanById("nonexistent");
      expect(result).toBeNull();

      vi.mocked(db.select).mockRestore();
    });
  });

  describe("getActivePlans", () => {
    it("returns active plan activations for a user", async () => {
      const { db } = await import("@/db");
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([sampleActivationRow]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChain as any);

      const result = await getActivePlans("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-1");
      expect(result[0].planId).toBe("plan-1");
      expect(result[0].isActive).toBe(true);
      expect(result[0].deactivatedAt).toBeUndefined();

      vi.mocked(db.select).mockRestore();
    });

    it("returns empty array when user has no active plans", async () => {
      const { db } = await import("@/db");
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChain as any);

      const result = await getActivePlans("user-no-plans");
      expect(result).toHaveLength(0);

      vi.mocked(db.select).mockRestore();
    });
  });

  describe("activatePlan", () => {
    it("inserts a new activation and returns it", async () => {
      const { db } = await import("@/db");
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([sampleActivationRow]),
      };
      vi.spyOn(db, "insert").mockReturnValue(insertChain as any);

      const result = await activatePlan("user-1", "plan-1");

      expect(result.userId).toBe("user-1");
      expect(result.planId).toBe("plan-1");
      expect(result.isActive).toBe(true);
      expect(insertChain.values).toHaveBeenCalled();
      expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();

      vi.mocked(db.insert).mockRestore();
    });

    it("upserts with isActive true and sets activatedAt", async () => {
      const { db } = await import("@/db");
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...sampleActivationRow,
            activatedAt: new Date("2024-07-01"),
          },
        ]),
      };
      vi.spyOn(db, "insert").mockReturnValue(insertChain as any);

      const result = await activatePlan("user-1", "plan-1");

      expect(result.isActive).toBe(true);
      expect(result.activatedAt).toEqual(new Date("2024-07-01"));
      // Verify the onConflictDoUpdate was called with set containing isActive: true
      const conflictCall = insertChain.onConflictDoUpdate.mock.calls[0][0];
      expect(conflictCall.set.isActive).toBe(true);
      expect(conflictCall.set.deactivatedAt).toBeNull();

      vi.mocked(db.insert).mockRestore();
    });
  });

  describe("deactivatePlan", () => {
    it("sets isActive to false and records deactivatedAt", async () => {
      const { db } = await import("@/db");
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(db, "update").mockReturnValue(updateChain as any);

      await deactivatePlan("user-1", "plan-1");

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          deactivatedAt: expect.any(Date),
        })
      );

      vi.mocked(db.update).mockRestore();
    });

    it("does not delete the activation record", async () => {
      const { db } = await import("@/db");
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(db, "update").mockReturnValue(updateChain as any);

      await deactivatePlan("user-1", "plan-1");

      // Verify update is called (not delete)
      expect(db.update).toHaveBeenCalled();
      expect(updateChain.set).toHaveBeenCalled();

      vi.mocked(db.update).mockRestore();
    });
  });

  describe("isPlanActive", () => {
    it("returns true when plan is active for user", async () => {
      const { db } = await import("@/db");
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([sampleActivationRow]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChain as any);

      const result = await isPlanActive("user-1", "plan-1");
      expect(result).toBe(true);

      vi.mocked(db.select).mockRestore();
    });

    it("returns false when plan is not active for user", async () => {
      const { db } = await import("@/db");
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChain as any);

      const result = await isPlanActive("user-1", "plan-1");
      expect(result).toBe(false);

      vi.mocked(db.select).mockRestore();
    });

    it("returns false when no activation record exists", async () => {
      const { db } = await import("@/db");
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(db, "select").mockReturnValue(selectChain as any);

      const result = await isPlanActive("user-new", "plan-1");
      expect(result).toBe(false);

      vi.mocked(db.select).mockRestore();
    });
  });
});
