import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { computeDailyView } from "@/services/daily-view-computer";

/**
 * GET /api/daily-view
 * Returns the computed daily view for the authenticated user.
 * Query param: `date` (YYYY-MM-DD format, defaults to today)
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;

  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get("date");

  let date: Date;
  if (dateParam) {
    date = new Date(dateParam + "T00:00:00");
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
  } else {
    date = new Date();
    // Normalize to start of day
    date.setHours(0, 0, 0, 0);
  }

  const dailyView = await computeDailyView(user.id, date);

  return NextResponse.json(dailyView);
}
