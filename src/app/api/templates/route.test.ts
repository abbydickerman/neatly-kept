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
    status: "status",
    category: "category",
    name: "name",
    description: "description",
    usageCount: "usage_count",
    createdAt: "created_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", conditions: args })),
  ilike: vi.fn((a, b) => ({ type: "ilike", a, b })),
  or: vi.fn((...args) => ({ type: "or", conditions: args })),
  desc: vi.fn((a) => ({ type: "desc", field: a })),
  asc: vi.fn((a) => ({ type: "asc", field: a })),
}));

import { GET } from "./route";

describe("GET /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns published templates with default sort (popular)", async () => {
    const templates = [
      {
        id: "t-1",
        name: "Daily Planner",
        description: "A daily planning template",
        category: "daily",
        tags: ["planning"],
        usageCount: 100,
        status: "published",
      },
      {
        id: "t-2",
        name: "Weekly Spread",
        description: "A weekly spread template",
        category: "weekly",
        tags: ["weekly"],
        usageCount: 50,
        status: "published",
      },
    ];

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => templates,
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Daily Planner");
  });

  it("filters by category", async () => {
    const templates = [
      {
        id: "t-1",
        name: "Daily Planner",
        category: "daily",
        status: "published",
      },
    ];

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => templates,
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates?category=daily");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].category).toBe("daily");
  });

  it("filters by search term", async () => {
    const templates = [
      {
        id: "t-1",
        name: "Habit Tracker",
        description: "Track your daily habits",
        category: "tracker",
        status: "published",
      },
    ];

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => templates,
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates?search=habit");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Habit Tracker");
  });

  it("sorts by newest", async () => {
    const templates = [
      { id: "t-2", name: "New Template", createdAt: "2024-02-01" },
      { id: "t-1", name: "Old Template", createdAt: "2024-01-01" },
    ];

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => templates,
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates?sort=newest");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
  });

  it("sorts by name", async () => {
    const templates = [
      { id: "t-1", name: "Alpha Template" },
      { id: "t-2", name: "Beta Template" },
    ];

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => templates,
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates?sort=name");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
  });

  it("returns empty array when no templates match", async () => {
    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => [],
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates?category=nonexistent");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(0);
  });

  it("handles combined filters (category + search + sort)", async () => {
    const templates = [
      {
        id: "t-1",
        name: "Daily Focus",
        category: "daily",
        description: "Focus on daily tasks",
        status: "published",
      },
    ];

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => templates,
        }),
      }),
    });

    const request = new NextRequest(
      "http://localhost/api/templates?category=daily&search=focus&sort=name"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });

  it("returns 500 on database error", async () => {
    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => {
            throw new Error("DB connection failed");
          },
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/templates");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
