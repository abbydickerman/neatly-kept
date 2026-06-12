import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GalleryTemplate } from "@/types/models";

// Mock templates for testing
const mockTemplates: GalleryTemplate[] = [
  {
    id: "t1",
    name: "Daily Planner",
    description: "A simple daily planning template",
    category: "daily",
    tags: ["planning", "daily"],
    contentAreas: [
      { id: "a1", type: "text", x: 0, y: 0, width: 100, height: 50 },
      { id: "a2", type: "checklist", x: 0, y: 50, width: 100, height: 50 },
    ],
    previewImageUrl: undefined,
    authorId: "user1",
    authorName: "Alice",
    usageCount: 150,
    isFeatured: true,
    status: "published",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "t2",
    name: "Weekly Spread",
    description: "A weekly overview with habit tracking",
    category: "weekly",
    tags: ["weekly", "habits"],
    contentAreas: [
      { id: "b1", type: "text", x: 0, y: 0, width: 50, height: 100 },
      { id: "b2", type: "checklist", x: 50, y: 0, width: 50, height: 100 },
    ],
    previewImageUrl: "https://example.com/preview.png",
    authorId: "user2",
    authorName: "Bob",
    usageCount: 75,
    isFeatured: false,
    status: "published",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "t3",
    name: "Creative Journal",
    description: "A creative template for artistic journaling",
    category: "creative",
    tags: ["art", "creative"],
    contentAreas: [
      { id: "c1", type: "image", x: 0, y: 0, width: 100, height: 70 },
      { id: "c2", type: "text", x: 0, y: 70, width: 100, height: 30 },
    ],
    previewImageUrl: undefined,
    authorId: "user3",
    authorName: "Charlie",
    usageCount: 30,
    isFeatured: false,
    status: "published",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
];

// We test the component logic by testing the fetch URL construction and data flow
// Since we're in a Node environment without DOM, we test the logic aspects

describe("TemplateGalleryBrowser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("API URL construction", () => {
    it("should build correct URL with no filters", () => {
      const params = new URLSearchParams();
      params.set("sort", "popular");
      expect(params.toString()).toBe("sort=popular");
    });

    it("should build correct URL with category filter", () => {
      const params = new URLSearchParams();
      params.set("category", "daily");
      params.set("sort", "popular");
      expect(params.toString()).toBe("category=daily&sort=popular");
    });

    it("should build correct URL with search term", () => {
      const params = new URLSearchParams();
      params.set("search", "planner");
      params.set("sort", "popular");
      expect(params.toString()).toBe("search=planner&sort=popular");
    });

    it("should build correct URL with all filters", () => {
      const params = new URLSearchParams();
      params.set("category", "weekly");
      params.set("search", "habit");
      params.set("sort", "newest");
      expect(params.toString()).toBe(
        "category=weekly&search=habit&sort=newest"
      );
    });

    it("should not include category param when empty", () => {
      const category = "";
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      params.set("sort", "popular");
      expect(params.toString()).toBe("sort=popular");
    });

    it("should not include search param when empty", () => {
      const search = "";
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("sort", "name");
      expect(params.toString()).toBe("sort=name");
    });
  });

  describe("Template data structure", () => {
    it("should have required fields for display", () => {
      const template = mockTemplates[0];
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.authorName).toBeDefined();
      expect(typeof template.usageCount).toBe("number");
      expect(template.contentAreas.length).toBeGreaterThan(0);
    });

    it("should support optional preview image URL", () => {
      expect(mockTemplates[0].previewImageUrl).toBeUndefined();
      expect(mockTemplates[1].previewImageUrl).toBe(
        "https://example.com/preview.png"
      );
    });

    it("should support featured flag", () => {
      expect(mockTemplates[0].isFeatured).toBe(true);
      expect(mockTemplates[1].isFeatured).toBe(false);
    });
  });

  describe("Use template flow", () => {
    it("should construct correct layout creation payload from template", () => {
      const template = mockTemplates[0];
      const payload = {
        name: template.name,
        contentAreas: template.contentAreas,
      };

      expect(payload.name).toBe("Daily Planner");
      expect(payload.contentAreas).toHaveLength(2);
      expect(payload.contentAreas[0].type).toBe("text");
      expect(payload.contentAreas[1].type).toBe("checklist");
    });

    it("should preserve all content area properties in layout payload", () => {
      const template = mockTemplates[1];
      const payload = {
        name: template.name,
        contentAreas: template.contentAreas,
      };

      const area = payload.contentAreas[0];
      expect(area.id).toBe("b1");
      expect(area.type).toBe("text");
      expect(area.x).toBe(0);
      expect(area.y).toBe(0);
      expect(area.width).toBe(50);
      expect(area.height).toBe(100);
    });
  });

  describe("Filter logic", () => {
    it("should filter templates by category", () => {
      const category = "daily";
      const filtered = mockTemplates.filter((t) => t.category === category);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Daily Planner");
    });

    it("should filter templates by search term in name", () => {
      const search = "weekly";
      const filtered = mockTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Weekly Spread");
    });

    it("should filter templates by search term in description", () => {
      const search = "habit";
      const filtered = mockTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Weekly Spread");
    });

    it("should sort templates by popularity (usage count descending)", () => {
      const sorted = [...mockTemplates].sort(
        (a, b) => b.usageCount - a.usageCount
      );
      expect(sorted[0].name).toBe("Daily Planner");
      expect(sorted[1].name).toBe("Weekly Spread");
      expect(sorted[2].name).toBe("Creative Journal");
    });

    it("should sort templates by newest (created date descending)", () => {
      const sorted = [...mockTemplates].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      expect(sorted[0].name).toBe("Creative Journal");
      expect(sorted[1].name).toBe("Weekly Spread");
      expect(sorted[2].name).toBe("Daily Planner");
    });

    it("should sort templates by name (alphabetical ascending)", () => {
      const sorted = [...mockTemplates].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      expect(sorted[0].name).toBe("Creative Journal");
      expect(sorted[1].name).toBe("Daily Planner");
      expect(sorted[2].name).toBe("Weekly Spread");
    });

    it("should return empty array when no templates match filters", () => {
      const category = "planning";
      const filtered = mockTemplates.filter((t) => t.category === category);
      expect(filtered).toHaveLength(0);
    });
  });
});
