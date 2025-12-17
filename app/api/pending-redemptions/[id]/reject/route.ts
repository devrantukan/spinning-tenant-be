import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

/**
 * POST /api/pending-redemptions/[id]/reject - Reject/cancel a pending redemption
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const reason = body.reason || "Rejected by admin";
    const supabase = createServerClient();

    // Get the pending redemption
    const { data: pendingRedemption, error: fetchError } = await supabase
      .from("pending_redemptions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !pendingRedemption) {
      return NextResponse.json(
        { error: "Pending redemption not found" },
        { status: 404 }
      );
    }

    if (pendingRedemption.status !== "PENDING") {
      return NextResponse.json(
        { error: `Redemption is already ${pendingRedemption.status}` },
        { status: 400 }
      );
    }

    // Update status to REJECTED
    const { error: updateError } = await supabase
      .from("pending_redemptions")
      .update({
        status: "REJECTED",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating pending redemption:", updateError);
      return NextResponse.json(
        { error: "Failed to reject redemption" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Redemption rejected successfully",
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error rejecting pending redemption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
