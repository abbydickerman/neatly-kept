import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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

/**
 * GET /api/layouts
 * Returns the authenticated user's custom layouts combined with built-in layouts.
 */
export async function GET() {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;

  const customLayouts = await db
    .select()
    .from(layouts)
    .where(eq(layouts.userId, user.id));

  const builtInLayouts = getBuiltInLayouts();

  const allLayouts = [
    ...builtInLayouts.map((layout) => ({
      id: layout.id,
      userId: layout.userId,
      name: layout.name,
      isBuiltIn: layout.isBuiltIn,
      contentAreas: layout.contentAreas,
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
    })),
    ...customLayouts.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      isBuiltIn: row.isBuiltIn ?? false,
      contentAreas: row.contentAreas as ContentArea[],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  ];

  return NextResponse.json(allLayouts);
}

/**
 * POST /api/layouts
 * Creates a new custom layout for the authenticated user.
 * Validates layout structure and name uniqueness.
 */
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;

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

  // Validate name is provided
  if (!name) {
    return NextResponse.json(
      { error: "Layout name is required" },
      { status: 400 }
    );
  }

  // Validate layout name
  const nameResult = validateLayoutName(name);
  if (!nameResult.valid) {
    return NextResponse.json(
      { error: nameResult.errors.join("; ") },
      { status: 400 }
    );
  }

  // Validate content areas are provided
  if (!contentAreas || !Array.isArray(contentAreas)) {
    return NextResponse.json(
      { error: "Content areas are required and must be an array" },
      { status: 400 }
    );
  }

  // Check name uniqueness against user's custom layouts + built-in layouts
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

  const uniqueResult = isLayoutNameUnique(name, allExistingLayouts);
  if (!uniqueResult.valid) {
    return NextResponse.json(
      { error: uniqueResult.errors.join("; ") },
      { status: 409 }
    );
  }

  // Build the full layout object for structural validation
  const now = new Date();
  const layoutForValidation: Layout = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: name.trim(),
    isBuiltIn: false,
    contentAreas,
    createdAt: now,
    updatedAt: now,
  };

  // Validate layout structure (content areas)
  const structureResult = validateLayout(layoutForValidation);
  if (!structureResult.valid) {
    return NextResponse.json(
      { error: structureResult.errors.join("; ") },
      { status: 400 }
    );
  }

  // Insert into database
  const [inserted] = await db
    .insert(layouts)
    .values({
      id: layoutForValidation.id,
      userId: user.id,
      name: name.trim(),
      isBuiltIn: false,
      contentAreas: contentAreas,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(
    {
      id: inserted.id,
      userId: inserted.userId,
      name: inserted.name,
      isBuiltIn: inserted.isBuiltIn ?? false,
      contentAreas: inserted.contentAreas as ContentArea[],
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    },
    { status: 201 }
  );
}
