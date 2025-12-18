import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/pending-redemptions - Get all pending redemptions
 * Enriches with package and member information
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const supabase = createServerClient();
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    const { data, error } = await supabase
      .from("pending_redemptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending redemptions from Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      // If table doesn't exist or permission denied, return empty array instead of error
      // This allows the page to load even if the table hasn't been created yet
      if (
        error.code === "42P01" || // relation does not exist
        error.code === "42501" || // insufficient privilege
        error.message?.includes("does not exist") ||
        error.message?.includes("permission denied")
      ) {
        console.warn(
          "pending_redemptions table may not exist or lacks permissions. Returning empty array."
        );
        return NextResponse.json([]);
      }

      return NextResponse.json(
        {
          error: "Failed to fetch pending redemptions",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    // Enrich with package information
    if (data && data.length > 0) {
      try {
        const packages = await mainBackendClient.getPackages(authToken);
        const enrichedData = data.map((redemption: any) => {
          const packageInfo = Array.isArray(packages)
            ? packages.find((p: any) => p.id === redemption.package_id)
            : null;
          return {
            ...redemption,
            package_name: packageInfo?.name || redemption.package_id,
            package_code: packageInfo?.code,
          };
        });
        return NextResponse.json(enrichedData);
      } catch (enrichError: any) {
        console.error("Error enriching pending redemptions:", enrichError);
        // Return data without enrichment if enrichment fails
        // This allows the page to still show pending redemptions even if package info can't be fetched
        return NextResponse.json(data || []);
      }
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error in pending redemptions API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

