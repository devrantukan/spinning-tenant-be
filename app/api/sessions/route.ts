import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { mainBackendClient } from "@/lib/main-backend-client";

/**
 * GET /api/sessions - Get all sessions for the tenant organization
 * Query parameters:
 * - startDate: Filter sessions from this date (YYYY-MM-DD)
 * - endDate: Filter sessions to this date (YYYY-MM-DD)
 * - instructor: Filter by instructor name
 * - workoutType: Filter by workout type
 * - search: Search in title, instructor, location, studio
 * - timeFilter: 'all', 'am', or 'pm'
 * POST /api/sessions - Create a new session
 */
export async function GET(request: NextRequest) {
  try {
    // Sessions should be publicly viewable - auth is optional
    // Try to get auth token if available, but don't require it
    let authToken: string | undefined = undefined;
    try {
      await requireAuth(request);
      authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    } catch (authError) {
      // Auth is optional for viewing sessions - continue without auth
      console.log(
        "[SESSIONS] No auth token provided - fetching sessions as public"
      );
    }

    // Get all sessions from main backend (auth token is optional)
    const allSessions = await mainBackendClient.getSessions(authToken);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const instructor = searchParams.get("instructor");
    const workoutType = searchParams.get("workoutType");
    const search = searchParams.get("search");
    const timeFilter = searchParams.get("timeFilter"); // 'all', 'am', 'pm'

    // Apply filters
    let filteredSessions = Array.isArray(allSessions) ? allSessions : [];

    // Filter by date range
    if (startDate || endDate) {
      filteredSessions = filteredSessions.filter((session: any) => {
        if (!session.startTime && !session.date && !session.startDate) {
          return false;
        }

        // Try different date field names
        const sessionDateStr =
          session.startTime || session.date || session.startDate;
        if (!sessionDateStr) return false;

        try {
          const sessionDate = new Date(sessionDateStr);
          if (isNaN(sessionDate.getTime())) return false;

          // Reset time to start of day for comparison
          const sessionDateOnly = new Date(
            sessionDate.getFullYear(),
            sessionDate.getMonth(),
            sessionDate.getDate()
          );

          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (sessionDateOnly < start) return false;
          }

          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (sessionDateOnly > end) return false;
          }

          return true;
        } catch {
          return false;
        }
      });
    }

    // Filter by instructor
    if (instructor) {
      filteredSessions = filteredSessions.filter((session: any) => {
        const instructorName = getInstructorName(session.instructor);
        return instructorName.toLowerCase().includes(instructor.toLowerCase());
      });
    }

    // Filter by workout type
    if (workoutType) {
      filteredSessions = filteredSessions.filter((session: any) => {
        return (
          session.workoutType?.toLowerCase() === workoutType.toLowerCase() ||
          session.class?.workoutType?.toLowerCase() ===
            workoutType.toLowerCase()
        );
      });
    }

    // Filter by search query
    if (search) {
      const query = search.toLowerCase();
      filteredSessions = filteredSessions.filter((session: any) => {
        const instructorName = getInstructorName(session.instructor);
        return (
          session.title?.toLowerCase().includes(query) ||
          instructorName.toLowerCase().includes(query) ||
          session.location?.toLowerCase().includes(query) ||
          session.studio?.toLowerCase().includes(query) ||
          session.class?.name?.toLowerCase().includes(query)
        );
      });
    }

    // Filter by time (AM/PM)
    if (timeFilter && timeFilter !== "all") {
      filteredSessions = filteredSessions.filter((session: any) => {
        if (!session.startTime && !session.time) return false;

        const timeStr = (session.startTime || session.time || "").toLowerCase();
        const hourMatch = timeStr.match(/(\d{1,2}):?\d{0,2}/);
        if (!hourMatch) {
          // Try parsing from ISO date string
          try {
            const date = new Date(session.startTime || session.time);
            if (!isNaN(date.getTime())) {
              const hour = date.getHours();
              if (timeFilter === "am") return hour < 12;
              if (timeFilter === "pm") return hour >= 12;
            }
          } catch {
            return false;
          }
          return false;
        }

        let hour = parseInt(hourMatch[1]);
        if (timeStr.includes("pm") && hour !== 12) hour += 12;
        if (timeStr.includes("am") && hour === 12) hour = 0;

        if (timeFilter === "am") return hour < 12;
        if (timeFilter === "pm") return hour >= 12;
        return true;
      });
    }

    return NextResponse.json(filteredSessions);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to extract instructor name from various formats
function getInstructorName(instructor: any): string {
  if (!instructor) return "Unknown Instructor";
  if (typeof instructor === "string") return instructor;
  if (instructor.name) return instructor.name;
  if (instructor.user?.name) return instructor.user.name;
  if (instructor.user?.email) return instructor.user.email;
  return "Unknown Instructor";
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const authToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const body = await request.json();

    const newSession = await mainBackendClient.createSession(body, authToken);

    return NextResponse.json(newSession, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
