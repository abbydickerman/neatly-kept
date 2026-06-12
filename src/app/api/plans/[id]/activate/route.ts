import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { activatePlan, getPlanById } from "@/services/plan-service";

/**
 * POST /api/plans/[id]/activate
 * Activates a plan for the authenticated user.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;
  const { id: planId } = await params;

  // Verify the plan exists
  const plan = await getPlanById(planId);
  if (!plan) {
    return NextResponse.json(
      { error: "Plan not found" },
      { status: 404 }
    );
  }

  const activation = await activatePlan(user.id, planId);
  return NextResponse.json(activation);
}
