import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Zod validation schema for contact form
const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 10,
      "Phone number must be at least 10 characters"
    ),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters")
    .trim(),
});

/**
 * POST /api/contact - Submit contact form
 * Public endpoint - no authentication required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validationResult = contactFormSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues.map((err) => ({
            field: err.path[0],
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { name, email, phone, message } = validationResult.data;
    const organizationEmail = process.env.SMTP_FROM_EMAIL || "info@spin8studio.com";

    // Get organization ID
    const organizationId =
      process.env.ORGANIZATION_ID || process.env.TENANT_ORGANIZATION_ID;

    if (!organizationId) {
      console.error("[CONTACT] Organization ID not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 1. Send email notification
    try {
      const { sendContactFormEmail } = await import("@/lib/email");
      await sendContactFormEmail(organizationEmail, {
        name,
        email,
        phone,
        message,
      });
      console.log("[CONTACT] Notification email sent to:", organizationEmail);
    } catch (emailError) {
      console.error("[CONTACT] Failed to send notification email:", emailError);
      // Continue anyway, we want to store the submission if possible
    }

    // 2. Store in main backend
    try {
      const { mainBackendClient } = await import("@/lib/main-backend-client");
      await mainBackendClient.createContactSubmission({
        name,
        email,
        phone,
        message,
      });
      console.log("[CONTACT] Submission stored via main backend client");
    } catch (dbError) {
      console.error("[CONTACT] Failed to store submission in main backend:", dbError);
    }

    console.log("[CONTACT] New contact form submission processed:", {
      organizationId,
      name,
      email,
      phone: phone || "not provided",
      messageLength: message.length,
      timestamp: new Date().toISOString(),
    });


    return NextResponse.json(
      {
        success: true,
        message: "Contact form submitted successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[CONTACT] Error processing contact form:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

