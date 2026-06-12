import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { galleryTemplates } from "@/db/schema";

/**
 * GET /api/templates/:id
 * Get a single published gallery template by ID.
 * Public endpoint — no authentication required.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [template] = await db
      .select()
      .from(galleryTemplates)
      .where(
        and(
          eq(galleryTemplates.id, id),
          eq(galleryTemplates.status, "published")
        )
      )
      .limit(1);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (err) {
    console.error("GET /api/templates/:id error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
