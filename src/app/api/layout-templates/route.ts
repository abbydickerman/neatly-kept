import { NextRequest, NextResponse } from "next/server";
import { layoutTemplateService } from "@/services/layout-template-service";
import type { LayoutCategory } from "@/types/layout-plan";

/**
 * GET /api/layout-templates
 * Browse layout templates with optional filtering.
 * Public endpoint — no authentication required.
 *
 * Query parameters:
 * - category: filter by layout category ('weekly' or 'monthly')
 * - search: search templates by name (case-insensitive)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  try {
    // Validate category if provided
    if (category && category !== "weekly" && category !== "monthly") {
      return NextResponse.json(
        { error: "Invalid category. Must be 'weekly' or 'monthly'." },
        { status: 400 }
      );
    }

    let templates;

    if (search) {
      // Search takes precedence — searches by name (case-insensitive)
      templates = await layoutTemplateService.searchTemplates(search);
      // If category is also provided, filter the search results by category
      if (category) {
        templates = templates.filter(
          (t) => t.category === (category as LayoutCategory)
        );
      }
    } else if (category) {
      // Filter by category only
      templates = await layoutTemplateService.getTemplatesByCategory(
        category as LayoutCategory
      );
    } else {
      // No filters — return all templates
      templates = await layoutTemplateService.getAllTemplates();
    }

    return NextResponse.json(templates);
  } catch (err) {
    console.error("GET /api/layout-templates error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
