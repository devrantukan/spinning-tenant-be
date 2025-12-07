/**
 * Authentication utilities for tenant backend
 * Validates Supabase JWT tokens and ensures user belongs to the tenant organization
 */

import { NextRequest } from "next/server";
import { createServerClient } from "./supabase";
import { mainBackendClient } from "./main-backend-client";

export interface AuthUser {
  id: string;
  email: string;
  supabaseUserId: string;
  organizationId: string;
  role: string;
}

interface BackendUser {
  id: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

interface BackendMember {
  user?: {
    email?: string;
    role?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const TENANT_ORGANIZATION_ID = process.env.TENANT_ORGANIZATION_ID;

if (!TENANT_ORGANIZATION_ID) {
  throw new Error("TENANT_ORGANIZATION_ID environment variable is required");
}

// TypeScript assertion: we've verified it's not undefined above
const TENANT_ORG_ID: string = TENANT_ORGANIZATION_ID;

/**
 * Get authenticated user from Supabase session
 * Verifies the user belongs to this tenant's organization
 */
export async function getAuthUser(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    console.log("[AUTH] Starting authentication process");
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[AUTH] No authorization header or invalid format");
      return null;
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[AUTH] Token extracted, verifying with Supabase...");

    // Verify token with Supabase
    const serverSupabase = createServerClient();
    const {
      data: { user: supabaseUser },
      error: supabaseError,
    } = await serverSupabase.auth.getUser(token);

    if (supabaseError || !supabaseUser) {
      console.log("[AUTH] Supabase token verification failed:", {
        error: supabaseError?.message,
        hasUser: !!supabaseUser,
      });
      return null;
    }

    console.log("[AUTH] Supabase token verified successfully:", {
      userId: supabaseUser.id,
      email: supabaseUser.email,
    });

    // Verify user belongs to this tenant's organization by checking organization endpoint
    // The main backend will return 401/403 if user doesn't belong to the organization
    try {
      console.log("[AUTH] Checking organization membership...", {
        userEmail: supabaseUser.email,
        expectedOrgId: TENANT_ORG_ID,
        mainBackendUrl: process.env.MAIN_BACKEND_URL || "http://localhost:3000",
      });
      let organization;
      try {
        organization = await mainBackendClient.getOrganization(token);
      } catch (orgError: unknown) {
        const error = orgError as {
          message?: string;
          status?: number;
          statusText?: string;
          errorData?: unknown;
        };
        console.error(
          "[AUTH] Failed to fetch organization from main backend:",
          {
            error: error.message,
            status: error.status,
            statusText: error.statusText,
            errorData: error.errorData,
          }
        );

        // If unauthorized, the user doesn't belong to this organization
        if (error.status === 401 || error.message?.includes("Unauthorized")) {
          console.log("[AUTH] User unauthorized for organization:", {
            email: supabaseUser.email,
            userId: supabaseUser.id,
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            errorData: error.errorData,
            expectedOrgId: TENANT_ORG_ID,
            mainBackendUrl:
              process.env.MAIN_BACKEND_URL || "http://localhost:3000",
          });
          console.log("[AUTH] This usually means:");
          console.log(
            "[AUTH]   1. User was created in the main backend but assigned to a different organization"
          );
          console.log(
            "[AUTH]   2. The main backend's auth.ts auto-creates users but assigns them to the first/default org"
          );
          console.log(
            "[AUTH]   3. User needs to be manually assigned to organization: " +
              TENANT_ORG_ID
          );
          console.log(
            "[AUTH]   4. Solution: Update the main backend's lib/auth.ts to use organizationId from query params when creating users"
          );
          console.log(
            "[AUTH]   5. Or manually update the user's organizationId in the main backend database"
          );
          return null;
        }
        // Re-throw other errors
        throw error;
      }

      console.log("[AUTH] Organization fetched successfully:", {
        orgId: organization.id,
        orgName: organization.name,
        expectedOrgId: TENANT_ORG_ID,
        matches: organization.id === TENANT_ORG_ID,
      });

      // Verify the organization matches our tenant
      if (organization.id !== TENANT_ORG_ID) {
        console.warn(
          `[AUTH] Organization mismatch: ${organization.id} does not match tenant organization ${TENANT_ORG_ID}`
        );
        return null;
      }

      console.log("[AUTH] Organization verification passed");

      // Fetch user's role from main backend
      // Try users endpoint first (for admins), then members endpoint (for regular users)
      let userRole = "MEMBER"; // Default role
      const userEmail = supabaseUser.email;

      console.log("[AUTH] Fetching user role for:", userEmail);

      if (userEmail) {
        // Use /api/users/me endpoint which doesn't require admin access
        // This avoids the circular dependency where we need the role to access /api/users
        console.log(
          "[AUTH] Attempting to fetch role from /api/users/me endpoint..."
        );
        try {
          const currentUser = (await mainBackendClient.getCurrentUser(
            token
          )) as BackendUser;

          if (currentUser?.role) {
            // Map main backend role to tenant backend role
            // Main backend uses "ADMIN", tenant backend uses "TENANT_ADMIN"
            const mainBackendRole = currentUser.role;
            userRole =
              mainBackendRole === "ADMIN" ? "TENANT_ADMIN" : mainBackendRole;
            console.log("[AUTH] Role found in /api/users/me endpoint:", {
              mainBackendRole,
              tenantRole: userRole,
              email: userEmail,
              userId: currentUser.id,
            });
          } else {
            console.log(
              "[AUTH] No role found in current user response, will try members endpoint"
            );
          }
        } catch (meError: unknown) {
          // If /api/users/me fails, log error and try members endpoint as fallback
          const error = meError as { status?: number; message?: string };
          console.error("[AUTH] /api/users/me endpoint failed:", {
            status: error.status,
            message: error.message,
            email: userEmail,
          });

          // Try members endpoint as fallback
          if (error.status === 401 || error.status === 403) {
            // User doesn't have admin access, try members endpoint
            console.log(
              "[AUTH] User doesn't have admin access, trying members endpoint..."
            );
            try {
              const members = (await mainBackendClient.getMembers(
                token
              )) as BackendMember[];
              console.log(
                "[AUTH] Members endpoint successful, found",
                members.length,
                "members"
              );
              const member = members.find(
                (m: BackendMember) => m.user?.email === userEmail
              );
              if (member?.user?.role) {
                // Map main backend role to tenant backend role
                const mainBackendRole = member.user.role;
                userRole =
                  mainBackendRole === "ADMIN"
                    ? "TENANT_ADMIN"
                    : mainBackendRole;
                console.log("[AUTH] Role found in members endpoint:", {
                  mainBackendRole,
                  tenantRole: userRole,
                  email: userEmail,
                });
              } else {
                console.log(
                  "[AUTH] User not found in members list, using default role: MEMBER"
                );
              }
            } catch (membersError: unknown) {
              // If members endpoint also fails, log warning but continue with default role
              const memError = membersError as {
                status?: number;
                message?: string;
              };
              console.log("[AUTH] Members endpoint failed:", {
                status: memError.status,
                message: memError.message,
                email: userEmail,
              });
              if (memError.status !== 401 && memError.status !== 403) {
                console.warn(
                  "[AUTH] Could not fetch user role from members endpoint:",
                  memError.message
                );
              }
              console.log("[AUTH] Using default role: MEMBER");
              // Continue with default role
            }
          } else {
            // Other error from users endpoint
            console.warn(
              "[AUTH] Error fetching users for role check:",
              error.message
            );
            // Try members endpoint as fallback
            console.log("[AUTH] Trying members endpoint as fallback...");
            try {
              const members = (await mainBackendClient.getMembers(
                token
              )) as BackendMember[];
              const member = members.find(
                (m: BackendMember) => m.user?.email === userEmail
              );
              if (member?.user?.role) {
                const mainBackendRole = member.user.role;
                userRole =
                  mainBackendRole === "ADMIN"
                    ? "TENANT_ADMIN"
                    : mainBackendRole;
                console.log("[AUTH] Role found in members fallback:", {
                  mainBackendRole,
                  tenantRole: userRole,
                });
              } else {
                console.log(
                  "[AUTH] User not found in members fallback, using default role"
                );
              }
            } catch {
              console.log(
                "[AUTH] Members fallback also failed, using default role: MEMBER"
              );
              // Continue with default role
            }
          }
        }
      } else {
        console.log("[AUTH] No user email found, using default role: MEMBER");
      }

      console.log("[AUTH] Final role determined:", {
        email: userEmail,
        role: userRole,
      });

      const authUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        supabaseUserId: supabaseUser.id,
        organizationId: TENANT_ORG_ID,
        role: userRole,
      };

      console.log("[AUTH] Authentication successful:", {
        userId: authUser.id,
        email: authUser.email,
        role: authUser.role,
        organizationId: authUser.organizationId,
      });

      return authUser;
    } catch (error: unknown) {
      // If main backend returns 401/403, user doesn't belong to this organization
      const err = error as { status?: number; message?: string };
      const status = err.status || 0;
      const isUnauthorized =
        status === 401 ||
        status === 403 ||
        err.message?.includes("401") ||
        err.message?.includes("403") ||
        err.message?.includes("Unauthorized");

      if (isUnauthorized) {
        const errorObj = err as {
          status?: number;
          statusText?: string;
          message?: string;
          errorData?: unknown;
        };
        console.log("[AUTH] User unauthorized for organization:", {
          email: supabaseUser?.email,
          userId: supabaseUser?.id,
          status: errorObj.status,
          statusText: errorObj.statusText,
          message: errorObj.message,
          errorData: errorObj.errorData,
          expectedOrgId: TENANT_ORG_ID,
          mainBackendUrl:
            process.env.MAIN_BACKEND_URL || "http://localhost:3000",
        });
        console.log("[AUTH] This usually means:");
        console.log(
          "[AUTH]   1. User is not associated with this organization in the main backend"
        );
        console.log(
          "[AUTH]   2. User needs to be added to the organization first"
        );

        console.log(
          "[AUTH]   3. Or the TENANT_ORGANIZATION_ID environment variable is incorrect"
        );
        // Silently return null - this is expected for users not in the organization
        // Don't log as error, just return null to indicate authentication failed
        return null;
      }

      // Log other errors (network issues, server errors, etc.)
      console.error("[AUTH] Error verifying user organization:", {
        email: supabaseUser?.email,
        message: err.message,
        status: err.status,
        endpoint: "/api/organizations",
      });
      return null;
    }
  } catch (error) {
    console.error("[AUTH] Unexpected error in getAuthUser:", error);
    return null;
  }
}

/**
 * Require authentication and return user or throw error
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  console.log("[AUTH] requireAuth called");
  const user = await getAuthUser(request);

  if (!user) {
    console.log("[AUTH] requireAuth failed - no user returned");
    throw new Error("Unauthorized");
  }

  console.log("[AUTH] requireAuth successful:", {
    email: user.email,
    role: user.role,
  });
  return user;
}

/**
 * Require specific role
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthUser> {
  console.log("[AUTH] requireRole called with allowed roles:", allowedRoles);
  const user = await requireAuth(request);

  if (!allowedRoles.includes(user.role)) {
    console.log("[AUTH] requireRole failed - insufficient permissions:", {
      email: user.email,
      userRole: user.role,
      allowedRoles,
    });
    throw new Error("Forbidden: Insufficient permissions");
  }

  console.log("[AUTH] requireRole successful:", {
    email: user.email,
    role: user.role,
  });
  return user;
}

/**
 * Require tenant admin role for tenant organization
 */
export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  console.log("[AUTH] requireAdmin called");
  return requireRole(request, ["TENANT_ADMIN"]);
}
