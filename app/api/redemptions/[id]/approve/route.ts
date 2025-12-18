import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";
import { createServerClient } from "@/lib/supabase";

/**
 * POST /api/redemptions/[id]/approve - Approve a PENDING redemption from main backend
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    // Handle receipt file upload if provided
    const formData = await request.formData();
    const receiptFile = formData.get("receipt") as File | null;

    let receiptUrl: string | null = null;
    if (receiptFile) {
      try {
        const supabase = createServerClient();
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
          console.log(
            `Receipt uploaded successfully for redemption ${id}:`,
            receiptUrl
          );
        }
      } catch (uploadErr) {
        console.error("Error processing receipt upload:", uploadErr);
        // Continue without receipt if upload fails
      }
    }

    // Call main backend to approve the redemption
    const result = await mainBackendClient.approveRedemption(id, authToken);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error approving redemption:", error);
    return NextResponse.json(
      {
        error:
          error.errorData?.error ||
          error.message ||
          "Failed to approve redemption",
      },
      { status: error.status || 500 }
    );
  }
}
