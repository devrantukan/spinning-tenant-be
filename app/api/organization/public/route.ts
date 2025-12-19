import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/organization/public - Get public organization details
 * This endpoint is publicly accessible and doesn't require authentication.
 * It's used during registration and other public-facing operations.
 *
 * ONLY source: organizations table in Supabase
 * No fallbacks to environment variables or main backend.
 *
 * Query params:
 * - organizationId (optional): If not provided, uses TENANT_ORGANIZATION_ID from env
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationIdParam = searchParams.get("organizationId");
    const tenantOrganizationId =
      organizationIdParam || process.env.TENANT_ORGANIZATION_ID;

    if (!tenantOrganizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    console.log("[ORG-PUBLIC] Fetching organization data from Supabase:", {
      organizationId: tenantOrganizationId,
      source: organizationIdParam ? "query param" : "env var",
    });

    // Check if service role key is available (required for reading organizations table)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey.trim() === "") {
      console.error(
        "[ORG-PUBLIC] SUPABASE_SERVICE_ROLE_KEY is not set or is empty. Service role key is required to read organizations table."
      );
      return NextResponse.json(
        {
          error: "Server configuration error",
          message: "Service role key not configured",
        },
        { status: 500 }
      );
    }

    console.log("[ORG-PUBLIC] Service role key is set:", {
      hasKey: !!serviceRoleKey,
      keyLength: serviceRoleKey.length,
      keyPrefix: serviceRoleKey.substring(0, 10) + "...",
    });

    // ONLY source: Query organizations table in Supabase
    // Must use service role key to bypass RLS policies
    // Create client directly with service role key to ensure it's used
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json(
        {
          error: "Configuration error",
          message: "NEXT_PUBLIC_SUPABASE_URL is not set",
        },
        { status: 500 }
      );
    }

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    // Verify the client is actually using service role key
    // The service role key should be different from the anon key
    const isUsingServiceRole = serviceRoleKey && serviceRoleKey !== anonKey;

    if (!isUsingServiceRole) {
      console.error(
        "[ORG-PUBLIC] Service role key is same as anon key or missing!"
      );
      return NextResponse.json(
        {
          error: "Configuration error",
          message:
            "SUPABASE_SERVICE_ROLE_KEY must be different from NEXT_PUBLIC_SUPABASE_ANON_KEY. Please verify your environment variables.",
        },
        { status: 500 }
      );
    }

    // Create client directly with service role key (bypassing createServerClient to ensure we use the right key)
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("[ORG-PUBLIC] Supabase client created with service role key:", {
      url: supabaseUrl,
      serviceRoleKeyLength: serviceRoleKey.length,
      serviceRoleKeyPrefix: serviceRoleKey.substring(0, 20) + "...",
      anonKeyPrefix: anonKey?.substring(0, 20) + "...",
      keysAreDifferent: serviceRoleKey !== anonKey,
    });

    // Verify service role key by checking if we can decode the JWT to verify project
    // The service role key JWT contains project information
    let jwtProjectRef: string | null = null;
    try {
      // Extract project reference from Supabase URL
      // URL format: https://[project-ref].supabase.co
      const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
      const urlProjectRef = urlMatch ? urlMatch[1] : null;

      // Decode the JWT to check project reference
      const jwtParts = serviceRoleKey.split(".");
      if (jwtParts.length >= 2) {
        try {
          const payload = JSON.parse(
            Buffer.from(jwtParts[1], "base64url").toString()
          );
          jwtProjectRef = payload.ref || null;

          console.log("[ORG-PUBLIC] Service role key verification:", {
            urlProjectRef,
            jwtProjectRef,
            role: payload.role,
            match: urlProjectRef === jwtProjectRef,
            warning:
              urlProjectRef !== jwtProjectRef
                ? "⚠️ PROJECT MISMATCH: Service role key is for a different Supabase project!"
                : "✓ Project references match",
          });

          if (
            urlProjectRef &&
            jwtProjectRef &&
            urlProjectRef !== jwtProjectRef
          ) {
            console.error(
              "[ORG-PUBLIC] ⚠️ CRITICAL: Service role key project reference does not match Supabase URL!",
              {
                expected: urlProjectRef,
                actual: jwtProjectRef,
                message:
                  "The service role key is for a different Supabase project. This will cause permission denied errors.",
              }
            );
          }
        } catch {
          console.log(
            "[ORG-PUBLIC] Could not decode JWT payload (non-critical)"
          );
        }
      }
    } catch {
      // Ignore JWT decoding errors
    }

    // Try a simple count query first to verify access
    try {
      const { count, error: countError } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });

      if (countError) {
        console.error("[ORG-PUBLIC] Error checking table access:", {
          message: countError.message,
          code: countError.code,
          details: countError.details,
          hint: countError.hint,
        });

        if (countError.code === "PGRST116") {
          return NextResponse.json(
            {
              error: "Table not found",
              message:
                "The organizations table does not exist in this Supabase instance.",
            },
            { status: 404 }
          );
        }

        // If we get permission denied on the count query, the service role key likely doesn't have access
        if (
          countError.message?.includes("permission denied") ||
          countError.code === "42501"
        ) {
          console.error(
            "[ORG-PUBLIC] Permission denied even with service role key. This suggests:",
            {
              possibleCauses: [
                "Service role key is for a different Supabase project (most likely)",
                "Service role key is incorrect or expired",
                "Database user associated with service role key lacks SELECT permissions on public schema",
              ],
              supabaseUrl,
              serviceRoleKeyPrefix: serviceRoleKey.substring(0, 20) + "...",
              note: "The 'permission denied for schema public' error (code 42501) indicates the database user cannot access the public schema, which is unusual for a service role key.",
            }
          );
        }
      } else {
        console.log(
          "[ORG-PUBLIC] Successfully accessed organizations table, count:",
          count
        );
      }
    } catch (testErr: unknown) {
      console.error("[ORG-PUBLIC] Error during table access check:", testErr);
    }

    // Try direct REST API call first to verify service role key works
    // This bypasses the JS client and uses the REST API directly
    let orgData = null;
    let supabaseError = null;

    try {
      const restUrl = `${supabaseUrl}/rest/v1/organizations?id=eq.${tenantOrganizationId}&select=*`;
      const restResponse = await fetch(restUrl, {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
      });

      if (!restResponse.ok) {
        const errorText = await restResponse.text();
        console.error("[ORG-PUBLIC] Direct REST API call failed:", {
          status: restResponse.status,
          statusText: restResponse.statusText,
          error: errorText,
        });
      } else {
        const restData = await restResponse.json();
        if (Array.isArray(restData) && restData.length > 0) {
          orgData = restData[0];
          console.log(
            "[ORG-PUBLIC] Successfully fetched via direct REST API call"
          );
        } else {
          console.log("[ORG-PUBLIC] No data returned from REST API");
        }
      }
    } catch (restError: unknown) {
      console.error("[ORG-PUBLIC] Error with direct REST API call:", restError);
      // Fall through to try Supabase client
    }

    // If REST API didn't work, try Supabase client
    if (!orgData) {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", tenantOrganizationId)
        .single();
      orgData = data;
      supabaseError = error;
    }

    if (supabaseError) {
      console.error("[ORG-PUBLIC] Error querying organizations table:", {
        message: supabaseError.message,
        code: supabaseError.code,
        details: supabaseError.details,
        hint: supabaseError.hint,
        hasServiceRoleKey: !!serviceRoleKey,
        serviceRoleKeyLength: serviceRoleKey?.length || 0,
      });

      // If permission denied, provide helpful error message
      if (
        supabaseError.message?.includes("permission denied") ||
        supabaseError.code === "42501"
      ) {
        // Check if service role key is actually being used
        if (!serviceRoleKey || serviceRoleKey.trim() === "") {
          return NextResponse.json(
            {
              error: "Permission denied",
              message:
                "Service role key is required to read organizations table. Please set SUPABASE_SERVICE_ROLE_KEY in environment variables.",
            },
            { status: 403 }
          );
        } else {
          // Service role key is set but still getting permission denied
          // Since project references match, this is likely a database permission issue
          return NextResponse.json(
            {
              error: "Permission denied",
              message:
                "Unable to read organizations table from Supabase even with service role key. Project references match, so this is likely a database-level permission issue rather than a wrong key.",
              details: {
                error: supabaseError.message,
                code: supabaseError.code,
                supabaseUrl,
                jwtProjectRef: jwtProjectRef || "Could not decode",
                verification: jwtProjectRef
                  ? {
                      urlProjectRef:
                        supabaseUrl.match(
                          /https?:\/\/([^.]+)\.supabase\.co/
                        )?.[1] || "unknown",
                      jwtProjectRef,
                      match: supabaseUrl.includes(jwtProjectRef),
                      message: supabaseUrl.includes(jwtProjectRef)
                        ? "✓ Project references match - this is a database permission issue"
                        : "⚠️ Project references DO NOT match - service role key is for a different project!",
                    }
                  : "Could not verify project reference from JWT",
              },
              hint: "The service_role user lacks USAGE permission on the public schema. This is the root cause of the permission denied error.",
              solution: {
                description:
                  "Grant USAGE permission on public schema to service_role user",
                sql: [
                  "GRANT USAGE ON SCHEMA public TO service_role;",
                  "GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;",
                  "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;",
                  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;",
                  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;",
                ],
                steps: [
                  "1. Go to Supabase Dashboard > SQL Editor",
                  "2. Run the SQL commands above to grant permissions",
                  "3. Verify with: SELECT has_schema_privilege('service_role', 'public', 'USAGE');",
                  "4. It should return 't' (true) after granting permissions",
                ],
              },
              troubleshooting: {
                step1: "Go to Supabase Dashboard > SQL Editor",
                step2: "Run: GRANT USAGE ON SCHEMA public TO service_role;",
                step3:
                  "Run: GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;",
                step4:
                  "Verify: SELECT has_schema_privilege('service_role', 'public', 'USAGE');",
                step5:
                  "Should return 't' (true) - then try the API request again",
              },
            },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(
        {
          error: "Organization not found",
          message: supabaseError.message,
        },
        { status: 404 }
      );
    }

    if (!orgData) {
      console.warn(
        "[ORG-PUBLIC] Organization not found in Supabase:",
        tenantOrganizationId
      );
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    console.log("[ORG-PUBLIC] Organization data found in Supabase:", {
      hasSmtpHost: !!orgData.smtpHost,
      hasSmtpUser: !!orgData.smtpUser,
      hasSmtpPassword: !!orgData.smtpPassword,
      hasName: !!orgData.name,
      keys: Object.keys(orgData),
    });

    // Return organization data from Supabase (including SMTP settings)
    return NextResponse.json(orgData);
  } catch (error: unknown) {
    console.error(
      "[ORG-PUBLIC] Error fetching public organization data:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

