import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { calendarConfigs } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/api-auth";
import {
  clampCalendarSizing,
  validateWeekStartDay,
  validateColorTheme,
  validateLayoutDensity,
  validateVisibleEntryTypes,
} from "@/services/calendar-config-service";

/**
 * GET /api/calendar-config
 * Returns the authenticated user's calendar configuration.
 * Creates a default config if none exists.
 * Requires authentication.
 */
export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const [existing] = await db
      .select()
      .from(calendarConfigs)
      .where(eq(calendarConfigs.userId, user.id))
      .limit(1);

    if (existing) {
      return NextResponse.json(existing);
    }

    // Create default config
    const [newConfig] = await db
      .insert(calendarConfigs)
      .values({
        userId: user.id,
        weekStartDay: "monday",
        colorTheme: "default",
        layoutDensity: "standard",
        visibleEntryTypes: ["task", "event", "note"],
        customSizing: null,
      })
      .returning();

    return NextResponse.json(newConfig);
  } catch (err) {
    console.error("GET /api/calendar-config error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calendar-config
 * Updates the authenticated user's calendar configuration.
 * Validates all fields and clamps sizing values to 10-90% range.
 * Requires authentication.
 */
export async function PUT(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const body = await request.json();
    const { weekStartDay, colorTheme, layoutDensity, visibleEntryTypes, customSizing } = body;

    // Validate fields if provided
    if (weekStartDay !== undefined && !validateWeekStartDay(weekStartDay)) {
      return NextResponse.json(
        { error: "Invalid week start day: must be one of monday, tuesday, wednesday, thursday, friday, saturday, sunday" },
        { status: 400 }
      );
    }

    if (colorTheme !== undefined && !validateColorTheme(colorTheme)) {
      return NextResponse.json(
        { error: "Invalid color theme: must be a non-empty string" },
        { status: 400 }
      );
    }

    if (layoutDensity !== undefined && !validateLayoutDensity(layoutDensity)) {
      return NextResponse.json(
        { error: "Invalid layout density: must be one of compact, standard, expanded" },
        { status: 400 }
      );
    }

    if (visibleEntryTypes !== undefined && !validateVisibleEntryTypes(visibleEntryTypes)) {
      return NextResponse.json(
        { error: "Invalid visible entry types: each must be one of task, event, note" },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (weekStartDay !== undefined) {
      updateData.weekStartDay = weekStartDay;
    }
    if (colorTheme !== undefined) {
      updateData.colorTheme = colorTheme;
    }
    if (layoutDensity !== undefined) {
      updateData.layoutDensity = layoutDensity;
    }
    if (visibleEntryTypes !== undefined) {
      updateData.visibleEntryTypes = visibleEntryTypes;
    }
    if (customSizing !== undefined) {
      // Clamp sizing values to 10-90% range, or set to null if explicitly null
      updateData.customSizing = customSizing === null
        ? null
        : clampCalendarSizing(customSizing);
    }

    // Check if config exists
    const [existing] = await db
      .select()
      .from(calendarConfigs)
      .where(eq(calendarConfigs.userId, user.id))
      .limit(1);

    if (existing) {
      // Update existing config
      const [updated] = await db
        .update(calendarConfigs)
        .set(updateData)
        .where(eq(calendarConfigs.userId, user.id))
        .returning();

      return NextResponse.json(updated);
    }

    // Create new config with provided values merged with defaults
    const [newConfig] = await db
      .insert(calendarConfigs)
      .values({
        userId: user.id,
        weekStartDay: weekStartDay ?? "monday",
        colorTheme: colorTheme ?? "default",
        layoutDensity: layoutDensity ?? "standard",
        visibleEntryTypes: visibleEntryTypes ?? ["task", "event", "note"],
        customSizing: customSizing === undefined
          ? null
          : customSizing === null
            ? null
            : clampCalendarSizing(customSizing),
      })
      .returning();

    return NextResponse.json(newConfig);
  } catch (err) {
    console.error("PUT /api/calendar-config error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
