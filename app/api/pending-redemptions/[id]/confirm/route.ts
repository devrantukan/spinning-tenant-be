import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { mainBackendClient } from "@/lib/main-backend-client";
import { sendEmail } from "@/lib/email";

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

      // Send confirmation email to the customer
      try {
        // Get organization data for SMTP settings and email content
        let organization: any = null;
        try {
          organization = await mainBackendClient.getOrganization(authToken);
        } catch (orgError) {
          console.log(
            "[EMAIL] Could not fetch organization data for email, using defaults"
          );
        }

        // Get package details
        let packageData: any = null;
        try {
          packageData = await mainBackendClient.getPackage(
            pendingRedemption.package_id,
            authToken
          );
        } catch (packageError) {
          console.error(
            "[EMAIL] Could not fetch package details:",
            packageError
          );
        }

        // Get member details for name
        let memberName = pendingRedemption.customer_name || "";
        try {
          const member = await mainBackendClient.getMember(
            pendingRedemption.member_id,
            authToken
          );
          if (member?.user?.name) {
            memberName = member.user.name;
          }
        } catch (memberError) {
          console.log(
            "[EMAIL] Could not fetch member details, using customer_name from pending redemption"
          );
        }

        // Determine language
        const lang = organization?.language === "tr" ? "tr" : "en";

        // Email translations
        const emailTranslations = {
          en: {
            subject: "Package Activated - Spin8 Studio",
            greeting: "Dear",
            thankYou:
              "Great news! Your package has been activated successfully.",
            packageDetails: "Package Details",
            package: "Package",
            credits: "Credits",
            activated: "Your package is now active and ready to use!",
            nextSteps: "Next Steps",
            nextStepsText:
              "You can now use your credits to book spinning classes. Log in to your account to start booking.",
            questions:
              "If you have any questions, please don't hesitate to contact us.",
            bestRegards: "Best regards",
            team: "Spin8 Studio Team",
            phone: "Phone",
          },
          tr: {
            subject: "Paket Aktifleştirildi - Spin8 Studio",
            greeting: "Sayın",
            thankYou: "Harika haber! Paketiniz başarıyla aktifleştirildi.",
            packageDetails: "Paket Detayları",
            package: "Paket",
            credits: "Kredi",
            activated: "Paketiniz artık aktif ve kullanıma hazır!",
            nextSteps: "Sonraki Adımlar",
            nextStepsText:
              "Artık kredilerinizi kullanarak spinning dersleri rezerve edebilirsiniz. Rezervasyon yapmak için hesabınıza giriş yapın.",
            questions:
              "Herhangi bir sorunuz varsa, lütfen bizimle iletişime geçmekten çekinmeyin.",
            bestRegards: "Saygılarımızla",
            team: "Spin8 Studio Ekibi",
            phone: "Telefon",
          },
        };

        const t = emailTranslations[lang];

        // Build email HTML
        const packageName = packageData?.name || "Package";
        const packageCode = packageData?.code || "";
        const credits =
          redemptionResult?.creditsAdded || packageData?.credits || 0;
        const currency = organization?.currency || "TRY";
        const currencySymbol =
          currency === "TRY" ? "₺" : currency === "USD" ? "$" : "";

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .package-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .label { font-weight: bold; color: #6b7280; }
              .value { color: #111827; }
              .success { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 0.9em; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${
                  lang === "tr" ? "Paket Aktifleştirildi" : "Package Activated"
                }</h1>
              </div>
              <div class="content">
                <p>${t.greeting} ${
          memberName || (lang === "tr" ? "Müşteri" : "Customer")
        },</p>
                <p>${t.thankYou}</p>
                
                <div class="package-details">
                  <h2 style="margin-top: 0;">${t.packageDetails}</h2>
                  <div class="detail-row">
                    <span class="label">${t.package}:</span>
                    <span class="value">${packageName}${
          packageCode ? ` (${packageCode})` : ""
        }</span>
                  </div>
                  ${
                    credits > 0
                      ? `
                  <div class="detail-row">
                    <span class="label">${t.credits}:</span>
                    <span class="value">${credits}</span>
                  </div>
                  `
                      : ""
                  }
                </div>

                <div class="success">
                  <strong>✓ ${t.activated}</strong>
                </div>

                <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <strong>${t.nextSteps}:</strong><br>
                  ${t.nextStepsText}
                </div>

                <p>${t.questions}</p>
                
                <div class="footer">
                  <p>${t.bestRegards},<br>${t.team}</p>
                  <p>${organization?.email || "info@spin8studio.com"}<br>${
          t.phone
        }: ${organization?.phone || "+90 544 157 15 49"}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email
        await sendEmail(
          {
            to: pendingRedemption.customer_email,
            subject: t.subject,
            html: emailHtml,
          },
          organization
        );

        console.log(
          "[EMAIL] Package activation confirmation email sent to:",
          pendingRedemption.customer_email
        );
      } catch (emailError: any) {
        // Don't fail the redemption if email fails
        console.error("[EMAIL] Error sending confirmation email:", emailError);
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
