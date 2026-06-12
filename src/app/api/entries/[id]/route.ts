import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { entries, collectionEntries } from "@/db/schema";
import { getAuthenticatedUser, assertOwnership } from "@/lib/api-auth";
import { validateEntryText, validateEntryType } from "@/services/entry-service";
import { taskStateMachine } from "@/services/task-state-machine";
import type { TaskState, TaskAction } from "@/types/models";

/**
 * PUT /api/entries/:id
 * Update an existing entry. Validates state transitions for tasks.
 * Requires authentication and ownership.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id } = await params;

  try {
    // Fetch existing entry
    const [existing] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Check ownership
    const ownershipError = assertOwnership(user.id, existing.userId);
    if (ownershipError) return ownershipError;

    const body = await request.json();
    const { type, text, signifiers, date, state } = body;

    // Validate type if provided
    if (type !== undefined) {
      const typeResult = validateEntryType(type);
      if (!typeResult.valid) {
        return NextResponse.json(
          { error: typeResult.errors.join("; ") },
          { status: 400 }
        );
      }
    }

    // Validate text if provided
    if (text !== undefined) {
      if (typeof text !== "string") {
        return NextResponse.json(
          { error: "Entry text must be a string" },
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
    }

    // Validate state transition if state is being changed
    if (state !== undefined && state !== existing.state) {
      const currentState = existing.state as TaskState;
      const entryType = type ?? existing.type;

      if (entryType !== "task") {
        return NextResponse.json(
          { error: "State transitions are only valid for tasks" },
          { status: 400 }
        );
      }

      // Determine the action from the desired state
      const actionMap: Record<string, TaskAction> = {
        complete: "complete",
        migrated: "migrate",
        cancelled: "cancel",
      };

      const action = actionMap[state];
      if (!action) {
        return NextResponse.json(
          { error: `Invalid target state: ${state}` },
          { status: 400 }
        );
      }

      const newState = taskStateMachine.transition(currentState, action);
      if (newState === null) {
        return NextResponse.json(
          {
            error: `Invalid state transition from '${currentState}' via action '${action}'`,
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (type !== undefined) updateData.type = type;
    if (text !== undefined) updateData.text = text.trim();
    if (signifiers !== undefined) updateData.signifiers = signifiers;
    if (date !== undefined) updateData.date = date;
    if (state !== undefined) updateData.state = state;

    const [updated] = await db
      .update(entries)
      .set(updateData)
      .where(eq(entries.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/entries/:id error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/entries/:id
 * Delete an entry and cascade to collection_entries.
 * Requires authentication and ownership.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const { id } = await params;

  try {
    // Fetch existing entry
    const [existing] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: "Entry not found" },
        { status: 404 }
      );
    }

    // Check ownership
    const ownershipError = assertOwnership(user.id, existing.userId);
    if (ownershipError) return ownershipError;

    // Delete collection_entries links first (cascade)
    await db
      .delete(collectionEntries)
      .where(eq(collectionEntries.entryId, id));

    // Delete the entry
    await db.delete(entries).where(eq(entries.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/entries/:id error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
