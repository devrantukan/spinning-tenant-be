import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";
import { sendBankTransferOrderEmails } from "@/lib/email";

/**
 * POST /api/packages/redeem - Redeem a package (direct or with coupon)
 *
 * Body:
 * {
 *   memberId: string,
 *   packageId?: string,        // For direct package purchase
 *   couponCode?: string,        // Optional coupon code
 *   couponId?: string,          // Or coupon ID
 *   paymentType?: string,       // Payment method: "CREDIT_CARD" | "BANK_TRANSFER"
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

    // Send emails if payment type is BANK_TRANSFER
    if (body.paymentType === "BANK_TRANSFER") {
      try {
        // Get customer email from user
        const customerEmail = user.email;

        // Get organization data (for email and SMTP settings)
        let organization: any = null;
        let organizationEmail = "info@spin8studio.com";
        try {
          organization = await mainBackendClient.getOrganization(authToken);
          if (organization?.email) {
            organizationEmail = organization.email;
          }
        } catch (orgError) {
          console.log(
            "[EMAIL] Could not fetch organization data, using defaults"
          );
        }

        // Get package details from redemption response or fetch separately
        let packageName = "Package";
        let packageCode = "";
        let price = 0;
        let finalPrice = 0;
        let discountAmount = 0;
        let memberName = "";

        // Try to get package details from redemption response
        if (redemption?.package) {
          packageName = redemption.package.name || packageName;
          packageCode = redemption.package.code || packageCode;
        }

        // Try to get member details
        if (redemption?.member?.user) {
          memberName = redemption.member.user.name || user.email || "";
        } else if (body.memberId) {
          // Fetch member details if not in redemption response
          try {
            const member = await mainBackendClient.getMember(
              body.memberId,
              authToken
            );
            if (member?.user?.name) {
              memberName = member.user.name;
            }
          } catch (memberError) {
            console.error(
              "[EMAIL] Could not fetch member details:",
              memberError
            );
          }
        }

        // Get pricing details from redemption
        if (redemption?.finalPrice) {
          finalPrice = redemption.finalPrice;
        }
        if (redemption?.originalPrice) {
          price = redemption.originalPrice;
          discountAmount = price - finalPrice;
        }

        // If package details are missing, try to fetch the package
        if (body.packageId && (!packageName || packageName === "Package")) {
          try {
            const packages = await mainBackendClient.getPackages(authToken);
            const pkg = Array.isArray(packages)
              ? packages.find((p: any) => p.id === body.packageId)
              : null;
            if (pkg) {
              packageName = pkg.name || packageName;
              packageCode = pkg.code || packageCode;
              price = pkg.price || price;
              if (!finalPrice) {
                finalPrice = price;
              }
            }
          } catch (pkgError) {
            console.error("[EMAIL] Could not fetch package details:", pkgError);
          }
        }

        // Send emails
        await sendBankTransferOrderEmails(
          customerEmail,
          organizationEmail,
          {
            packageName,
            packageCode,
            price,
            finalPrice,
            discountAmount: discountAmount > 0 ? discountAmount : undefined,
            couponCode: body.couponCode,
            memberName,
            orderId: redemption?.id,
          },
          organization
        );

        console.log("[EMAIL] Bank transfer order emails sent successfully");
      } catch (emailError: any) {
        // Log email error but don't fail the redemption
        console.error(
          "[EMAIL] Error sending bank transfer order emails:",
          emailError
        );
        // Continue - redemption was successful, email failure shouldn't block it
      }
    }

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



