import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
const mockGetAuthenticatedUser = vi.fn();
const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

vi.mock("@/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };
  return {
    db: {
      select: () => {
        mockDbSelect();
        return selectChain;
      },
      insert: () => {
        mockDbInsert();
        return insertChain;
      },
      _selectChain: selectChain,
      _insertChain: insertChain,
    },
  };
});

vi.mock("@/db/schema", () => ({
  layouts: { userId: "userId", id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      json: async () => body,
      body,
      status: init?.status ?? 200,
    }),
  },
}));

vi.mock("@/services/layout-service", () => ({
  getBuiltInLayouts: () => [
    {
      id: "builtin-daily-log",
      userId: "system",
      name: "Daily Log",
      isBuiltIn: true,
      contentAreas: [
        { id: "daily-header", type: "text", x: 0, y: 0, width: 100, height: 10 },
      ],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ],
}));

import { GET, POST } from "./route";
import { db } from "@/db";

describe("GET /api/layouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const response = await GET();
    expect((response as any).status).toBe(401);
  });

  it("returns built-in and custom layouts for authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const customLayout = {
      id: "custom-1",
      userId: "user-1",
      name: "My Layout",
      isBuiltIn: false,
      contentAreas: [{ id: "area-1", type: "text", x: 0, y: 0, width: 50, height: 50 }],
      createdAt: new Date("2024-06-01"),
      updatedAt: new Date("2024-06-01"),
    };

    (db as any)._selectChain.where.mockResolvedValue([customLayout]);

    const response = await GET();
    const body = (response as any).body;

    expect((response as any).status).toBe(200);
    expect(body).toHaveLength(2); // 1 built-in + 1 custom
    expect(body[0].name).toBe("Daily Log");
    expect(body[0].isBuiltIn).toBe(true);
    expect(body[1].name).toBe("My Layout");
    expect(body[1].isBuiltIn).toBe(false);
  });
});

describe("POST /api/layouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const request = new Request("http://localhost/api/layouts", {
      method: "POST",
      body: JSON.stringify({ name: "Test", contentAreas: [] }),
    });

    const response = await POST(request);
    expect((response as any).status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const request = new Request("http://localhost/api/layouts", {
      method: "POST",
      body: JSON.stringify({ contentAreas: [] }),
    });

    const response = await POST(request);
    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toBe("Layout name is required");
  });

  it("returns 400 when name exceeds 50 characters", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const request = new Request("http://localhost/api/layouts", {
      method: "POST",
      body: JSON.stringify({
        name: "A".repeat(51),
        contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
      }),
    });

    const response = await POST(request);
    expect((response as any).status).toBe(400);
  });

  it("returns 400 when content areas are missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const request = new Request("http://localhost/api/layouts", {
      method: "POST",
      body: JSON.stringify({ name: "Valid Name" }),
    });

    const response = await POST(request);
    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toBe(
      "Content areas are required and must be an array"
    );
  });

  it("returns 409 when name duplicates an existing layout", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // First select call returns existing custom layouts with same name
    (db as any)._selectChain.where.mockResolvedValue([
      {
        id: "existing-1",
        userId: "user-1",
        name: "My Layout",
        isBuiltIn: false,
        contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = new Request("http://localhost/api/layouts", {
      method: "POST",
      body: JSON.stringify({
        name: "My Layout",
        contentAreas: [{ id: "b", type: "text", x: 0, y: 0, width: 50, height: 50 }],
      }),
    });

    const response = await POST(request);
    expect((response as any).status).toBe(409);
    expect((response as any).body.error).toContain("already exists");
  });

  it("returns 400 when content area has invalid dimensions", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([]);

    const request = new Request("http://localhost/api/layouts", {
      method: "POST",
      body: JSON.stringify({
        name: "Valid Name",
        contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 3, height: 50 }],
      }),
    });

    const response = await POST(request);
    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("width");
  });

  it("returns 201 with created layout on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([]);

    const contentAreas = [
      { id: "area-1", type: "text", x: 0, y: 0, width: 50, height: 50 },
    ];

    const insertedRow = {
      id: "new-layout-id",
      userId: "user-1",
      name: "New Layout",
      isBuiltIn: false,
      contentAreas,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (db as any)._insertChain.returning.mockResolvedValue([insertedRow]);

    const request = new Request("http://localhost/api/layouts", {
      method: "POST",
      body: JSON.stringify({
        name: "New Layout",
        contentAreas,
      }),
    });

    const response = await POST(request);
    expect((response as any).status).toBe(201);
    expect((response as any).body.name).toBe("New Layout");
    expect((response as any).body.isBuiltIn).toBe(false);
  });

  it("returns 400 for invalid JSON body", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const request = new Request("http://localhost/api/layouts", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toBe("Invalid JSON body");
  });
});
