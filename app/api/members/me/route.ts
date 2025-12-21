import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/members/me - Get the current authenticated user's member information
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    // Get all members and find the one for this user
    const members = await mainBackendClient.getMembers(authToken);
    const member = Array.isArray(members)
      ? members.find((m: any) => m.userId === user.id || m.user?.id === user.id)
      : null;

    if (!member) {
      return NextResponse.json(
        { error: "Member not found. Please contact support." },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}





