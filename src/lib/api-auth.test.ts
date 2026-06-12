import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {},
}));

vi.mock("@/db/schema", () => ({
  users: {},
  accounts: {},
  verificationTokens: {},
}));

const mockGetServerSession = vi.fn();

vi.mock("next-auth", () => ({
  default: vi.fn(),
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(),
}));

vi.mock("next-auth/providers/github", () => ({
  default: vi.fn(),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(),
}));

vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

import { getAuthenticatedUser, assertOwnership } from "./api-auth";

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user when session is valid", async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.png",
      },
    });

    const result = await getAuthenticatedUser();

    expect(result.error).toBeNull();
    expect(result.user).toEqual({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });
  });

  it("returns 401 error when no session exists", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await getAuthenticatedUser();

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
    expect((result.error as any).status).toBe(401);
    expect((result.error as any).body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 error when session has no user id", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: "test@example.com" },
    });

    const result = await getAuthenticatedUser();

    expect(result.user).toBeNull();
    expect(result.error).toBeDefined();
    expect((result.error as any).status).toBe(401);
  });
});

describe("assertOwnership", () => {
  it("returns null when user owns the resource", () => {
    const result = assertOwnership("user-123", "user-123");
    expect(result).toBeNull();
  });

  it("returns 403 response when user does not own the resource", () => {
    const result = assertOwnership("user-123", "user-456");
    expect(result).toBeDefined();
    expect((result as any).status).toBe(403);
    expect((result as any).body).toEqual({ error: "Forbidden" });
  });
});
