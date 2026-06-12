import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
const mockGetAuthenticatedUser = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => mockDbSelect(),
    insert: () => mockDbInsert(),
    update: () => mockDbUpdate(),
  },
}));

vi.mock("@/db/schema", () => ({
  calendarConfigs: { userId: "user_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
}));

vi.mock("@/services/calendar-config-service", () => ({
  clampCalendarSizing: vi.fn((sizing) => ({
    areas: sizing.areas.map((area: { id: string; widthPercent: number; heightPercent: number }) => ({
      id: area.id,
      widthPercent: Math.min(90, Math.max(10, area.widthPercent)),
      heightPercent: Math.min(90, Math.max(10, area.heightPercent)),
    })),
  })),
  validateWeekStartDay: vi.fn((day) =>
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(day)
  ),
  validateColorTheme: vi.fn((theme) => typeof theme === "string" && theme.trim().length > 0),
  validateLayoutDensity: vi.fn((density) =>
    ["compact", "standard", "expanded"].includes(density)
  ),
  validateVisibleEntryTypes: vi.fn((types) =>
    Array.isArray(types) && types.every((t: string) => ["task", "event", "note"].includes(t))
  ),
}));

import { GET, PUT } from "./route";

describe("GET /api/calendar-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns existing config for authenticated user", async () => {
    const existingConfig = {
      id: "config-1",
      userId: "user-1",
      weekStartDay: "monday",
      colorTheme: "ocean",
      layoutDensity: "compact",
      visibleEntryTypes: ["task", "event"],
      customSizing: null,
    };

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [existingConfig],
        }),
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.weekStartDay).toBe("monday");
    expect(data.colorTheme).toBe("ocean");
  });

  it("creates default config when none exists", async () => {
    const defaultConfig = {
      id: "config-new",
      userId: "user-1",
      weekStartDay: "monday",
      colorTheme: "default",
      layoutDensity: "standard",
      visibleEntryTypes: ["task", "event", "note"],
      customSizing: null,
    };

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    });

    mockDbInsert.mockReturnValue({
      values: () => ({
        returning: () => [defaultConfig],
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.weekStartDay).toBe("monday");
    expect(data.colorTheme).toBe("default");
    expect(data.layoutDensity).toBe("standard");
  });
});

describe("PUT /api/calendar-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: null,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const request = new NextRequest("http://localhost/api/calendar-config", {
      method: "PUT",
      body: JSON.stringify({ weekStartDay: "tuesday" }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid weekStartDay", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/calendar-config", {
      method: "PUT",
      body: JSON.stringify({ weekStartDay: "invalid-day" }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid week start day");
  });

  it("returns 400 for invalid colorTheme", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/calendar-config", {
      method: "PUT",
      body: JSON.stringify({ colorTheme: "" }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid color theme");
  });

  it("returns 400 for invalid layoutDensity", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/calendar-config", {
      method: "PUT",
      body: JSON.stringify({ layoutDensity: "huge" }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid layout density");
  });

  it("returns 400 for invalid visibleEntryTypes", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    const request = new NextRequest("http://localhost/api/calendar-config", {
      method: "PUT",
      body: JSON.stringify({ visibleEntryTypes: ["task", "invalid"] }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid visible entry types");
  });

  it("updates existing config with valid data", async () => {
    const updatedConfig = {
      id: "config-1",
      userId: "user-1",
      weekStartDay: "wednesday",
      colorTheme: "forest",
      layoutDensity: "expanded",
      visibleEntryTypes: ["task", "note"],
      customSizing: null,
    };

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [{ id: "config-1", userId: "user-1" }],
        }),
      }),
    });

    mockDbUpdate.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => [updatedConfig],
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/calendar-config", {
      method: "PUT",
      body: JSON.stringify({
        weekStartDay: "wednesday",
        colorTheme: "forest",
        layoutDensity: "expanded",
        visibleEntryTypes: ["task", "note"],
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.weekStartDay).toBe("wednesday");
    expect(data.colorTheme).toBe("forest");
  });

  it("clamps customSizing values to 10-90% range", async () => {
    const updatedConfig = {
      id: "config-1",
      userId: "user-1",
      weekStartDay: "monday",
      colorTheme: "default",
      layoutDensity: "standard",
      visibleEntryTypes: ["task", "event", "note"],
      customSizing: {
        areas: [{ id: "area-1", widthPercent: 10, heightPercent: 90 }],
      },
    };

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [{ id: "config-1", userId: "user-1" }],
        }),
      }),
    });

    mockDbUpdate.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => [updatedConfig],
        }),
      }),
    });

    const request = new NextRequest("http://localhost/api/calendar-config", {
      method: "PUT",
      body: JSON.stringify({
        customSizing: {
          areas: [{ id: "area-1", widthPercent: 5, heightPercent: 95 }],
        },
      }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
  });

  it("creates new config when none exists", async () => {
    const newConfig = {
      id: "config-new",
      userId: "user-1",
      weekStartDay: "friday",
      colorTheme: "sunset",
      layoutDensity: "standard",
      visibleEntryTypes: ["task", "event", "note"],
      customSizing: null,
    };

    mockGetAuthenticatedUser.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
      error: null,
    });

    mockDbSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    });

    mockDbInsert.mockReturnValue({
      values: () => ({
        returning: () => [newConfig],
      }),
    });

    const request = new NextRequest("http://localhost/api/calendar-config", {
      method: "PUT",
      body: JSON.stringify({
        weekStartDay: "friday",
        colorTheme: "sunset",
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.weekStartDay).toBe("friday");
  });
});
