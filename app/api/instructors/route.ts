import { NextRequest, NextResponse } from "next/server";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/instructors - Get all instructors for the tenant organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication is no longer required for GET requests
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    console.log(
      "[TENANT-BE] Fetching instructors, authToken exists:",
      !!authToken
    );

    const instructors = await mainBackendClient.getInstructors(authToken);

    console.log(
      "[TENANT-BE] Instructors fetched successfully, count:",
      Array.isArray(instructors) ? instructors.length : "not an array"
    );

    return NextResponse.json(instructors);
  } catch (error: any) {
    console.error(
      "[TENANT-BE] Error fetching instructors:",
      error?.message || error
    );

    // Handle unauthorized - pass through 401 from main backend
    if (
      error?.message === "Unauthorized" ||
      error?.status === 401 ||
      error?.statusText === "Unauthorized" ||
      (error?.errorData &&
        typeof error.errorData === "object" &&
        error.errorData.error === "Unauthorized")
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - Please check if your user has access to this organization",
          details:
            process.env.NODE_ENV === "development" ? error?.message : undefined,
        },
        { status: 401 }
      );
    }

    // Handle connection errors
    if (
      error?.connectionError ||
      error?.status === 503 ||
      error?.code === "ECONNREFUSED"
    ) {
      return NextResponse.json(
        {
          error: "Main backend server is not reachable",
          details:
            error?.message ||
            "The main backend server at http://localhost:3002 may not be running",
        },
        { status: 503 }
      );
    }

    const errorMessage =
      error?.errorData?.error ||
      error?.errorData?.message ||
      error?.message ||
      "Internal server error";

    return NextResponse.json(
      {
        error: errorMessage,
        status: error?.status || 500,
      },
      { status: error?.status || 500 }
    );
  }
}
