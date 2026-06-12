import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { userLayoutSelections, layoutTemplates } from "@/db/schema";
import type {
  LayoutCategory,
  LayoutTemplate,
  UserLayoutSelection,
  LayoutTemplateStructure,
  InjectionZone,
} from "@/types/layout-plan";

/**
 * Get the user's active layout selection for a given category.
 */
export async function getActiveSelection(
  userId: string,
  category: LayoutCategory
): Promise<UserLayoutSelection | null> {
  const results = await db
    .select()
    .from(userLayoutSelections)
    .where(
      and(
        eq(userLayoutSelections.userId, userId),
        eq(userLayoutSelections.category, category)
      )
    );

  if (results.length === 0) return null;

  const row = results[0];
  return {
    id: row.id,
    userId: row.userId,
    templateId: row.templateId,
    category: row.category as LayoutCategory,
    activatedAt: row.activatedAt ?? new Date(),
  };
}

/**
 * Activate a template for a user. Uses upsert logic to enforce
 * one active template per user per category.
 * Resolves the template's category from the template record itself.
 */
export async function activateTemplate(
  userId: string,
  templateId: string
): Promise<UserLayoutSelection> {
  // Look up the template to determine its category
  const templateResults = await db
    .select()
    .from(layoutTemplates)
    .where(eq(layoutTemplates.id, templateId));

  if (templateResults.length === 0) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const template = templateResults[0];
  const category = template.category as LayoutCategory;

  // Upsert: insert or update on conflict (user + category unique constraint)
  const now = new Date();
  const [result] = await db
    .insert(userLayoutSelections)
    .values({
      userId,
      templateId,
      category,
      activatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userLayoutSelections.userId, userLayoutSelections.category],
      set: {
        templateId,
        activatedAt: now,
      },
    })
    .returning();

  return {
    id: result.id,
    userId: result.userId,
    templateId: result.templateId,
    category: result.category as LayoutCategory,
    activatedAt: result.activatedAt ?? now,
  };
}

/**
 * Get the user's active weekly template (full template object).
 * Returns null if no weekly template is active.
 */
export async function getActiveWeeklyTemplate(
  userId: string
): Promise<LayoutTemplate | null> {
  return getActiveTemplateByCategory(userId, "weekly");
}

/**
 * Get the user's active monthly template (full template object).
 * Returns null if no monthly template is active.
 */
export async function getActiveMonthlyTemplate(
  userId: string
): Promise<LayoutTemplate | null> {
  return getActiveTemplateByCategory(userId, "monthly");
}

/**
 * Internal helper to get the full template object for a user's active selection in a category.
 */
async function getActiveTemplateByCategory(
  userId: string,
  category: LayoutCategory
): Promise<LayoutTemplate | null> {
  const selection = await getActiveSelection(userId, category);
  if (!selection) return null;

  const templateResults = await db
    .select()
    .from(layoutTemplates)
    .where(eq(layoutTemplates.id, selection.templateId));

  if (templateResults.length === 0) return null;

  const row = templateResults[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as LayoutCategory,
    previewImageUrl: row.previewImageUrl ?? undefined,
    isBuiltIn: row.isBuiltIn ?? true,
    structure: row.structure as LayoutTemplateStructure,
    injectionZones: row.injectionZones as InjectionZone[],
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}
