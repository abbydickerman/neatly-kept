import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { collections, collectionEntries } from "@/db/schema";
import { getAuthenticatedUser, assertOwnership } from "@/lib/api-auth";

interface RouteParams {
  params: Promise<{ id: string; entryId: string }>;
}

/**
 * DELETE /api/collections/:id/entries/:entryId
 * Removes an entry from a collection without deleting the entry itself.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { id: collectionId, entryId } = await params;

  // Verify collection exists and belongs to user
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId));

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const ownershipError = assertOwnership(auth.user.id, collection.userId);
  if (ownershipError) return ownershipError;

  // Check if the link exists
  const [existingLink] = await db
    .select()
    .from(collectionEntries)
    .where(
      and(
        eq(collectionEntries.collectionId, collectionId),
        eq(collectionEntries.entryId, entryId)
      )
    );

  if (!existingLink) {
    return NextResponse.json(
      { error: "Entry is not in this collection" },
      { status: 404 }
    );
  }

  // Remove the link (does NOT delete the entry itself)
  await db
    .delete(collectionEntries)
    .where(
      and(
        eq(collectionEntries.collectionId, collectionId),
        eq(collectionEntries.entryId, entryId)
      )
    );

  return NextResponse.json({ success: true });
}
