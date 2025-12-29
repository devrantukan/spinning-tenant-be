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

    // Store contact form submission in Supabase
    // For now, we'll log it and return success
    // In production, you might want to:
    // 1. Store in a contact_submissions table
    // 2. Send email notification to organization
    // 3. Store in a CRM system

    console.log("[CONTACT] New contact form submission:", {
      organizationId,
      name,
      email,
      phone: phone || "not provided",
      messageLength: message.length,
      timestamp: new Date().toISOString(),
    });

    // TODO: Store in database or send email notification
    // Example: await prisma.contactSubmission.create({ ... })
    // Example: await sendContactFormEmail({ ... })

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

