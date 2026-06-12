import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { layouts } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getBuiltInLayouts } from "@/services/layout-service";
import {
  validateLayout,
  validateLayoutName,
  isLayoutNameUnique,
} from "@/lib/validators/layout-validator";
import type { Layout, ContentArea } from "@/types/models";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/layouts/:id
 * Updates an existing custom layout for the authenticated user.
 * Validates layout structure and name uniqueness.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;
  const { id } = await params;

  // Find the existing layout owned by this user
  const [existing] = await db
    .select()
    .from(layouts)
    .where(and(eq(layouts.id, id), eq(layouts.userId, user.id)));

  if (!existing) {
    return NextResponse.json(
      { error: "Layout not found" },
      { status: 404 }
    );
  }

  if (existing.isBuiltIn) {
    return NextResponse.json(
      { error: "Cannot modify a built-in layout" },
      { status: 403 }
    );
  }

  let body: { name?: string; contentAreas?: ContentArea[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { name, contentAreas } = body;

  // Validate name if being updated
  if (name !== undefined) {
    const nameResult = validateLayoutName(name);
    if (!nameResult.valid) {
      return NextResponse.json(
        { error: nameResult.errors.join("; ") },
        { status: 400 }
      );
    }

    // Check uniqueness excluding the current layout
    const existingCustom = await db
      .select()
      .from(layouts)
      .where(eq(layouts.userId, user.id));

    const builtInLayouts = getBuiltInLayouts();

    const allExistingLayouts: Layout[] = [
      ...builtInLayouts,
      ...existingCustom.map((row) => ({
        id: row.id,
        userId: row.userId,
        name: row.name,
        isBuiltIn: row.isBuiltIn ?? false,
        contentAreas: row.contentAreas as ContentArea[],
        createdAt: row.createdAt ?? new Date(),
        updatedAt: row.updatedAt ?? new Date(),
      })),
    ];

    const uniqueResult = isLayoutNameUnique(name, allExistingLayouts, id);
    if (!uniqueResult.valid) {
      return NextResponse.json(
        { error: uniqueResult.errors.join("; ") },
        { status: 409 }
      );
    }
  }

  // Validate content areas if being updated
  if (contentAreas !== undefined) {
    if (!Array.isArray(contentAreas)) {
      return NextResponse.json(
        { error: "Content areas must be an array" },
        { status: 400 }
      );
    }

    const merged: Layout = {
      id: existing.id,
      userId: existing.userId,
      name: name?.trim() ?? existing.name,
      isBuiltIn: false,
      contentAreas,
      createdAt: existing.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    const structureResult = validateLayout(merged);
    if (!structureResult.valid) {
      return NextResponse.json(
        { error: structureResult.errors.join("; ") },
        { status: 400 }
      );
    }
  }

  // Build update values
  const now = new Date();
  const updateValues: Record<string, unknown> = { updatedAt: now };
  if (name !== undefined) {
    updateValues.name = name.trim();
  }
  if (contentAreas !== undefined) {
    updateValues.contentAreas = contentAreas;
  }

  const [updated] = await db
    .update(layouts)
    .set(updateValues)
    .where(and(eq(layouts.id, id), eq(layouts.userId, user.id)))
    .returning();

  return NextResponse.json({
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    isBuiltIn: updated.isBuiltIn ?? false,
    contentAreas: updated.contentAreas as ContentArea[],
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

/**
 * DELETE /api/layouts/:id
 * Deletes a custom layout for the authenticated user.
 * Journal pages referencing this layout are preserved via ON DELETE SET NULL in the schema.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;
  const { id } = await params;

  // Find the existing layout owned by this user
  const [existing] = await db
    .select()
    .from(layouts)
    .where(and(eq(layouts.id, id), eq(layouts.userId, user.id)));

  if (!existing) {
    return NextResponse.json(
      { error: "Layout not found" },
      { status: 404 }
    );
  }

  if (existing.isBuiltIn) {
    return NextResponse.json(
      { error: "Cannot delete a built-in layout" },
      { status: 403 }
    );
  }

  // Delete the layout. Journal pages are preserved via ON DELETE SET NULL
  // in the database schema (journal_pages.layout_id references layouts.id ON DELETE SET NULL).
  await db
    .delete(layouts)
    .where(and(eq(layouts.id, id), eq(layouts.userId, user.id)));

  return NextResponse.json({ success: true }, { status: 200 });
}
