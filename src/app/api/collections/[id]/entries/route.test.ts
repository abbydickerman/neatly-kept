import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
    insert: () => ({ values: (...args: unknown[]) => mockValues(...args) }),
  },
}));

vi.mock("@/db/schema", () => ({
  collections: { id: "id", userId: "user_id" },
  collectionEntries: { collectionId: "collection_id", entryId: "entry_id" },
  entries: { id: "id", userId: "user_id" },
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

import { POST } from "./route";

describe("POST /api/collections/:id/entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const request = new Request("http://localhost/api/collections/col-1/entries", {
      method: "POST",
      body: JSON.stringify({ entryId: "entry-1" }),
    });

    const result = await POST(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(401);
  });

  it("returns 404 when collection does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // First call: collection lookup returns empty
    mockFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

    const request = new Request("http://localhost/api/collections/col-99/entries", {
      method: "POST",
      body: JSON.stringify({ entryId: "entry-1" }),
    });

    const result = await POST(request as any, {
      params: Promise.resolve({ id: "col-99" }),
    });
    expect((result as any).status).toBe(404);
    expect((result as any).body.error).toBe("Collection not found");
  });

  it("returns 400 when entryId is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection exists
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-1" }]),
    });

    const request = new Request("http://localhost/api/collections/col-1/entries", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const result = await POST(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(400);
    expect((result as any).body.error).toBe("entryId is required");
  });

  it("returns 404 when entry does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection exists
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-1" }]),
    });
    // Entry lookup returns empty
    mockFrom.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

    const request = new Request("http://localhost/api/collections/col-1/entries", {
      method: "POST",
      body: JSON.stringify({ entryId: "entry-99" }),
    });

    const result = await POST(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(404);
    expect((result as any).body.error).toBe("Entry not found");
  });

  it("returns 403 when entry belongs to another user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection exists and belongs to user
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-1" }]),
    });
    // Entry exists but belongs to another user
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "entry-1", userId: "user-2" }]),
    });

    const request = new Request("http://localhost/api/collections/col-1/entries", {
      method: "POST",
      body: JSON.stringify({ entryId: "entry-1" }),
    });

    const result = await POST(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(403);
  });

  it("returns 409 when entry is already in collection", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection exists
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-1" }]),
    });
    // Entry exists and belongs to user
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "entry-1", userId: "user-1" }]),
    });
    // Existing link found
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ collectionId: "col-1", entryId: "entry-1" }]),
    });

    const request = new Request("http://localhost/api/collections/col-1/entries", {
      method: "POST",
      body: JSON.stringify({ entryId: "entry-1" }),
    });

    const result = await POST(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(409);
    expect((result as any).body.error).toBe("Entry is already in this collection");
  });

  it("returns 422 when entry is already in 10 collections", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection exists
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-1" }]),
    });
    // Entry exists and belongs to user
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "entry-1", userId: "user-1" }]),
    });
    // No existing link
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([]),
    });
    // Entry already in 10 collections
    const tenLinks = Array.from({ length: 10 }, (_, i) => ({
      collectionId: `col-${i}`,
      entryId: "entry-1",
    }));
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue(tenLinks),
    });

    const request = new Request("http://localhost/api/collections/col-1/entries", {
      method: "POST",
      body: JSON.stringify({ entryId: "entry-1" }),
    });

    const result = await POST(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(422);
    expect((result as any).body.error).toContain("more than 10 collections");
  });

  it("adds entry to collection successfully", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    // Collection exists
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "col-1", userId: "user-1" }]),
    });
    // Entry exists and belongs to user
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ id: "entry-1", userId: "user-1" }]),
    });
    // No existing link
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([]),
    });
    // Entry in fewer than 10 collections
    mockFrom.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue([{ collectionId: "col-2", entryId: "entry-1" }]),
    });

    const createdLink = { collectionId: "col-1", entryId: "entry-1", addedAt: new Date() };
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([createdLink]);

    const request = new Request("http://localhost/api/collections/col-1/entries", {
      method: "POST",
      body: JSON.stringify({ entryId: "entry-1" }),
    });

    const result = await POST(request as any, {
      params: Promise.resolve({ id: "col-1" }),
    });
    expect((result as any).status).toBe(201);
    expect((result as any).body.collectionId).toBe("col-1");
    expect((result as any).body.entryId).toBe("entry-1");
  });
});
