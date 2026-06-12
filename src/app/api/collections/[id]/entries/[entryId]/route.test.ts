import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockFrom = vi.fn();
const mockDeleteWhere = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
    delete: () => ({ where: (...args: unknown[]) => mockDeleteWhere(...args) }),
  },
}));

vi.mock("@/db/schema", () => ({
  collections: { id: "id", userId: "user_id" },
  collectionEntries: { collectionId: "collection_id", entryId: "entry_id" },
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

import { DELETE } from "./route";

describe("DELETE /api/collections/:id/entries/:entryId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const request = new Request(
      "http://localhost/api/collections/col-1/entries/entry-1",
      { method: "DELETE" }
    );

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-1", entryId: "entry-1" }),
    });
    expect((result as any).status).toBe(401);
  });

  it("returns 404 when collection does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection not found
    mockFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

    const request = new Request(
      "http://localhost/api/collections/col-99/entries/entry-1",
      { method: "DELETE" }
    );

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-99", entryId: "entry-1" }),
    });
    expect((result as any).status).toBe(404);
    expect((result as any).body.error).toBe("Collection not found");
  });

  it("returns 403 when user does not own collection", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection belongs to another user
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-2" }]),
    });

    const request = new Request(
      "http://localhost/api/collections/col-1/entries/entry-1",
      { method: "DELETE" }
    );

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-1", entryId: "entry-1" }),
    });
    expect((result as any).status).toBe(403);
  });

  it("returns 404 when entry is not in collection", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection exists and belongs to user
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-1" }]),
    });
    // Link not found
    mockFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

    const request = new Request(
      "http://localhost/api/collections/col-1/entries/entry-99",
      { method: "DELETE" }
    );

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-1", entryId: "entry-99" }),
    });
    expect((result as any).status).toBe(404);
    expect((result as any).body.error).toBe("Entry is not in this collection");
  });

  it("removes entry from collection successfully without deleting entry", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection exists and belongs to user
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-1" }]),
    });
    // Link exists
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ collectionId: "col-1", entryId: "entry-1" }]),
    });

    mockDeleteWhere.mockResolvedValue(undefined);

    const request = new Request(
      "http://localhost/api/collections/col-1/entries/entry-1",
      { method: "DELETE" }
    );

    const result = await DELETE(request as any, {
      params: Promise.resolve({ id: "col-1", entryId: "entry-1" }),
    });
    expect((result as any).status).toBe(200);
    expect((result as any).body.success).toBe(true);
  });
});
