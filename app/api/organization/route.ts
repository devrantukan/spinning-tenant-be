import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/organization - Get the tenant organization details
 * Supports:
 * - Authenticated requests (returns full org data)
 * - API key + organization ID header (for server-to-server, returns public data like SMTP)
 * PATCH /api/organization - Update the tenant organization details
 */
export async function GET(request: NextRequest) {
  try {
    // Check for API key authentication (for server-to-server requests during registration)
    const apiKey = request.headers.get("X-API-Key");
    const organizationIdHeader = request.headers.get("X-Organization-Id");
    const mainBackendApiKey = process.env.MAIN_BACKEND_API_KEY;
    const tenantOrganizationId = process.env.TENANT_ORGANIZATION_ID;

    console.log("[ORG] Request received:", {
      hasApiKey: !!apiKey,
      apiKeyValue: apiKey ? `${apiKey.substring(0, 10)}...` : "none",
      hasOrgIdHeader: !!organizationIdHeader,
      orgIdHeader: organizationIdHeader,
      hasMainBackendApiKey: !!mainBackendApiKey,
      mainBackendApiKeyValue: mainBackendApiKey
        ? `${mainBackendApiKey.substring(0, 10)}...`
        : "NOT SET - Please set MAIN_BACKEND_API_KEY in .env",
      tenantOrgId: tenantOrganizationId,
    });

    // If API key matches and organization ID matches, allow access without user auth
    // This is needed for fetching SMTP settings during registration
    if (
      apiKey &&
      mainBackendApiKey &&
      apiKey === mainBackendApiKey &&
      organizationIdHeader &&
      tenantOrganizationId &&
      organizationIdHeader === tenantOrganizationId
    ) {
      console.log(
        "[ORG] API key authentication successful - fetching organization for SMTP settings"
      );
      try {
        const authToken = request.headers
          .get("authorization")
          ?.replace("Bearer ", "");
        const organization = await mainBackendClient.getOrganization(authToken);
        console.log("[ORG] Organization fetched successfully:", {
          hasSmtpHost: !!organization?.smtpHost,
          hasSmtpUser: !!organization?.smtpUser,
          hasSmtpPassword: !!organization?.smtpPassword,
          keys: organization ? Object.keys(organization) : [],
        });
        return NextResponse.json(organization);
      } catch (orgError: any) {
        // Main backend /api/organizations requires user authentication, not API key
        // This is expected behavior - skip retry and go straight to Supabase fallback
        if (orgError.status === 401 || orgError.message === "Unauthorized") {
          console.log(
            "[ORG] Main backend requires user authentication (API key not supported for this endpoint). Attempting to query Supabase directly for organization data."
          );
        } else {
          // For other errors, try without auth token as fallback
          console.log(
            "[ORG] Trying to fetch organization without auth token for API key request"
          );
          try {
            const organization = await mainBackendClient.getOrganization(
              undefined
            );
            console.log("[ORG] Organization fetched without auth token:", {
              hasSmtpHost: !!organization?.smtpHost,
              hasSmtpUser: !!organization?.smtpUser,
              hasSmtpPassword: !!organization?.smtpPassword,
              keys: organization ? Object.keys(organization) : [],
            });
            return NextResponse.json(organization);
          } catch (fallbackError: any) {
            // If still unauthorized, proceed to Supabase fallback
            if (
              fallbackError.status === 401 ||
              fallbackError.message === "Unauthorized"
            ) {
              console.log(
                "[ORG] Main backend requires user authentication. Attempting to query Supabase directly for organization data."
              );
            } else {
              console.error(
                "[ORG] Unexpected error fetching organization:",
                fallbackError
              );
              return NextResponse.json(
                { error: "Failed to fetch organization data" },
                { status: 500 }
              );
            }
          }
        }

        // If main backend doesn't support API key auth, try querying Supabase directly
        try {
          // Try to get organization data from Supabase if it's stored there
          const { createServerClient } = await import("@/lib/supabase");
          const supabase = createServerClient();

          // Query organizations table if it exists
          const { data: orgData, error: supabaseError } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", tenantOrganizationId)
            .single();

          if (!supabaseError && orgData) {
            console.log("[ORG] Organization data found in Supabase:", {
              hasSmtpHost: !!orgData.smtpHost,
              hasSmtpUser: !!orgData.smtpUser,
              hasSmtpPassword: !!orgData.smtpPassword,
              keys: Object.keys(orgData),
            });
            return NextResponse.json(orgData);
          } else {
            console.log(
              "[ORG] Organization not found in Supabase or table doesn't exist:",
              supabaseError?.message
            );
          }
        } catch (supabaseQueryError) {
          console.error("[ORG] Error querying Supabase:", supabaseQueryError);
        }

        // If all else fails, return minimal data - frontend will use env vars
        console.warn(
          "[ORG] Cannot fetch organization data from main backend or Supabase. Returning minimal data. SMTP settings should be configured via environment variables."
        );
        return NextResponse.json({
          name: process.env.ORGANIZATION_NAME || "Spin8 Studio",
          id: tenantOrganizationId,
        });
      }
    } else {
      console.log("[ORG] API key authentication failed or not provided:", {
        apiKeyMatches: apiKey === mainBackendApiKey,
        orgIdMatches: organizationIdHeader === tenantOrganizationId,
        hasApiKey: !!apiKey,
        hasMainBackendApiKey: !!mainBackendApiKey,
        hasOrgIdHeader: !!organizationIdHeader,
        hasTenantOrgId: !!tenantOrganizationId,
      });
    }

    // Otherwise, require user authentication
    const user = await requireAuth(request);
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    const organization = await mainBackendClient.getOrganization(authToken);

    return NextResponse.json(organization);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const body = await request.json();

    // Use the tenant's organization ID
    const organization = await mainBackendClient.updateOrganization(
      user.organizationId,
      body,
      authToken
    );

    return NextResponse.json(organization);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
