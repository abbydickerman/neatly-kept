import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { LayoutTemplate } from "@/types/layout-plan";

// Mock the layout template service
const mockGetAllTemplates = vi.fn();
const mockGetTemplatesByCategory = vi.fn();
const mockSearchTemplates = vi.fn();

vi.mock("@/services/layout-template-service", () => ({
  layoutTemplateService: {
    getAllTemplates: () => mockGetAllTemplates(),
    getTemplatesByCategory: (category: string) =>
      mockGetTemplatesByCategory(category),
    searchTemplates: (term: string) => mockSearchTemplates(term),
  },
}));

import { GET } from "./route";

const mockTemplate = (
  overrides: Partial<LayoutTemplate> = {}
): LayoutTemplate => ({
  id: "template-1",
  name: "Classic Weekly Spread",
  description: "A classic weekly spread layout",
  category: "weekly",
  previewImageUrl: undefined,
  isBuiltIn: true,
  structure: { areas: [] },
  injectionZones: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

describe("GET /api/layout-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all templates when no query params are provided", async () => {
    const templates = [
      mockTemplate({ id: "t-1", name: "Classic Weekly", category: "weekly" }),
      mockTemplate({ id: "t-2", name: "Monthly Grid", category: "monthly" }),
    ];
    mockGetAllTemplates.mockResolvedValue(templates);

    const request = new NextRequest("http://localhost/api/layout-templates");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(mockGetAllTemplates).toHaveBeenCalled();
  });

  it("filters by category when category param is provided", async () => {
    const templates = [
      mockTemplate({ id: "t-1", name: "Classic Weekly", category: "weekly" }),
    ];
    mockGetTemplatesByCategory.mockResolvedValue(templates);

    const request = new NextRequest(
      "http://localhost/api/layout-templates?category=weekly"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].category).toBe("weekly");
    expect(mockGetTemplatesByCategory).toHaveBeenCalledWith("weekly");
  });

  it("searches by name when search param is provided", async () => {
    const templates = [
      mockTemplate({ id: "t-1", name: "Classic Weekly" }),
    ];
    mockSearchTemplates.mockResolvedValue(templates);

    const request = new NextRequest(
      "http://localhost/api/layout-templates?search=classic"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Classic Weekly");
    expect(mockSearchTemplates).toHaveBeenCalledWith("classic");
  });

  it("applies both search and category filter when both params are provided", async () => {
    const templates = [
      mockTemplate({ id: "t-1", name: "Classic Weekly", category: "weekly" }),
      mockTemplate({ id: "t-2", name: "Classic Monthly", category: "monthly" }),
    ];
    mockSearchTemplates.mockResolvedValue(templates);

    const request = new NextRequest(
      "http://localhost/api/layout-templates?search=classic&category=weekly"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].category).toBe("weekly");
    expect(mockSearchTemplates).toHaveBeenCalledWith("classic");
  });

  it("returns 400 for invalid category", async () => {
    const request = new NextRequest(
      "http://localhost/api/layout-templates?category=invalid"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid category");
  });

  it("returns empty array when no templates match", async () => {
    mockSearchTemplates.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost/api/layout-templates?search=nonexistent"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(0);
  });

  it("returns 500 on service error", async () => {
    mockGetAllTemplates.mockRejectedValue(new Error("DB connection failed"));

    const request = new NextRequest("http://localhost/api/layout-templates");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
