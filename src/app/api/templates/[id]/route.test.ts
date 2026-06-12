import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
const mockDbSelect = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => mockDbSelect(),
  },
}));

vi.mock("@/db/schema", () => ({
  galleryTemplates: {
    id: "id",
    status: "status",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", conditions: args })),
}));

import { GET } from "./route";

describe("GET /api/templates/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a published template by ID", async () => {
    const template = {
      id: "template-1",
      name: "Daily Planner",
      description: "A daily planning template",
      category: "daily",
      tags: ["planning", "daily"],
      contentAreas: [{ id: "area-1", type: "text", x: 0, y: 0, width: 100, height: 50 }],
      previewImageUrl: null,
      authorId: "author-1",
      authorName: "Test Author",
      usageCount: 42,
      isFeatured: true,
      status: "published",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [template],
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates/template-1");
    const response = await GET(request, { params: Promise.resolve({ id: "template-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("template-1");
    expect(data.name).toBe("Daily Planner");
    expect(data.category).toBe("daily");
    expect(data.usageCount).toBe(42);
  });

  it("returns 404 when template is not found", async () => {
    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates/nonexistent");
    const response = await GET(request, { params: Promise.resolve({ id: "nonexistent" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Template not found");
  });

  it("returns 404 for non-published templates", async () => {
    // The query filters by status='published', so a draft template won't be returned
    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates/draft-template");
    const response = await GET(request, { params: Promise.resolve({ id: "draft-template" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Template not found");
  });

  it("returns 500 on database error", async () => {
    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => {
            throw new Error("DB connection failed");
          },
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates/template-1");
    const response = await GET(request, { params: Promise.resolve({ id: "template-1" }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("does not require authentication (public endpoint)", async () => {
    const template = {
      id: "template-1",
      name: "Public Template",
      status: "published",
    };

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [template],
        }),
      }),
    });

    // No auth mock needed — the route doesn't call getAuthenticatedUser
    const request = new NextRequest("http://localhost/api/templates/template-1");
    const response = await GET(request, { params: Promise.resolve({ id: "template-1" }) });

    expect(response.status).toBe(200);
  });
});
