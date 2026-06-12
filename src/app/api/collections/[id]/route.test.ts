import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockSet = vi.fn();
const mockUpdateWhere = vi.fn();
const mockReturning = vi.fn();
const mockDeleteWhere = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
    update: () => ({ set: (...args: unknown[]) => mockSet(...args) }),
    delete: () => ({ where: (...args: unknown[]) => mockDeleteWhere(...args) }),
  },
}));

vi.mock("@/db/schema", () => ({
  collections: { id: "id", userId: "user_id", name: "name" },
  collectionEntries: { collectionId: "collection_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
}));

const mockGetAuthenticatedUser = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  assertOwnership: (authId: string, resourceId: string) =>
    authId !== resourceId
      ? { body: { error: "Forbidden" }, status: 403 }
      : null,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { PUT, DELETE } from "./route";

describe("PUT /api/collections/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const request = new Request("http://localhost/api/collections/col-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });

    const result = await PUT(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(401);
  });

  it("returns 404 when collection does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([]);

    const request = new Request("http://localhost/api/collections/col-99", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });

    const result = await PUT(request as any, {
      params: Promise.resolve({ id: "col-99" }),
    });
    expect((result as any).status).toBe(404);
  });

  it("returns 403 when user does not own collection", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ id: "col-1", userId: "user-2", name: "Other" }]);

    const request = new Request("http://localhost/api/collections/col-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });

    const result = await PUT(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(403);
  });

  it("returns 400 when updated name is invalid", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ id: "col-1", userId: "user-1", name: "Old Name" }]);

    const request = new Request("http://localhost/api/collections/col-1", {
      method: "PUT",
      body: JSON.stringify({ name: "" }),
    });

    const result = await PUT(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(400);
  });

  it("updates collection successfully", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ id: "col-1", userId: "user-1", name: "Old Name" }]);

    const updated = { id: "col-1", userId: "user-1", name: "New Name" };
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([updated]);

    const request = new Request("http://localhost/api/collections/col-1", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });

    const result = await PUT(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(200);
    expect((result as any).body.name).toBe("New Name");
  });
});

describe("DELETE /api/collections/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const request = new Request("http://localhost/api/collections/col-1", {
      method: "DELETE",
    });

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(401);
  });

  it("returns 404 when collection does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([]);

    const request = new Request("http://localhost/api/collections/col-99", {
      method: "DELETE",
    });

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-99" }),
    });
    expect((result as any).status).toBe(404);
  });

  it("returns 403 when user does not own collection", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ id: "col-1", userId: "user-2", name: "Other" }]);

    const request = new Request("http://localhost/api/collections/col-1", {
      method: "DELETE",
    });

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(403);
  });

  it("deletes collection successfully", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ id: "col-1", userId: "user-1", name: "Mine" }]);

    mockDeleteWhere.mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/collections/col-1", {
      method: "DELETE",
    });

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(200);
    expect((result as any).body.success).toBe(true);
  });
});
