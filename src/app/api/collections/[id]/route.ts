import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { collections, collectionEntries } from "@/db/schema";
import { getAuthenticatedUser, assertOwnership } from "@/lib/api-auth";
import { validateCollectionName } from "@/services/collection-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/collections/:id
 * Updates a collection owned by the authenticated user.
 * Body: { name?: string, layoutId?: string, isTemplate?: boolean, templateType?: string }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, id));

  if (!existing) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const ownershipError = assertOwnership(auth.user.id, existing.userId);
  if (ownershipError) return ownershipError;

  let body: { name?: string; layoutId?: string; isTemplate?: boolean; templateType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.name !== undefined) {
    const validation = validateCollectionName(body.name);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join("; ") },
        { status: 400 }
      );
    }
    body.name = body.name.trim();
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.layoutId !== undefined) updateData.layoutId = body.layoutId;
  if (body.isTemplate !== undefined) updateData.isTemplate = body.isTemplate;
  if (body.templateType !== undefined) updateData.templateType = body.templateType;

  const [updated] = await db
    .update(collections)
    .set(updateData)
    .where(eq(collections.id, id))
    .returning();

  return NextResponse.json(updated);
}

/**
 * DELETE /api/collections/:id
 * Deletes a collection owned by the authenticated user.
 * Also removes all collection-entry links (handled by ON DELETE CASCADE).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, id));

  if (!existing) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const ownershipError = assertOwnership(auth.user.id, existing.userId);
  if (ownershipError) return ownershipError;

  // Delete collection-entry links first (also handled by CASCADE, but explicit for clarity)
  await db
    .delete(collectionEntries)
    .where(eq(collectionEntries.collectionId, id));

  await db.delete(collections).where(eq(collections.id, id));

  return NextResponse.json({ success: true });
}
