import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
const mockGetAuthenticatedUser = vi.fn();
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

vi.mock("@/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };
  const deleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  return {
    db: {
      select: () => {
        mockDbSelect();
        return selectChain;
      },
      update: () => {
        mockDbUpdate();
        return updateChain;
      },
      delete: () => {
        mockDbDelete();
        return deleteChain;
      },
      _selectChain: selectChain,
      _updateChain: updateChain,
      _deleteChain: deleteChain,
    },
  };
});

vi.mock("@/db/schema", () => ({
  layouts: { userId: "userId", id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args) => ({ type: "and", conditions: args })),
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

import { PUT, DELETE } from "./route";
import { db } from "@/db";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PUT /api/layouts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const request = new Request("http://localhost/api/layouts/layout-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });

    const response = await PUT(request, makeParams("layout-1"));
    expect((response as any).status).toBe(401);
  });

  it("returns 404 when layout does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([]);

    const request = new Request("http://localhost/api/layouts/nonexistent", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });

    const response = await PUT(request, makeParams("nonexistent"));
    expect((response as any).status).toBe(404);
    expect((response as any).body.error).toBe("Layout not found");
  });

  it("returns 403 when trying to modify a built-in layout", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([
      {
        id: "builtin-1",
        userId: "user-1",
        name: "Built-in",
        isBuiltIn: true,
        contentAreas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = new Request("http://localhost/api/layouts/builtin-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Hacked" }),
    });

    const response = await PUT(request, makeParams("builtin-1"));
    expect((response as any).status).toBe(403);
    expect((response as any).body.error).toBe("Cannot modify a built-in layout");
  });

  it("returns 400 when name is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([
      {
        id: "layout-1",
        userId: "user-1",
        name: "Original",
        isBuiltIn: false,
        contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = new Request("http://localhost/api/layouts/layout-1", {
      method: "PUT",
      body: JSON.stringify({ name: "   " }),
    });

    const response = await PUT(request, makeParams("layout-1"));
    expect((response as any).status).toBe(400);
  });

  it("returns 409 when name conflicts with existing layout", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // First call: find existing layout by id
    // Second call: get all user layouts for uniqueness check
    (db as any)._selectChain.where
      .mockResolvedValueOnce([
        {
          id: "layout-1",
          userId: "user-1",
          name: "Original",
          isBuiltIn: false,
          contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "layout-1",
          userId: "user-1",
          name: "Original",
          isBuiltIn: false,
          contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "layout-2",
          userId: "user-1",
          name: "Other Layout",
          isBuiltIn: false,
          contentAreas: [{ id: "b", type: "text", x: 0, y: 0, width: 50, height: 50 }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

    const request = new Request("http://localhost/api/layouts/layout-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Other Layout" }),
    });

    const response = await PUT(request, makeParams("layout-1"));
    expect((response as any).status).toBe(409);
    expect((response as any).body.error).toContain("already exists");
  });

  it("returns 400 when content areas have invalid dimensions", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([
      {
        id: "layout-1",
        userId: "user-1",
        name: "Original",
        isBuiltIn: false,
        contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = new Request("http://localhost/api/layouts/layout-1", {
      method: "PUT",
      body: JSON.stringify({
        contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 2, height: 50 }],
      }),
    });

    const response = await PUT(request, makeParams("layout-1"));
    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("width");
  });

  it("returns 200 with updated layout on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const existingLayout = {
      id: "layout-1",
      userId: "user-1",
      name: "Original",
      isBuiltIn: false,
      contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // First call: find existing layout
    // Second call: get all user layouts for uniqueness check
    (db as any)._selectChain.where
      .mockResolvedValueOnce([existingLayout])
      .mockResolvedValueOnce([existingLayout]);

    const updatedLayout = {
      ...existingLayout,
      name: "Updated Name",
      updatedAt: new Date(),
    };

    (db as any)._updateChain.returning.mockResolvedValue([updatedLayout]);

    const request = new Request("http://localhost/api/layouts/layout-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Name" }),
    });

    const response = await PUT(request, makeParams("layout-1"));
    expect((response as any).status).toBe(200);
    expect((response as any).body.name).toBe("Updated Name");
  });

  it("returns 400 for invalid JSON body", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([
      {
        id: "layout-1",
        userId: "user-1",
        name: "Original",
        isBuiltIn: false,
        contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = new Request("http://localhost/api/layouts/layout-1", {
      method: "PUT",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request, makeParams("layout-1"));
    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toBe("Invalid JSON body");
  });
});

describe("DELETE /api/layouts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const request = new Request("http://localhost/api/layouts/layout-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, makeParams("layout-1"));
    expect((response as any).status).toBe(401);
  });

  it("returns 404 when layout does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([]);

    const request = new Request("http://localhost/api/layouts/nonexistent", {
      method: "DELETE",
    });

    const response = await DELETE(request, makeParams("nonexistent"));
    expect((response as any).status).toBe(404);
    expect((response as any).body.error).toBe("Layout not found");
  });

  it("returns 403 when trying to delete a built-in layout", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([
      {
        id: "builtin-1",
        userId: "user-1",
        name: "Built-in",
        isBuiltIn: true,
        contentAreas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = new Request("http://localhost/api/layouts/builtin-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, makeParams("builtin-1"));
    expect((response as any).status).toBe(403);
    expect((response as any).body.error).toBe("Cannot delete a built-in layout");
  });

  it("returns 200 on successful deletion", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    (db as any)._selectChain.where.mockResolvedValue([
      {
        id: "layout-1",
        userId: "user-1",
        name: "Custom Layout",
        isBuiltIn: false,
        contentAreas: [{ id: "a", type: "text", x: 0, y: 0, width: 50, height: 50 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const request = new Request("http://localhost/api/layouts/layout-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, makeParams("layout-1"));
    expect((response as any).status).toBe(200);
    expect((response as any).body.success).toBe(true);
  });
});
