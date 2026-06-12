import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB and schema
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => mockSelect(),
    insert: () => mockInsert(),
  },
}));

vi.mock("@/db/schema", () => ({
  userLayoutSelections: {
    userId: "user_id",
    category: "category",
    templateId: "template_id",
    activatedAt: "activated_at",
    id: "id",
  },
  layoutTemplates: {
    id: "id",
    name: "name",
    description: "description",
    category: "category",
    previewImageUrl: "preview_image_url",
    isBuiltIn: "is_built_in",
    structure: "structure",
    injectionZones: "injection_zones",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
}));

import {
  getActiveSelection,
  activateTemplate,
  getActiveWeeklyTemplate,
  getActiveMonthlyTemplate,
} from "./layout-selection-service";

describe("layout-selection-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActiveSelection", () => {
    it("returns null when no selection exists for the user and category", async () => {
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      const result = await getActiveSelection("user-1", "weekly");
      expect(result).toBeNull();
    });

    it("returns the active selection when one exists", async () => {
      const mockRow = {
        id: "sel-1",
        userId: "user-1",
        templateId: "tmpl-1",
        category: "weekly",
        activatedAt: new Date("2024-06-01"),
      };

      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [mockRow],
        }),
      });

      const result = await getActiveSelection("user-1", "weekly");
      expect(result).toEqual({
        id: "sel-1",
        userId: "user-1",
        templateId: "tmpl-1",
        category: "weekly",
        activatedAt: new Date("2024-06-01"),
      });
    });

    it("returns the correct category selection (monthly)", async () => {
      const mockRow = {
        id: "sel-2",
        userId: "user-1",
        templateId: "tmpl-monthly-1",
        category: "monthly",
        activatedAt: new Date("2024-06-15"),
      };

      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [mockRow],
        }),
      });

      const result = await getActiveSelection("user-1", "monthly");
      expect(result).toEqual({
        id: "sel-2",
        userId: "user-1",
        templateId: "tmpl-monthly-1",
        category: "monthly",
        activatedAt: new Date("2024-06-15"),
      });
    });
  });

  describe("activateTemplate", () => {
    it("throws when template is not found", async () => {
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      await expect(activateTemplate("user-1", "non-existent")).rejects.toThrow(
        "Template not found: non-existent"
      );
    });

    it("activates a template and returns the selection", async () => {
      const mockTemplate = {
        id: "tmpl-1",
        name: "Classic Weekly",
        category: "weekly",
      };

      const mockResult = {
        id: "sel-new",
        userId: "user-1",
        templateId: "tmpl-1",
        category: "weekly",
        activatedAt: new Date("2024-06-01"),
      };

      // First call: select template
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => [mockTemplate],
        }),
      });

      // Insert with upsert
      mockInsert.mockReturnValue({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: () => [mockResult],
          }),
        }),
      });

      const result = await activateTemplate("user-1", "tmpl-1");
      expect(result).toEqual({
        id: "sel-new",
        userId: "user-1",
        templateId: "tmpl-1",
        category: "weekly",
        activatedAt: new Date("2024-06-01"),
      });
    });

    it("replaces existing selection for the same category (upsert)", async () => {
      const mockTemplate = {
        id: "tmpl-2",
        name: "Minimal Weekly",
        category: "weekly",
      };

      const mockResult = {
        id: "sel-existing",
        userId: "user-1",
        templateId: "tmpl-2",
        category: "weekly",
        activatedAt: new Date("2024-07-01"),
      };

      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => [mockTemplate],
        }),
      });

      mockInsert.mockReturnValue({
        values: () => ({
          onConflictDoUpdate: () => ({
            returning: () => [mockResult],
          }),
        }),
      });

      const result = await activateTemplate("user-1", "tmpl-2");
      expect(result.templateId).toBe("tmpl-2");
      expect(result.category).toBe("weekly");
    });
  });

  describe("getActiveWeeklyTemplate", () => {
    it("returns null when no weekly selection exists", async () => {
      // getActiveSelection query returns empty
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      const result = await getActiveWeeklyTemplate("user-1");
      expect(result).toBeNull();
    });

    it("returns the full template when a weekly selection exists", async () => {
      const mockSelection = {
        id: "sel-1",
        userId: "user-1",
        templateId: "tmpl-1",
        category: "weekly",
        activatedAt: new Date("2024-06-01"),
      };

      const mockTemplate = {
        id: "tmpl-1",
        name: "Classic Weekly Spread",
        description: "Traditional layout",
        category: "weekly",
        previewImageUrl: "https://example.com/preview.png",
        isBuiltIn: true,
        structure: { areas: [] },
        injectionZones: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      // First call: getActiveSelection
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => [mockSelection],
        }),
      });

      // Second call: get template by id
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => [mockTemplate],
        }),
      });

      const result = await getActiveWeeklyTemplate("user-1");
      expect(result).toEqual({
        id: "tmpl-1",
        name: "Classic Weekly Spread",
        description: "Traditional layout",
        category: "weekly",
        previewImageUrl: "https://example.com/preview.png",
        isBuiltIn: true,
        structure: { areas: [] },
        injectionZones: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });
    });

    it("returns null if selected template no longer exists", async () => {
      const mockSelection = {
        id: "sel-1",
        userId: "user-1",
        templateId: "tmpl-deleted",
        category: "weekly",
        activatedAt: new Date("2024-06-01"),
      };

      // First call: getActiveSelection
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => [mockSelection],
        }),
      });

      // Second call: template not found
      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => [],
        }),
      });

      const result = await getActiveWeeklyTemplate("user-1");
      expect(result).toBeNull();
    });
  });

  describe("getActiveMonthlyTemplate", () => {
    it("returns null when no monthly selection exists", async () => {
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      });

      const result = await getActiveMonthlyTemplate("user-1");
      expect(result).toBeNull();
    });

    it("returns the full template when a monthly selection exists", async () => {
      const mockSelection = {
        id: "sel-2",
        userId: "user-1",
        templateId: "tmpl-monthly-1",
        category: "monthly",
        activatedAt: new Date("2024-06-01"),
      };

      const mockTemplate = {
        id: "tmpl-monthly-1",
        name: "Month at a Glance",
        description: "Full month overview",
        category: "monthly",
        previewImageUrl: null,
        isBuiltIn: true,
        structure: { areas: [] },
        injectionZones: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => [mockSelection],
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: () => ({
          where: () => [mockTemplate],
        }),
      });

      const result = await getActiveMonthlyTemplate("user-1");
      expect(result).toEqual({
        id: "tmpl-monthly-1",
        name: "Month at a Glance",
        description: "Full month overview",
        category: "monthly",
        previewImageUrl: undefined,
        isBuiltIn: true,
        structure: { areas: [] },
        injectionZones: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });
    });
  });
});
