import { db } from "@/db";
import { plans, planActivations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Plan, PlanActivation } from "@/types/layout-plan";

/**
 * Retrieves all available plans.
 */
export async function getAllPlans(): Promise<Plan[]> {
  const rows = await db.select().from(plans);
  return rows.map(mapPlanRow);
}

/**
 * Retrieves a plan by its ID.
 */
export async function getPlanById(id: string): Promise<Plan | null> {
  const rows = await db.select().from(plans).where(eq(plans.id, id));
  if (rows.length === 0) return null;
  return mapPlanRow(rows[0]);
}

/**
 * Retrieves all active plan activations for a user.
 */
export async function getActivePlans(userId: string): Promise<PlanActivation[]> {
  const rows = await db
    .select()
    .from(planActivations)
    .where(
      and(eq(planActivations.userId, userId), eq(planActivations.isActive, true))
    );
  return rows.map(mapActivationRow);
}

/**
 * Activates a plan for a user. Uses upsert logic: if an activation record
 * already exists for this user+plan, it updates it to active; otherwise inserts.
 */
export async function activatePlan(
  userId: string,
  planId: string
): Promise<PlanActivation> {
  const now = new Date();
  const rows = await db
    .insert(planActivations)
    .values({
      userId,
      planId,
      isActive: true,
      activatedAt: now,
    })
    .onConflictDoUpdate({
      target: [planActivations.userId, planActivations.planId],
      set: {
        isActive: true,
        activatedAt: now,
        deactivatedAt: null,
      },
    })
    .returning();

  return mapActivationRow(rows[0]);
}

/**
 * Deactivates a plan for a user. Sets isActive to false and records deactivatedAt
 * without deleting the record, preserving historical data.
 */
export async function deactivatePlan(
  userId: string,
  planId: string
): Promise<void> {
  const now = new Date();
  await db
    .update(planActivations)
    .set({
      isActive: false,
      deactivatedAt: now,
    })
    .where(
      and(eq(planActivations.userId, userId), eq(planActivations.planId, planId))
    );
}

/**
 * Checks whether a plan is currently active for a user.
 */
export async function isPlanActive(
  userId: string,
  planId: string
): Promise<boolean> {
  const rows = await db
    .select()
    .from(planActivations)
    .where(
      and(
        eq(planActivations.userId, userId),
        eq(planActivations.planId, planId),
        eq(planActivations.isActive, true)
      )
    );
  return rows.length > 0;
}

// --- Internal helpers ---

function mapPlanRow(row: typeof plans.$inferSelect): Plan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isBuiltIn: row.isBuiltIn ?? true,
    widgetDefinitions: row.widgetDefinitions as Plan["widgetDefinitions"],
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}

function mapActivationRow(
  row: typeof planActivations.$inferSelect
): PlanActivation {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    isActive: row.isActive ?? true,
    activatedAt: row.activatedAt ?? new Date(),
    deactivatedAt: row.deactivatedAt ?? undefined,
  };
}
