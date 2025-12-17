import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/redemptions/[id] - Get a specific redemption
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    const redemption = await mainBackendClient.getRedemption(id, authToken);

    return NextResponse.json(redemption);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 404) {
      return NextResponse.json(
        { error: "Redemption not found" },
        { status: 404 }
      );
    }
    console.error("Error fetching redemption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



