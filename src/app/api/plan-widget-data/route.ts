import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import {
  getWidgetsForDate,
  saveWidgetData,
} from "@/services/plan-widget-service";

/**
 * GET /api/plan-widget-data?date=YYYY-MM-DD
 * Returns all active plan widgets (with data) for the authenticated user on the given date.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;

  const dateParam = request.nextUrl.searchParams.get("date");

  if (!dateParam) {
    return NextResponse.json(
      { error: "date query parameter is required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const date = new Date(dateParam + "T00:00:00Z");

  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const widgets = await getWidgetsForDate(user.id, date);

  return NextResponse.json(widgets);
}

/**
 * PUT /api/plan-widget-data
 * Saves (upserts) widget data for a specific plan, widget type, and date.
 * Body: { planId: string, widgetType: string, date: string (YYYY-MM-DD), value: string }
 */
export async function PUT(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.error) return auth.error;

  const { user } = auth;

  let body: { planId?: string; widgetType?: string; date?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { planId, widgetType, date: dateStr, value } = body;

  if (!planId || typeof planId !== "string") {
    return NextResponse.json(
      { error: "planId is required and must be a string" },
      { status: 400 }
    );
  }

  if (!widgetType || typeof widgetType !== "string") {
    return NextResponse.json(
      { error: "widgetType is required and must be a string" },
      { status: 400 }
    );
  }

  if (!dateStr || typeof dateStr !== "string") {
    return NextResponse.json(
      { error: "date is required and must be a string (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  if (typeof value !== "string") {
    return NextResponse.json(
      { error: "value is required and must be a string" },
      { status: 400 }
    );
  }

  const date = new Date(dateStr + "T00:00:00Z");

  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const record = await saveWidgetData(user.id, planId, widgetType, date, value);

  return NextResponse.json(record);
}
