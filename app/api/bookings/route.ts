import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/bookings - Get bookings for the tenant organization
 * Public endpoint when querying by sessionId (for viewing occupied seats)
 * POST /api/bookings - Create a new booking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // Make authentication optional when querying by sessionId (public access for viewing occupied seats)
    let authToken: string | undefined;
    try {
      await requireAuth(request);
      authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    } catch (authError: any) {
      // If authentication fails and we're querying by sessionId, allow public access
      if (sessionId) {
        console.log(
          "[BOOKINGS] Public access - querying by sessionId without authentication"
        );
        authToken = undefined;
      } else {
        // For other queries, require authentication
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Pass query parameters to getBookings
    const queryParams: Record<string, string> = {};
    if (sessionId) {
      queryParams.sessionId = sessionId;
    }

    const bookings = await mainBackendClient.getBookings(
      authToken,
      queryParams
    );
    return NextResponse.json(bookings);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const body = await request.json();

    // Ensure the booking is for this organization
    const bookingData = {
      ...body,
      organizationId: user.organizationId,
    };

    const booking = await mainBackendClient.createBooking(
      bookingData,
      authToken
    );

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
