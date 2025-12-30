import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/contact/list - Fetch contact form submissions
 * Admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const user = await requireAuth(request);
    
    // 2. Check if user is an admin
    if (user.role !== "ADMIN" && user.role !== "TENANT_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // 3. Get organization ID
    const organizationId =
      process.env.ORGANIZATION_ID || process.env.TENANT_ORGANIZATION_ID;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 4. Fetch from main backend
    const { mainBackendClient } = await import("@/lib/main-backend-client");
    const data = await mainBackendClient.getContactSubmissions(authToken);

    return NextResponse.json(data || []);

  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[CONTACT-LIST] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
