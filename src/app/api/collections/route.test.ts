import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: mockFrom }),
    insert: () => ({ values: mockValues }),
  },
}));

vi.mock("@/db/schema", () => ({
  collections: { id: "id", userId: "user_id", name: "name" },
  collectionEntries: {},
  entries: {},
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

import { GET, POST } from "./route";

describe("GET /api/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const result = await GET();
    expect((result as any).status).toBe(401);
  });

  it("returns user collections when authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const mockCollections = [
      { id: "col-1", userId: "user-1", name: "My Collection" },
      { id: "col-2", userId: "user-1", name: "Another Collection" },
    ];

    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(mockCollections);

    const result = await GET();
    expect((result as any).status).toBe(200);
    expect((result as any).body).toEqual(mockCollections);
  });
});

describe("POST /api/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const request = new Request("http://localhost/api/collections", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });

    const result = await POST(request as any);
    expect((result as any).status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const request = new Request("http://localhost/api/collections", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const result = await POST(request as any);
    expect((result as any).status).toBe(400);
    expect((result as any).body.error).toBe("Collection name is required");
  });

  it("returns 400 when name is empty string", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const request = new Request("http://localhost/api/collections", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
    });

    const result = await POST(request as any);
    expect((result as any).status).toBe(400);
    expect((result as any).body.error).toContain("Collection name is required");
  });

  it("returns 400 when name exceeds 100 characters", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const longName = "a".repeat(101);
    const request = new Request("http://localhost/api/collections", {
      method: "POST",
      body: JSON.stringify({ name: longName }),
    });

    const result = await POST(request as any);
    expect((result as any).status).toBe(400);
    expect((result as any).body.error).toContain("at most 100 characters");
  });

  it("creates collection with valid name", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const createdCollection = {
      id: "col-new",
      userId: "user-1",
      name: "Valid Collection",
      layoutId: null,
      isTemplate: false,
      templateType: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([createdCollection]);

    const request = new Request("http://localhost/api/collections", {
      method: "POST",
      body: JSON.stringify({ name: "Valid Collection" }),
    });

    const result = await POST(request as any);
    expect((result as any).status).toBe(201);
    expect((result as any).body.name).toBe("Valid Collection");
  });

  it("returns 400 for invalid JSON body", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const request = new Request("http://localhost/api/collections", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "text/plain" },
    });

    const result = await POST(request as any);
    expect((result as any).status).toBe(400);
    expect((result as any).body.error).toBe("Invalid JSON body");
  });
});
