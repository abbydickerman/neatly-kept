import { db } from "@/db";
import { plans, planActivations, planWidgetData } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type {
  Plan,
  PlanWidgetDefinition,
  PlanWidgetDataRecord,
  InjectedWidget,
} from "@/types/layout-plan";

/**
 * Retrieves all active plan widgets for a user on a given date.
 * Joins planActivations (isActive = true) with plans to resolve widget definitions,
 * then left-joins planWidgetData to attach existing data for the date.
 */
export async function getWidgetsForDate(
  userId: string,
  date: Date
): Promise<InjectedWidget[]> {
  // Get all active plan activations for the user
  const activeActivations = await db
    .select()
    .from(planActivations)
    .where(
      and(
        eq(planActivations.userId, userId),
        eq(planActivations.isActive, true)
      )
    );

  if (activeActivations.length === 0) {
    return [];
  }

  // Resolve plan definitions for each activation
  const planIds = activeActivations.map((a) => a.planId);
  const planRows = await db.select().from(plans);
  const planMap = new Map(planRows.map((p) => [p.id, p]));

  // Format date as YYYY-MM-DD string for querying
  const dateStr = formatDateString(date);

  // Get all widget data for this user and date
  const widgetDataRows = await db
    .select()
    .from(planWidgetData)
    .where(
      and(
        eq(planWidgetData.userId, userId),
        eq(planWidgetData.date, dateStr)
      )
    );

  // Build a lookup map: planId-widgetType -> data record
  const dataMap = new Map(
    widgetDataRows.map((row) => [`${row.planId}-${row.widgetType}`, row])
  );

  // Assemble injected widgets
  const injectedWidgets: InjectedWidget[] = [];

  for (const activation of activeActivations) {
    const plan = planMap.get(activation.planId);
    if (!plan) continue;

    const widgetDefinitions = plan.widgetDefinitions as PlanWidgetDefinition[];

    for (const definition of widgetDefinitions) {
      const dataKey = `${activation.planId}-${definition.widgetType}`;
      const dataRow = dataMap.get(dataKey) ?? null;

      injectedWidgets.push({
        planId: activation.planId,
        planName: plan.name,
        definition,
        data: dataRow ? mapWidgetDataRow(dataRow) : null,
        activationOrder: activation.activatedAt?.getTime() ?? 0,
      });
    }
  }

  // Sort by activation order so widgets render in activation timestamp order
  injectedWidgets.sort((a, b) => a.activationOrder - b.activationOrder);

  return injectedWidgets;
}

/**
 * Retrieves widget data for a specific plan, widget type, and date.
 */
export async function getWidgetData(
  userId: string,
  planId: string,
  widgetType: string,
  date: Date
): Promise<PlanWidgetDataRecord | null> {
  const dateStr = formatDateString(date);

  const rows = await db
    .select()
    .from(planWidgetData)
    .where(
      and(
        eq(planWidgetData.userId, userId),
        eq(planWidgetData.planId, planId),
        eq(planWidgetData.widgetType, widgetType),
        eq(planWidgetData.date, dateStr)
      )
    );

  if (rows.length === 0) return null;
  return mapWidgetDataRow(rows[0]);
}

/**
 * Saves (upserts) widget data for a specific plan, widget type, and date.
 * Uses the unique constraint (userId, planId, widgetType, date) for conflict resolution.
 */
export async function saveWidgetData(
  userId: string,
  planId: string,
  widgetType: string,
  date: Date,
  value: string
): Promise<PlanWidgetDataRecord> {
  const dateStr = formatDateString(date);
  const now = new Date();

  const rows = await db
    .insert(planWidgetData)
    .values({
      userId,
      planId,
      widgetType,
      date: dateStr,
      value,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        planWidgetData.userId,
        planWidgetData.planId,
        planWidgetData.widgetType,
        planWidgetData.date,
      ],
      set: {
        value,
        updatedAt: now,
      },
    })
    .returning();

  return mapWidgetDataRow(rows[0]);
}

// --- Internal helpers ---

function formatDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapWidgetDataRow(
  row: typeof planWidgetData.$inferSelect
): PlanWidgetDataRecord {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    widgetType: row.widgetType,
    date: new Date(row.date),
    value: row.value,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}
