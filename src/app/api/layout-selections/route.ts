import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import {
  getActiveSelection,
  activateTemplate,
} from "@/services/layout-selection-service";

/**
 * GET /api/layout-selections
 * Returns the authenticated user's active layout selections for both weekly and monthly categories.
 */
export async function GET() {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;

  const [weeklySelection, monthlySelection] = await Promise.all([
    getActiveSelection(user.id, "weekly"),
    getActiveSelection(user.id, "monthly"),
  ]);

  return NextResponse.json({
    weekly: weeklySelection,
    monthly: monthlySelection,
  });
}

/**
 * POST /api/layout-selections
 * Activates a layout template for the authenticated user.
 * The category is resolved automatically from the template.
 * Body: { templateId: string }
 */
export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;

  let body: { templateId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { templateId } = body;

  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json(
      { error: "templateId is required and must be a string" },
      { status: 400 }
    );
  }

  try {
    const selection = await activateTemplate(user.id, templateId);
    return NextResponse.json(selection, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Template not found")
    ) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    throw error;
  }
}
