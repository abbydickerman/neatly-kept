import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { validateCollectionName } from "@/services/collection-service";

/**
 * GET /api/collections
 * Returns all collections for the authenticated user.
 */
export async function GET() {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const userCollections = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, auth.user.id));

  return NextResponse.json(userCollections);
}

/**
 * POST /api/collections
 * Creates a new collection for the authenticated user.
 * Body: { name: string, layoutId?: string, isTemplate?: boolean, templateType?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  let body: { name?: string; layoutId?: string; isTemplate?: boolean; templateType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json(
      { error: "Collection name is required" },
      { status: 400 }
    );
  }

  const validation = validateCollectionName(body.name);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errors.join("; ") },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(collections)
    .values({
      userId: auth.user.id,
      name: body.name.trim(),
      layoutId: body.layoutId ?? null,
      isTemplate: body.isTemplate ?? false,
      templateType: body.templateType ?? null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
