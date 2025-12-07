/**
 * Client for communicating with the main backend API
 */

const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL;
const TENANT_ORGANIZATION_ID = process.env.TENANT_ORGANIZATION_ID;
const MAIN_BACKEND_API_KEY = process.env.MAIN_BACKEND_API_KEY;

if (!TENANT_ORGANIZATION_ID) {
  throw new Error("TENANT_ORGANIZATION_ID environment variable is required");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  authToken?: string;
}

async function requestMainBackend(
  endpoint: string,
  options: RequestOptions = {}
): Promise<any> {
  const { method = "GET", body, headers = {}, authToken } = options;

  const url = `${MAIN_BACKEND_URL}${endpoint}`;

  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Add authentication
  if (authToken) {
    requestHeaders["Authorization"] = `Bearer ${authToken}`;
  }

  // Add API key if configured
  if (MAIN_BACKEND_API_KEY) {
    requestHeaders["X-API-Key"] = MAIN_BACKEND_API_KEY;
  }

  // Always include organization ID in header as well (for main backend auth.ts)
  if (TENANT_ORGANIZATION_ID) {
    requestHeaders["X-Organization-Id"] = TENANT_ORGANIZATION_ID;
  }

  // Always include organization ID in query params for GET requests
  // For POST/PATCH, include it in the body if not already present
  let finalUrl = url;
  let requestBody = body;

  if (method === "GET") {
    finalUrl = endpoint.includes("?")
      ? `${url}&organizationId=${TENANT_ORGANIZATION_ID}`
      : `${url}?organizationId=${TENANT_ORGANIZATION_ID}`;
  } else if (requestBody && typeof requestBody === "object") {
    // Ensure organizationId is in the body for POST/PATCH requests
    requestBody = { ...requestBody, organizationId: TENANT_ORGANIZATION_ID };
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (requestBody && method !== "GET") {
    config.body = JSON.stringify(requestBody);
  }

  try {
    const response = await fetch(finalUrl, config);

    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = `HTTP ${response.status}: ${
        response.statusText || "Unknown error"
      }`;
      let errorData: any = {};

      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          // Try to read as text if not JSON
          const text = await response.text();
          if (text) {
            errorMessage = text;
          }
        }
      } catch (parseError) {
        // If parsing fails, use status and statusText
        console.error(`Failed to parse error response:`, parseError);
      }

      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).errorData = errorData;
      throw error;
    }

    return await response.json();
  } catch (error: any) {
    // If it's already our formatted error, just rethrow
    if (error.status !== undefined) {
      console.error(`Error calling main backend ${endpoint}:`, {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        errorData: error.errorData,
        url: finalUrl,
      });
      throw error;
    }

    // Network errors or other issues
    console.error(`Error calling main backend ${endpoint}:`, {
      message: error.message,
      url: finalUrl,
      error: error,
    });
    throw error;
  }
}

export const mainBackendClient = {
  // Organization
  getOrganization: (authToken?: string) =>
    requestMainBackend(`/api/organizations`, { method: "GET", authToken }),

  updateOrganization: (organizationId: string, data: any, authToken?: string) =>
    requestMainBackend(`/api/admin/organizations/${organizationId}`, {
      method: "PATCH",
      body: data,
      authToken,
    }),

  // Classes
  getClasses: (authToken?: string) =>
    requestMainBackend(`/api/classes`, { method: "GET", authToken }),

  getClass: (id: string, authToken?: string) =>
    requestMainBackend(`/api/classes/${id}`, { method: "GET", authToken }),

  createClass: (data: any, authToken?: string) =>
    requestMainBackend(`/api/classes`, {
      method: "POST",
      body: data,
      authToken,
    }),

  updateClass: (id: string, data: any, authToken?: string) =>
    requestMainBackend(`/api/classes/${id}`, {
      method: "PATCH",
      body: data,
      authToken,
    }),

  deleteClass: (id: string, authToken?: string) =>
    requestMainBackend(`/api/classes/${id}`, { method: "DELETE", authToken }),

  // Sessions
  getSessions: (authToken?: string) =>
    requestMainBackend(`/api/sessions`, { method: "GET", authToken }),

  getSession: (id: string, authToken?: string) =>
    requestMainBackend(`/api/sessions/${id}`, { method: "GET", authToken }),

  createSession: (data: any, authToken?: string) =>
    requestMainBackend(`/api/sessions`, {
      method: "POST",
      body: data,
      authToken,
    }),

  updateSession: (id: string, data: any, authToken?: string) =>
    requestMainBackend(`/api/sessions/${id}`, {
      method: "PATCH",
      body: data,
      authToken,
    }),

  deleteSession: (id: string, authToken?: string) =>
    requestMainBackend(`/api/sessions/${id}`, { method: "DELETE", authToken }),

  // Bookings
  getBookings: (authToken?: string) =>
    requestMainBackend(`/api/bookings`, { method: "GET", authToken }),

  getBooking: (id: string, authToken?: string) =>
    requestMainBackend(`/api/bookings/${id}`, { method: "GET", authToken }),

  createBooking: (data: any, authToken?: string) =>
    requestMainBackend(`/api/bookings`, {
      method: "POST",
      body: data,
      authToken,
    }),

  updateBooking: (id: string, data: any, authToken?: string) =>
    requestMainBackend(`/api/bookings/${id}`, {
      method: "PATCH",
      body: data,
      authToken,
    }),

  deleteBooking: (id: string, authToken?: string) =>
    requestMainBackend(`/api/bookings/${id}`, { method: "DELETE", authToken }),

  // Members
  getMembers: (authToken?: string) =>
    requestMainBackend(`/api/members`, { method: "GET", authToken }),

  getMember: (id: string, authToken?: string) =>
    requestMainBackend(`/api/members/${id}`, { method: "GET", authToken }),

  // Instructors
  getInstructors: (authToken?: string) =>
    requestMainBackend(`/api/instructors`, { method: "GET", authToken }),

  getInstructor: (id: string, authToken?: string) =>
    requestMainBackend(`/api/instructors/${id}`, { method: "GET", authToken }),

  updateInstructor: (id: string, data: any, authToken?: string) =>
    requestMainBackend(`/api/instructors/${id}`, {
      method: "PATCH",
      body: data,
      authToken,
    }),

  deleteInstructor: (id: string, authToken?: string) =>
    requestMainBackend(`/api/instructors/${id}`, { method: "DELETE", authToken }),

  // Users
  getCurrentUser: (authToken?: string) =>
    requestMainBackend(`/api/users/me`, { method: "GET", authToken }),

  getUsers: (authToken?: string) =>
    requestMainBackend(`/api/users`, { method: "GET", authToken }),

  createUser: (
    data: {
      email: string;
      name?: string;
      role: string;
      organizationId: string;
    },
    authToken?: string
  ) =>
    requestMainBackend(`/api/users`, {
      method: "POST",
      body: data,
      authToken,
    }),

  // User Invitations
  getUserInvitationStatus: (userId: string, authToken?: string) =>
    requestMainBackend(`/api/users/${userId}/invitation-status`, {
      method: "GET",
      authToken,
    }),

  resendUserInvitation: (userId: string, authToken?: string) =>
    requestMainBackend(`/api/users/${userId}/resend-invitation`, {
      method: "POST",
      authToken,
    }),

  resetUserPassword: (userId: string, authToken?: string) =>
    requestMainBackend(`/api/users/${userId}/reset-password`, {
      method: "POST",
      authToken,
    }),
};
