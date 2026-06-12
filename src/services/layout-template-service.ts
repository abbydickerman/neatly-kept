import { eq, ilike } from "drizzle-orm";
import { layoutTemplates } from "@/db/schema";
import { db, type Database } from "@/db";
import type { LayoutTemplate, LayoutCategory } from "@/types/layout-plan";

/**
 * Layout Template Service
 *
 * Provides read-only access to layout templates stored in the database.
 * Templates are predefined visual structures that define the arrangement
 * of content areas for weekly or monthly spreads.
 */
export interface ILayoutTemplateService {
  getAllTemplates(): Promise<LayoutTemplate[]>;
  getTemplatesByCategory(category: LayoutCategory): Promise<LayoutTemplate[]>;
  searchTemplates(term: string): Promise<LayoutTemplate[]>;
  getTemplateById(id: string): Promise<LayoutTemplate | null>;
}

function mapRowToTemplate(row: typeof layoutTemplates.$inferSelect): LayoutTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as LayoutCategory,
    previewImageUrl: row.previewImageUrl ?? undefined,
    isBuiltIn: row.isBuiltIn ?? true,
    structure: row.structure as LayoutTemplate["structure"],
    injectionZones: row.injectionZones as LayoutTemplate["injectionZones"],
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}

/**
 * Creates a layout template service instance.
 * Accepts an optional database instance for dependency injection (useful in tests).
 */
export function createLayoutTemplateService(
  database: Database = db
): ILayoutTemplateService {
  return {
    async getAllTemplates(): Promise<LayoutTemplate[]> {
      const rows = await database
        .select()
        .from(layoutTemplates);
      return rows.map(mapRowToTemplate);
    },

    async getTemplatesByCategory(
      category: LayoutCategory
    ): Promise<LayoutTemplate[]> {
      const rows = await database
        .select()
        .from(layoutTemplates)
        .where(eq(layoutTemplates.category, category));
      return rows.map(mapRowToTemplate);
    },

    async searchTemplates(term: string): Promise<LayoutTemplate[]> {
      const rows = await database
        .select()
        .from(layoutTemplates)
        .where(ilike(layoutTemplates.name, `%${term}%`));
      return rows.map(mapRowToTemplate);
    },

    async getTemplateById(id: string): Promise<LayoutTemplate | null> {
      const rows = await database
        .select()
        .from(layoutTemplates)
        .where(eq(layoutTemplates.id, id));
      if (rows.length === 0) return null;
      return mapRowToTemplate(rows[0]);
    },
  };
}

// Default instance using the application database
export const layoutTemplateService = createLayoutTemplateService();
