import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";
import { createServerClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

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

        const { error: uploadError } = await supabase.storage
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

    // Get redemption details before approving (for email)
    let redemptionBeforeApprove: {
      memberId: string;
      packageId?: string;
      member?: { user?: { email?: string; name?: string } };
      package?: { name?: string; code?: string };
      creditsAdded?: number;
    } | null = null;
    try {
      redemptionBeforeApprove = await mainBackendClient.getRedemption(
        id,
        authToken
      );
    } catch (fetchError) {
      console.log(
        "[EMAIL] Could not fetch redemption before approve:",
        fetchError
      );
    }

    // Call main backend to approve the redemption
    const result = await mainBackendClient.approveRedemption(id, authToken);

    // Send confirmation email to the customer
    let organization: {
      smtpHost?: string | null;
      smtpUser?: string | null;
      smtpPassword?: string | null;
      language?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null = null;

    if (redemptionBeforeApprove) {
      try {
        console.log(
          "[EMAIL] Starting email send process for redemption approval:",
          {
            redemptionId: id,
            memberId: redemptionBeforeApprove.memberId,
          }
        );

        // Get organization data for SMTP settings and email content
        try {
          organization = await mainBackendClient.getOrganization(authToken);
          console.log("[EMAIL] Organization data fetched:", {
            hasSmtpHost: !!organization?.smtpHost,
            hasSmtpUser: !!organization?.smtpUser,
            hasSmtpPassword: !!organization?.smtpPassword,
            language: organization?.language,
          });
        } catch (orgError: unknown) {
          const err = orgError as { message?: string };
          console.error(
            "[EMAIL] Could not fetch organization data for email:",
            err?.message || String(orgError)
          );
        }

        // Get member details for name and email
        let memberName = "";
        let customerEmail = "";
        try {
          const member = await mainBackendClient.getMember(
            redemptionBeforeApprove.memberId,
            authToken
          );
          if (member?.user?.name) {
            memberName = member.user.name;
          }
          if (member?.user?.email) {
            customerEmail = member.user.email;
          }
        } catch (memberError) {
          console.log("[EMAIL] Could not fetch member details:", memberError);
        }

        // Fallback to redemption data if member fetch failed
        if (!customerEmail && redemptionBeforeApprove.member?.user?.email) {
          customerEmail = redemptionBeforeApprove.member.user.email;
        }
        if (!memberName && redemptionBeforeApprove.member?.user?.name) {
          memberName = redemptionBeforeApprove.member.user.name;
        }

        if (!customerEmail) {
          console.error("[EMAIL] No customer email found for redemption:", id);
          throw new Error("Customer email not found");
        }

        // Get package details
        let packageData: {
          name?: string;
          code?: string;
          credits?: number;
        } | null = null;
        if (redemptionBeforeApprove.packageId) {
          try {
            packageData = await mainBackendClient.getPackage(
              redemptionBeforeApprove.packageId,
              authToken
            );
          } catch (packageError) {
            console.error(
              "[EMAIL] Could not fetch package details:",
              packageError
            );
          }
        }

        // Determine language
        const lang = organization?.language === "tr" ? "tr" : "en";

        // Email translations (same as confirm endpoint)
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
        const packageName =
          packageData?.name ||
          redemptionBeforeApprove.package?.name ||
          "Package";
        const packageCode =
          packageData?.code || redemptionBeforeApprove.package?.code || "";
        const credits =
          result?.creditsAdded ||
          redemptionBeforeApprove.creditsAdded ||
          packageData?.credits ||
          0;

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

        // Validate email address
        if (!customerEmail || !customerEmail.includes("@")) {
          console.error("[EMAIL] Invalid email address:", customerEmail);
          throw new Error(`Invalid email address: ${customerEmail}`);
        }

        console.log("[EMAIL] Attempting to send email:", {
          to: customerEmail,
          subject: t.subject,
          hasOrganization: !!organization,
          hasSmtpConfig: !!(organization?.smtpHost || process.env.SMTP_HOST),
        });

        // Send email
        await sendEmail(
          {
            to: customerEmail,
            subject: t.subject,
            html: emailHtml,
          },
          organization
        );

        console.log(
          "[EMAIL] ✓ Package activation confirmation email sent successfully to:",
          customerEmail
        );
      } catch (emailError: unknown) {
        // Don't fail the approval if email fails, but log the error
        const emailErr = emailError as { message?: string; stack?: string };
        console.error("[EMAIL] ✗ Error sending confirmation email:", {
          error: emailErr?.message || String(emailError),
          stack: emailErr?.stack,
          redemptionId: id,
          hasOrganization: !!organization,
        });

        // Log SMTP config status
        if (emailErr?.message?.includes("SMTP configuration not found")) {
          console.error(
            "[EMAIL] SMTP configuration issue - check organization settings or environment variables"
          );
        }
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      status?: number;
      errorData?: { error?: string };
    };
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error approving redemption:", err);
    return NextResponse.json(
      {
        error:
          err.errorData?.error || err.message || "Failed to approve redemption",
      },
      { status: err.status || 500 }
    );
  }
}
