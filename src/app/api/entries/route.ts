import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { validateEntryText, validateEntryType } from "@/services/entry-service";

/**
 * GET /api/entries
 * Query entries by pageId or dateStart/dateEnd range.
 * Requires authentication. Only returns entries belonging to the authenticated user.
 */
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const pageId = searchParams.get("pageId");
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");

  try {
    if (pageId) {
      const results = await db
        .select()
        .from(entries)
        .where(and(eq(entries.userId, user.id), eq(entries.pageId, pageId)));

      return NextResponse.json(results);
    }

    if (dateStart && dateEnd) {
      const results = await db
        .select()
        .from(entries)
        .where(
          and(
            eq(entries.userId, user.id),
            gte(entries.date, dateStart),
            lte(entries.date, dateEnd)
          )
        );

      return NextResponse.json(results);
    }

    // No filter: return all entries for the user
    const results = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, user.id));

    return NextResponse.json(results);
  } catch (err) {
    console.error("GET /api/entries error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/entries
 * Create a new entry. Requires type (task/event/note) and text (1-500 chars).
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const body = await request.json();
    const { type, text, pageId, signifiers, date, state } = body;

    // Validate type
    const typeResult = validateEntryType(type);
    if (!typeResult.valid) {
      return NextResponse.json(
        { error: typeResult.errors.join("; ") },
        { status: 400 }
      );
    }

    // Validate text
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Entry text is required" },
        { status: 400 }
      );
    }

    const textResult = validateEntryText(text);
    if (!textResult.valid) {
      return NextResponse.json(
        { error: textResult.errors.join("; ") },
        { status: 400 }
      );
    }

    // Validate pageId
    if (!pageId) {
      return NextResponse.json(
        { error: "pageId is required" },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();

    // Determine initial state for tasks
    const entryState = type === "task" ? (state ?? "incomplete") : state ?? null;

    const [newEntry] = await db
      .insert(entries)
      .values({
        userId: user.id,
        pageId,
        type,
        text: trimmedText,
        signifiers: signifiers ?? [],
        date: date ?? null,
        state: entryState,
      })
      .returning();

    return NextResponse.json(newEntry, { status: 201 });
  } catch (err) {
    console.error("POST /api/entries error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
