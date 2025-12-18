import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/coupons/code/[code] - Get a coupon by code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await requireAuth(request);
    const { code } = await params;
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    const coupon = await mainBackendClient.getCouponByCode(code, authToken);

    return NextResponse.json(coupon);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 404) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    console.error("Error fetching coupon by code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




