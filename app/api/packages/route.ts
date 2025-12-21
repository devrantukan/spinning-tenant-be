import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/packages - Get all packages for the tenant organization
 * Public endpoint - packages should be viewable without authentication
 * POST /api/packages - Create a new package (requires auth)
 */
export async function GET(request: NextRequest) {
  try {
    // Try to get auth token if available, but don't require it
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    // Packages should be publicly viewable
    // The main backend will filter by organization based on TENANT_ORGANIZATION_ID
    const packages = await mainBackendClient.getPackages(authToken);

    return NextResponse.json(packages);
  } catch (error: any) {
    // If unauthorized, still try to return packages (they should be public)
    if (error.message === "Unauthorized") {
      console.log("No auth token, attempting to fetch packages without auth");
      try {
        const packages = await mainBackendClient.getPackages(undefined);
        return NextResponse.json(packages);
      } catch (fallbackError: any) {
        console.error("Error fetching packages without auth:", fallbackError);
        return NextResponse.json([], { status: 200 });
      }
    }
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const body = await request.json();

    // Ensure the package is for this organization
    const packageData = {
      ...body,
      organizationId: user.organizationId,
    };

    const packageResult = await mainBackendClient.createPackage(
      packageData,
      authToken
    );

    return NextResponse.json(packageResult, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating package:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}




