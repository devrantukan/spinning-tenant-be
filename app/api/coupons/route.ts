import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/coupons - Get all coupons for the tenant organization
 * POST /api/coupons - Create a new coupon
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    const coupons = await mainBackendClient.getCoupons(authToken);

    return NextResponse.json(coupons);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching coupons:", error);
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

    // Ensure the coupon is for this organization
    const couponData = {
      ...body,
      organizationId: user.organizationId,
    };

    const coupon = await mainBackendClient.createCoupon(couponData, authToken);

    return NextResponse.json(coupon, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating coupon:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



