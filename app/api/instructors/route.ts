import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/instructors - Get all instructors for the tenant organization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
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
    // Log the full error object
    console.error(
      "[TENANT-BE] Error fetching instructors - Full error object:",
      error
    );
    console.error("[TENANT-BE] Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      status: error?.status,
      statusText: error?.statusText,
      errorData: error?.errorData,
      connectionError: error?.connectionError,
      serverError: error?.serverError,
      response: error?.response,
      url: error?.url || "unknown",
      cause: error?.cause,
      code: error?.code,
    });

    // Handle unauthorized - pass through 401 from main backend
    if (
      error?.message === "Unauthorized" ||
      error?.status === 401 ||
      error?.statusText === "Unauthorized" ||
      (error?.errorData &&
        typeof error.errorData === "object" &&
        error.errorData.error === "Unauthorized")
    ) {
      console.error(
        "[TENANT-BE] Main backend returned 401 Unauthorized for instructors endpoint"
      );
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

    // Handle connection errors specifically
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

    // Extract error message from various possible locations
    const errorMessage =
      error?.errorData?.error ||
      error?.errorData?.message ||
      error?.message ||
      "Internal server error";

    // Return the actual error details
    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development"
            ? error?.stack || error?.message || JSON.stringify(error)
            : undefined,
        status: error?.status || 500,
        errorData:
          process.env.NODE_ENV === "development" ? error?.errorData : undefined,
      },
      { status: error?.status || 500 }
    );
  }
}
