import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock drizzle-orm functions
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ type: "eq", field, value })),
  ilike: vi.fn((field, pattern) => ({ type: "ilike", field, pattern })),
}));

// Mock the schema
vi.mock("@/db/schema", () => ({
  layoutTemplates: {
    id: "id",
    name: "name",
    category: "category",
  },
}));

// Create chainable mock for db.select().from().where()
const mockWhere = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
  },
}));

import { createLayoutTemplateService } from "./layout-template-service";
import { db } from "@/db";
import { eq, ilike } from "drizzle-orm";

// === Test Data ===

const mockWeeklyTemplate = {
  id: "tmpl-weekly-1",
  name: "Classic Weekly Spread",
  description: "Traditional weekly layout with 7 day columns",
  category: "weekly",
  previewImageUrl: "https://example.com/preview.png",
  isBuiltIn: true,
  structure: { areas: [] },
  injectionZones: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockMonthlyTemplate = {
  id: "tmpl-monthly-1",
  name: "Monthly Overview",
  description: "Monthly layout with calendar grid",
  category: "monthly",
  previewImageUrl: null,
  isBuiltIn: true,
  structure: { areas: [] },
  injectionZones: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockMinimalWeekly = {
  id: "tmpl-weekly-2",
  name: "Minimal Weekly",
  description: "Compact weekly layout",
  category: "weekly",
  previewImageUrl: null,
  isBuiltIn: true,
  structure: { areas: [] },
  injectionZones: [],
  createdAt: new Date("2024-02-01"),
  updatedAt: new Date("2024-02-01"),
};

const allTemplates = [mockWeeklyTemplate, mockMonthlyTemplate, mockMinimalWeekly];

describe("LayoutTemplateService", () => {
  let service: ReturnType<typeof createLayoutTemplateService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue([]);
    service = createLayoutTemplateService(db as any);
  });

  describe("getAllTemplates", () => {
    it("returns all templates from the database", async () => {
      mockFrom.mockReturnValue(allTemplates);

      const result = await service.getAllTemplates();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("tmpl-weekly-1");
      expect(result[0].name).toBe("Classic Weekly Spread");
      expect(result[0].category).toBe("weekly");
      expect(result[1].category).toBe("monthly");
    });

    it("returns empty array when no templates exist", async () => {
      mockFrom.mockReturnValue([]);

      const result = await service.getAllTemplates();

      expect(result).toHaveLength(0);
    });

    it("maps previewImageUrl null to undefined", async () => {
      mockFrom.mockReturnValue([mockMonthlyTemplate]);

      const result = await service.getAllTemplates();

      expect(result[0].previewImageUrl).toBeUndefined();
    });

    it("maps previewImageUrl string correctly", async () => {
      mockFrom.mockReturnValue([mockWeeklyTemplate]);

      const result = await service.getAllTemplates();

      expect(result[0].previewImageUrl).toBe("https://example.com/preview.png");
    });
  });

  describe("getTemplatesByCategory", () => {
    it("returns only weekly templates when filtering by weekly", async () => {
      mockFrom.mockReturnValue({
        where: () => [mockWeeklyTemplate, mockMinimalWeekly],
      });

      const result = await service.getTemplatesByCategory("weekly");

      expect(result).toHaveLength(2);
      result.forEach((t) => expect(t.category).toBe("weekly"));
    });

    it("returns only monthly templates when filtering by monthly", async () => {
      mockFrom.mockReturnValue({
        where: () => [mockMonthlyTemplate],
      });

      const result = await service.getTemplatesByCategory("monthly");

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("monthly");
    });

    it("returns empty array when no templates match the category", async () => {
      mockFrom.mockReturnValue({
        where: () => [],
      });

      const result = await service.getTemplatesByCategory("monthly");

      expect(result).toHaveLength(0);
    });
  });

  describe("searchTemplates", () => {
    it("returns templates matching search term", async () => {
      mockFrom.mockReturnValue({
        where: () => [mockWeeklyTemplate, mockMinimalWeekly],
      });

      const result = await service.searchTemplates("weekly");

      expect(result).toHaveLength(2);
    });

    it("returns empty array when no templates match the search term", async () => {
      mockFrom.mockReturnValue({
        where: () => [],
      });

      const result = await service.searchTemplates("nonexistent");

      expect(result).toHaveLength(0);
    });

    it("uses ilike with % wildcards for pattern matching", async () => {
      mockFrom.mockReturnValue({
        where: () => [mockWeeklyTemplate],
      });

      await service.searchTemplates("Classic");

      expect(ilike).toHaveBeenCalledWith("name", "%Classic%");
    });
  });

  describe("getTemplateById", () => {
    it("returns the template when found", async () => {
      mockFrom.mockReturnValue({
        where: () => [mockWeeklyTemplate],
      });

      const result = await service.getTemplateById("tmpl-weekly-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("tmpl-weekly-1");
      expect(result!.name).toBe("Classic Weekly Spread");
    });

    it("returns null when template is not found", async () => {
      mockFrom.mockReturnValue({
        where: () => [],
      });

      const result = await service.getTemplateById("nonexistent-id");

      expect(result).toBeNull();
    });

    it("returns correct structure and injectionZones", async () => {
      const templateWithStructure = {
        ...mockWeeklyTemplate,
        structure: {
          areas: [
            { id: "mon", type: "day-column", dayOfWeek: 1, label: "Monday", x: 0, y: 0, width: 25, height: 100 },
          ],
        },
        injectionZones: [
          { id: "mon-daily", name: "Monday Content", type: "daily-content", parentAreaId: "mon", position: "after-entries" },
        ],
      };

      mockFrom.mockReturnValue({
        where: () => [templateWithStructure],
      });

      const result = await service.getTemplateById("tmpl-weekly-1");

      expect(result!.structure.areas).toHaveLength(1);
      expect(result!.structure.areas[0].type).toBe("day-column");
      expect(result!.injectionZones).toHaveLength(1);
      expect(result!.injectionZones[0].type).toBe("daily-content");
    });

    it("uses eq to query by id field", async () => {
      mockFrom.mockReturnValue({
        where: () => [],
      });

      await service.getTemplateById("some-id");

      expect(eq).toHaveBeenCalledWith("id", "some-id");
    });
  });
});
