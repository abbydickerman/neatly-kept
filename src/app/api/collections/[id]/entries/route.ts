import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { collections, collectionEntries, entries } from "@/db/schema";
import { getAuthenticatedUser, assertOwnership } from "@/lib/api-auth";

const MAX_COLLECTIONS_PER_ENTRY = 10;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/collections/:id/entries
 * Adds an entry to a collection. Enforces the 10-collection limit per entry.
 * Body: { entryId: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { id: collectionId } = await params;

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

  let body: { entryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.entryId) {
    return NextResponse.json({ error: "entryId is required" }, { status: 400 });
  }

  // Verify entry exists and belongs to user
  const [entry] = await db
    .select()
    .from(entries)
    .where(eq(entries.id, body.entryId));

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const entryOwnershipError = assertOwnership(auth.user.id, entry.userId);
  if (entryOwnershipError) return entryOwnershipError;

  // Check if entry is already in this collection
  const [existingLink] = await db
    .select()
    .from(collectionEntries)
    .where(
      and(
        eq(collectionEntries.collectionId, collectionId),
        eq(collectionEntries.entryId, body.entryId)
      )
    );

  if (existingLink) {
    return NextResponse.json(
      { error: "Entry is already in this collection" },
      { status: 409 }
    );
  }

  // Enforce 10-collection limit per entry
  const entryCollections = await db
    .select()
    .from(collectionEntries)
    .where(eq(collectionEntries.entryId, body.entryId));

  if (entryCollections.length >= MAX_COLLECTIONS_PER_ENTRY) {
    return NextResponse.json(
      { error: `Entry cannot be linked to more than ${MAX_COLLECTIONS_PER_ENTRY} collections` },
      { status: 422 }
    );
  }

  const [created] = await db
    .insert(collectionEntries)
    .values({
      collectionId,
      entryId: body.entryId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
