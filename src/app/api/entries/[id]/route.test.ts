import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db
const mockWhere = vi.fn();
const mockSet = vi.fn();
const mockReturning = vi.fn();
const mockDeleteWhere = vi.fn();

const mockDb = {
  select: () => ({ from: () => ({ where: mockWhere }) }),
  update: () => ({ set: mockSet }),
  delete: () => ({ where: mockDeleteWhere }),
  insert: () => ({ values: vi.fn().mockReturnValue({ returning: vi.fn() }) }),
};

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockWhere }) }),
    update: () => ({ set: mockSet }),
    delete: () => ({ where: mockDeleteWhere }),
  },
}));

vi.mock("@/db/schema", () => ({
  entries: { id: "id", userId: "userId", pageId: "pageId" },
  collectionEntries: { entryId: "entryId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ type: "eq", a, b }),
  and: (...args: unknown[]) => ({ type: "and", args }),
}));

const mockGetAuthenticatedUser = vi.fn();
const mockAssertOwnership = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  assertOwnership: (...args: unknown[]) => mockAssertOwnership(...args),
}));

vi.mock("@/services/entry-service", () => ({
  validateEntryType: (type: unknown) => {
    const valid = ["task", "event", "note"].includes(type as string);
    return {
      valid,
      errors: valid ? [] : ["Entry type must be one of: task, event, note"],
    };
  },
  validateEntryText: (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return { valid: false, errors: ["Entry text is required"] };
    if (trimmed.length > 500) return { valid: false, errors: ["Entry text must be at most 500 characters"] };
    return { valid: true, errors: [] };
  },
}));

vi.mock("@/services/task-state-machine", () => ({
  taskStateMachine: {
    transition: (currentState: string, action: string) => {
      if (currentState !== "incomplete") return null;
      const map: Record<string, string> = {
        complete: "complete",
        migrate: "migrated",
        cancel: "cancelled",
      };
      return map[action] ?? null;
    },
  },
}));

vi.mock("next/server", () => ({
  NextRequest: class {
    nextUrl: { searchParams: URLSearchParams };
    private _body: unknown;
    constructor(url: string, options?: { body?: unknown }) {
      this.nextUrl = { searchParams: new URL(url).searchParams };
      this._body = options?.body;
    }
    json() {
      return Promise.resolve(this._body ?? {});
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

import { PUT, DELETE } from "./route";
import { NextRequest } from "next/server";

function createRequest(url: string, options?: { body?: unknown }) {
  return {
    nextUrl: { searchParams: new URL(url, "http://localhost").searchParams },
    json: () => Promise.resolve(options?.body ?? {}),
  } as unknown as NextRequest;
}

describe("PUT /api/entries/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertOwnership.mockReturnValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const req = createRequest("http://localhost/api/entries/entry-1", {
      body: { text: "Updated" },
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(401);
  });

  it("returns 404 when entry not found", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([]);

    const req = createRequest("http://localhost/api/entries/nonexistent", {
      body: { text: "Updated" },
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect((response as any).status).toBe(404);
    expect((response as any).body.error).toBe("Entry not found");
  });

  it("returns 403 when user does not own the entry", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([
      { id: "entry-1", userId: "user-2", type: "task", text: "Test", state: "incomplete" },
    ]);
    mockAssertOwnership.mockReturnValue({
      body: { error: "Forbidden" },
      status: 403,
    });

    const req = createRequest("http://localhost/api/entries/entry-1", {
      body: { text: "Updated" },
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(403);
    expect((response as any).body.error).toBe("Forbidden");
  });

  it("returns 400 for invalid state transition", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([
      { id: "entry-1", userId: "user-1", type: "task", text: "Test", state: "complete" },
    ]);

    const req = createRequest("http://localhost/api/entries/entry-1", {
      body: { state: "cancelled" },
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("Invalid state transition");
  });

  it("returns 400 when state transition applied to non-task", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([
      { id: "entry-1", userId: "user-1", type: "note", text: "Test", state: null },
    ]);

    const req = createRequest("http://localhost/api/entries/entry-1", {
      body: { state: "complete" },
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("State transitions are only valid for tasks");
  });

  it("updates entry successfully with valid data", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([
      { id: "entry-1", userId: "user-1", type: "task", text: "Original", state: "incomplete" },
    ]);

    const updatedEntry = {
      id: "entry-1",
      userId: "user-1",
      type: "task",
      text: "Updated text",
      state: "incomplete",
      updatedAt: new Date(),
    };

    mockSet.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedEntry]),
      }),
    });

    const req = createRequest("http://localhost/api/entries/entry-1", {
      body: { text: "Updated text" },
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(200);
    expect((response as any).body).toEqual(updatedEntry);
  });

  it("allows valid state transition from incomplete to complete", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([
      { id: "entry-1", userId: "user-1", type: "task", text: "Test", state: "incomplete" },
    ]);

    const updatedEntry = {
      id: "entry-1",
      userId: "user-1",
      type: "task",
      text: "Test",
      state: "complete",
      updatedAt: new Date(),
    };

    mockSet.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedEntry]),
      }),
    });

    const req = createRequest("http://localhost/api/entries/entry-1", {
      body: { state: "complete" },
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(200);
    expect((response as any).body.state).toBe("complete");
  });

  it("returns 400 for invalid text", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([
      { id: "entry-1", userId: "user-1", type: "task", text: "Test", state: "incomplete" },
    ]);

    const req = createRequest("http://localhost/api/entries/entry-1", {
      body: { text: "   " },
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("Entry text is required");
  });
});

describe("DELETE /api/entries/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertOwnership.mockReturnValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const req = createRequest("http://localhost/api/entries/entry-1");
    const response = await DELETE(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(401);
  });

  it("returns 404 when entry not found", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([]);

    const req = createRequest("http://localhost/api/entries/nonexistent");
    const response = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });

    expect((response as any).status).toBe(404);
  });

  it("returns 403 when user does not own the entry", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([
      { id: "entry-1", userId: "user-2", type: "task", text: "Test" },
    ]);
    mockAssertOwnership.mockReturnValue({
      body: { error: "Forbidden" },
      status: 403,
    });

    const req = createRequest("http://localhost/api/entries/entry-1");
    const response = await DELETE(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(403);
  });

  it("deletes entry and cascades to collection_entries", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });
    mockWhere.mockResolvedValue([
      { id: "entry-1", userId: "user-1", type: "task", text: "Test" },
    ]);
    mockDeleteWhere.mockResolvedValue(undefined);

    const req = createRequest("http://localhost/api/entries/entry-1");
    const response = await DELETE(req, { params: Promise.resolve({ id: "entry-1" }) });

    expect((response as any).status).toBe(200);
    expect((response as any).body).toEqual({ success: true });
    // Verify delete was called (for collection_entries and entries)
    expect(mockDeleteWhere).toHaveBeenCalledTimes(2);
  });
});
