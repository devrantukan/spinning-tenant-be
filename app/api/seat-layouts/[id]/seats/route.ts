import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/seat-layouts/[id]/seats - Get all seats for a seat layout
 * Public endpoint - no authentication required for viewing seats
 * POST /api/seat-layouts/[id]/seats - Create a new seat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Make authentication optional for GET requests (public access)
    // Try to get auth token if available, but don't require it
    let authToken: string | undefined;
    try {
      await requireAuth(request);
      authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    } catch (authError: any) {
      // If authentication fails, continue without auth token (public access)
      console.log("[SEATS] Public access - no authentication provided");
      authToken = undefined;
    }

    const { id: seatLayoutId } = await params;
    const seats = await mainBackendClient.getSeats(seatLayoutId, authToken);

    return NextResponse.json(seats);
  } catch (error: any) {
    console.error("Error fetching seats:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id: seatLayoutId } = await params;
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const body = await request.json();

    const seat = await mainBackendClient.createSeats(
      seatLayoutId,
      body,
      authToken
    );

    return NextResponse.json(seat, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating seat:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
