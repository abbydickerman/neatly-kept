import { db } from "@/db";
import { entries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveWeeklyTemplate, getActiveMonthlyTemplate } from "@/services/layout-selection-service";
import { getWidgetsForDate } from "@/services/plan-widget-service";
import type { ComputedDailyView, TemplateArea, InjectedWidget } from "@/types/layout-plan";
import type { Entry } from "@/types/models";

/**
 * Computes the daily view for a user on a given date.
 *
 * This is the central computation that:
 * 1. Extracts the day column from the active weekly template matching the target day-of-week
 * 2. Fetches entries for the date
 * 3. Fetches active plan widgets for the date
 * 4. Fetches monthly context (monthly template + monthly-frequency widgets)
 *
 * Returns a ComputedDailyView object ready for rendering.
 */
export async function computeDailyView(
  userId: string,
  date: Date
): Promise<ComputedDailyView> {
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ... 6=Saturday

  // Fetch active weekly template, monthly template, entries, and widgets in parallel
  const [weeklyTemplate, monthlyTemplate, dayEntries, widgets] = await Promise.all([
    getActiveWeeklyTemplate(userId),
    getActiveMonthlyTemplate(userId),
    getEntriesForDate(userId, date),
    getWidgetsForDate(userId, date),
  ]);

  // Extract the day column from the weekly template
  const dayColumn = extractDayColumn(weeklyTemplate?.structure.areas ?? [], dayOfWeek);

  // Separate daily widgets from monthly-frequency widgets
  const dailyWidgets = widgets.filter(
    (w) => w.definition.frequency === "daily" && w.definition.targetZoneType === "daily-content"
  );

  const monthlyGoalsWidgets = widgets.filter(
    (w) =>
      w.definition.frequency === "monthly" &&
      (w.definition.targetZoneType === "monthly-goals" ||
        w.definition.targetZoneType === "monthly-summary")
  );

  return {
    date,
    dayOfWeek,
    dayColumn,
    entries: dayEntries,
    dailyWidgets,
    monthlyContext: {
      monthlyGoalsWidgets,
      monthlyTemplate,
    },
    hasWeeklyLayout: weeklyTemplate !== null,
    hasMonthlyLayout: monthlyTemplate !== null,
  };
}

/**
 * Extracts the day column area from template areas matching the target day-of-week.
 * Returns null if no matching day-column area is found.
 */
export function extractDayColumn(
  areas: TemplateArea[],
  dayOfWeek: number
): TemplateArea | null {
  return (
    areas.find(
      (area) => area.type === "day-column" && area.dayOfWeek === dayOfWeek
    ) ?? null
  );
}

/**
 * Fetches entries for a user on a specific date from the database.
 */
async function getEntriesForDate(userId: string, date: Date): Promise<Entry[]> {
  const dateStr = formatDateString(date);

  const rows = await db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), eq(entries.date, dateStr)));

  return rows.map(mapEntryRow);
}

// --- Internal helpers ---

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapEntryRow(row: typeof entries.$inferSelect): Entry {
  return {
    id: row.id,
    userId: row.userId,
    pageId: row.pageId,
    type: row.type as Entry["type"],
    text: row.text,
    signifiers: (row.signifiers as Entry["signifiers"]) ?? [],
    date: row.date ? new Date(row.date) : undefined,
    state: (row.state as Entry["state"]) ?? undefined,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}
