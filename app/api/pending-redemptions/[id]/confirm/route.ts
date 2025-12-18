import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * POST /api/pending-redemptions/[id]/confirm - Confirm a pending redemption
 * This will activate the package by calling the main backend's redeem endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const supabase = createServerClient();
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

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

    // Handle receipt file upload if provided
    let receiptUrl: string | null = null;
    const formData = await request.formData();
    const receiptFile = formData.get("receipt") as File | null;

    if (receiptFile) {
      try {
        // Upload receipt to Supabase Storage
        const fileExt = receiptFile.name.split(".").pop();
        const fileName = `${id}-receipt-${Date.now()}.${fileExt}`;
        const filePath = `redemptions/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("bankReceipts")
          .upload(filePath, receiptFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Error uploading receipt:", uploadError);
          // Don't fail the redemption if receipt upload fails
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from("bankReceipts")
            .getPublicUrl(filePath);
          receiptUrl = urlData.publicUrl;
        }
      } catch (uploadErr) {
        console.error("Error processing receipt upload:", uploadErr);
        // Continue without receipt if upload fails
      }
    }

    // Call main backend to actually redeem the package
    try {
      const redemptionResult = await mainBackendClient.redeemPackage(
        {
          memberId: pendingRedemption.member_id,
          packageId: pendingRedemption.package_id,
          couponCode: pendingRedemption.coupon_code || undefined,
        },
        authToken
      );

      // Update pending redemption status to CONFIRMED
      const { error: updateError } = await supabase
        .from("pending_redemptions")
        .update({
          status: "CONFIRMED",
          confirmed_at: new Date().toISOString(),
          redemption_id: redemptionResult.id,
          receipt_url: receiptUrl,
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating pending redemption:", updateError);
        // Package was redeemed but status update failed - log but don't fail
      }

      return NextResponse.json({
        success: true,
        redemption: redemptionResult,
        message: "Package activated successfully",
      });
    } catch (redeemError: any) {
      console.error("Error redeeming package:", redeemError);
      return NextResponse.json(
        {
          error:
            redeemError.message ||
            "Failed to activate package. Please try again.",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error confirming pending redemption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
