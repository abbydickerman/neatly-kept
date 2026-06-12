import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getAllPlans, getActivePlans } from "@/services/plan-service";

/**
 * GET /api/plans
 * Returns all available plans. If the user is authenticated, includes which plans are active.
 */
export async function GET() {
  const auth = await getAuthenticatedUser();

  const allPlans = await getAllPlans();

  // If not authenticated, return plans without active status
  if (auth.error) {
    return NextResponse.json(
      allPlans.map((plan) => ({ ...plan, isActive: false }))
    );
  }

  const { user } = auth;
  const activations = await getActivePlans(user.id);
  const activePlanIds = new Set(activations.map((a) => a.planId));

  const plansWithStatus = allPlans.map((plan) => ({
    ...plan,
    isActive: activePlanIds.has(plan.id),
  }));

  return NextResponse.json(plansWithStatus);
}
