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
  entries: { userId: "userId", pageId: "pageId", date: "date", id: "id" },
  collectionEntries: { entryId: "entryId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ type: "eq", a, b }),
  and: (...args: unknown[]) => ({ type: "and", args }),
  gte: (a: unknown, b: unknown) => ({ type: "gte", a, b }),
  lte: (a: unknown, b: unknown) => ({ type: "lte", a, b }),
}));

const mockGetAuthenticatedUser = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  assertOwnership: vi.fn(),
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

vi.mock("next/server", () => ({
  NextRequest: class {
    nextUrl: { searchParams: URLSearchParams };
    constructor(url: string) {
      this.nextUrl = { searchParams: new URL(url).searchParams };
    }
    json() {
      return Promise.resolve({});
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

import { GET, POST } from "./route";
import { NextRequest } from "next/server";

function createRequest(url: string, options?: { method?: string; body?: unknown }) {
  const req = {
    nextUrl: { searchParams: new URL(url, "http://localhost").searchParams },
    json: () => Promise.resolve(options?.body ?? {}),
  } as unknown as NextRequest;
  return req;
}

describe("GET /api/entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const req = createRequest("http://localhost/api/entries?pageId=page-1");
    const response = await GET(req);

    expect((response as any).status).toBe(401);
  });

  it("queries entries by pageId when provided", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const mockEntries = [
      { id: "entry-1", userId: "user-1", pageId: "page-1", type: "task", text: "Test" },
    ];
    mockFrom.mockReturnValue({ where: vi.fn().mockResolvedValue(mockEntries) });

    const req = createRequest("http://localhost/api/entries?pageId=page-1");
    const response = await GET(req);

    expect((response as any).status).toBe(200);
    expect((response as any).body).toEqual(mockEntries);
  });

  it("queries entries by date range when dateStart and dateEnd provided", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const mockEntries = [
      { id: "entry-2", userId: "user-1", type: "event", text: "Meeting", date: "2024-01-15" },
    ];
    mockFrom.mockReturnValue({ where: vi.fn().mockResolvedValue(mockEntries) });

    const req = createRequest("http://localhost/api/entries?dateStart=2024-01-01&dateEnd=2024-01-31");
    const response = await GET(req);

    expect((response as any).status).toBe(200);
    expect((response as any).body).toEqual(mockEntries);
  });

  it("returns all user entries when no filter provided", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const mockEntries = [
      { id: "entry-1", userId: "user-1", type: "task", text: "Task 1" },
      { id: "entry-2", userId: "user-1", type: "note", text: "Note 1" },
    ];
    mockFrom.mockReturnValue({ where: vi.fn().mockResolvedValue(mockEntries) });

    const req = createRequest("http://localhost/api/entries");
    const response = await GET(req);

    expect((response as any).status).toBe(200);
    expect((response as any).body).toEqual(mockEntries);
  });
});

describe("POST /api/entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: { body: { error: "Unauthorized" }, status: 401 },
    });

    const req = createRequest("http://localhost/api/entries", {
      body: { type: "task", text: "Test", pageId: "page-1" },
    });
    const response = await POST(req);

    expect((response as any).status).toBe(401);
  });

  it("returns 400 when type is invalid", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const req = createRequest("http://localhost/api/entries", {
      body: { type: "invalid", text: "Test", pageId: "page-1" },
    });
    const response = await POST(req);

    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("Entry type must be one of");
  });

  it("returns 400 when text is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const req = createRequest("http://localhost/api/entries", {
      body: { type: "task", text: "   ", pageId: "page-1" },
    });
    const response = await POST(req);

    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("Entry text is required");
  });

  it("returns 400 when text is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const req = createRequest("http://localhost/api/entries", {
      body: { type: "task", pageId: "page-1" },
    });
    const response = await POST(req);

    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("Entry text is required");
  });

  it("returns 400 when pageId is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const req = createRequest("http://localhost/api/entries", {
      body: { type: "task", text: "Test task" },
    });
    const response = await POST(req);

    expect((response as any).status).toBe(400);
    expect((response as any).body.error).toContain("pageId is required");
  });

  it("creates entry successfully with valid data", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const newEntry = {
      id: "entry-new",
      userId: "user-1",
      pageId: "page-1",
      type: "task",
      text: "New task",
      signifiers: [],
      state: "incomplete",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockValues.mockReturnValue({ returning: vi.fn().mockResolvedValue([newEntry]) });

    const req = createRequest("http://localhost/api/entries", {
      body: { type: "task", text: "New task", pageId: "page-1" },
    });
    const response = await POST(req);

    expect((response as any).status).toBe(201);
    expect((response as any).body).toEqual(newEntry);
  });

  it("sets default state to incomplete for tasks", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
      error: null,
    });

    const newEntry = {
      id: "entry-new",
      userId: "user-1",
      pageId: "page-1",
      type: "task",
      text: "Task",
      signifiers: [],
      state: "incomplete",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockValues.mockReturnValue({ returning: vi.fn().mockResolvedValue([newEntry]) });

    const req = createRequest("http://localhost/api/entries", {
      body: { type: "task", text: "Task", pageId: "page-1" },
    });
    const response = await POST(req);

    expect((response as any).status).toBe(201);
    expect((response as any).body.state).toBe("incomplete");
  });
});
