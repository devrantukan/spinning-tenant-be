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

    // Query package_redemptions table and filter for PENDING status
    const { data, error } = await supabase
      .from("package_redemptions")
      .select("*")
      .eq("status", "PENDING")
      .order("createdAt", { ascending: false });

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
        error.code === "42P01" || // relation does not exist (PostgreSQL)
        error.code === "42501" || // insufficient privilege (PostgreSQL)
        error.code === "PGRST205" || // table not found in schema cache (PostgREST)
        error.message?.includes("does not exist") ||
        error.message?.includes("Could not find the table") ||
        error.message?.includes("permission denied")
      ) {
        console.warn(
          "package_redemptions table may not exist or lacks permissions. Returning empty array.",
          {
            errorCode: error.code,
            errorMessage: error.message,
            hint: error.hint,
          }
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
            ? packages.find(
                (p: any) =>
                  p.id === redemption.packageId ||
                  p.id === redemption.package_id
              )
            : null;
          return {
            ...redemption,
            // Map package_redemptions fields to expected format
            package_id: redemption.packageId || redemption.package_id,
            package_name:
              packageInfo?.name ||
              redemption.packageId ||
              redemption.package_id,
            package_code: packageInfo?.code,
            // Map member fields
            member_id: redemption.memberId || redemption.member_id,
            // Map other fields
            customer_email:
              redemption.member?.user?.email || redemption.customer_email,
            customer_name:
              redemption.member?.user?.name || redemption.customer_name,
            amount: redemption.finalPrice || redemption.amount,
            payment_type:
              redemption.paymentType ||
              redemption.payment_type ||
              "BANK_TRANSFER",
            order_id: redemption.id, // Use redemption ID as order_id for bank transfers
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



