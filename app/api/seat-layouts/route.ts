import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/seat-layouts - Get seat layout by locationId or seatLayoutId
 * Public endpoint - no authentication required
 *
 * Query params:
 * - locationId: The location ID to get seat layout for
 * - seatLayoutId: The seat layout ID to get seat layout for
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const seatLayoutId = searchParams.get("seatLayoutId");

    if (!locationId && !seatLayoutId) {
      return NextResponse.json(
        { error: "locationId or seatLayoutId is required" },
        { status: 400 }
      );
    }

    console.log("[SEAT-LAYOUT] Fetching seat layout from Supabase:", {
      locationId: locationId,
      seatLayoutId: seatLayoutId,
    });

    // Create Supabase client with service role key to bypass RLS
    const supabase = createServerClient();

    // Query seat_layouts table by locationId or seatLayoutId
    let query = supabase.from("seat_layouts").select("*").eq("isActive", true);

    if (seatLayoutId) {
      query = query.eq("id", seatLayoutId);
    } else if (locationId) {
      query = query.eq("locationId", locationId);
    }

    const { data: seatLayout, error: supabaseError } = await query.single();

    if (supabaseError) {
      console.error("[SEAT-LAYOUT] Error querying seat_layouts table:", {
        message: supabaseError.message,
        code: supabaseError.code,
        details: supabaseError.details,
        hint: supabaseError.hint,
      });

      // If no seat layout found, return null (not an error)
      if (supabaseError.code === "PGRST116") {
        console.log(
          "[SEAT-LAYOUT] No seat layout found for locationId:",
          locationId
        );
        return NextResponse.json(null, { status: 200 });
      }

      if (
        supabaseError.message?.includes("permission denied") ||
        supabaseError.code === "42501"
      ) {
        return NextResponse.json(
          {
            error: "Permission denied",
            message:
              "Service role key is required to read seat_layouts table. Please set SUPABASE_SERVICE_ROLE_KEY in environment variables.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch seat layout",
          message: supabaseError.message,
        },
        { status: 500 }
      );
    }

    if (!seatLayout) {
      console.log(
        "[SEAT-LAYOUT] No seat layout found for locationId:",
        locationId
      );
      return NextResponse.json(null, { status: 200 });
    }

    console.log("[SEAT-LAYOUT] Seat layout found:", {
      id: seatLayout.id,
      name: seatLayout.name,
      gridRows: seatLayout.gridRows,
      gridColumns: seatLayout.gridColumns,
      isActive: seatLayout.isActive,
    });

    return NextResponse.json(seatLayout);
  } catch (error: unknown) {
    console.error("[SEAT-LAYOUT] Error fetching seat layout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
