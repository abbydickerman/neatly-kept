import { NextRequest, NextResponse } from "next/server";
import { eq, and, ilike, or, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { galleryTemplates } from "@/db/schema";

/**
 * GET /api/templates
 * Browse published gallery templates with optional filtering.
 * Public endpoint — no authentication required.
 *
 * Query parameters:
 * - category: filter by template category
 * - search: search in name and description (case-insensitive)
 * - sort: 'popular' (default), 'newest', or 'name'
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "popular";

  try {
    // Build conditions — only show published templates
    const conditions = [eq(galleryTemplates.status, "published")];

    if (category) {
      conditions.push(eq(galleryTemplates.category, category));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(galleryTemplates.name, searchPattern),
          ilike(galleryTemplates.description, searchPattern)
        )!
      );
    }

    // Determine sort order
    let orderBy;
    switch (sort) {
      case "newest":
        orderBy = desc(galleryTemplates.createdAt);
        break;
      case "name":
        orderBy = asc(galleryTemplates.name);
        break;
      case "popular":
      default:
        orderBy = desc(galleryTemplates.usageCount);
        break;
    }

    const results = await db
      .select()
      .from(galleryTemplates)
      .where(and(...conditions))
      .orderBy(orderBy);

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/templates error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
