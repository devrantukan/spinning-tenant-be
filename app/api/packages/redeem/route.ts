import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * POST /api/packages/redeem - Redeem a package (direct or with coupon)
 *
 * Body:
 * {
 *   memberId: string,
 *   packageId?: string,        // For direct package purchase
 *   couponCode?: string,        // Optional coupon code
 *   couponId?: string,          // Or coupon ID
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const body = await request.json();

    // Ensure redemption is for this organization
    const redemptionData = {
      ...body,
      organizationId: user.organizationId,
      redeemedBy: user.id,
    };

    const redemption = await mainBackendClient.redeemPackage(
      redemptionData,
      authToken
    );

    return NextResponse.json(redemption, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error redeeming package:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



