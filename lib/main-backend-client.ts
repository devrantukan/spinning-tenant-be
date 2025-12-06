/**
 * Client for communicating with the main backend API
 */

const MAIN_BACKEND_URL = process.env.MAIN_BACKEND_URL || 'http://localhost:3000'
const TENANT_ORGANIZATION_ID = process.env.TENANT_ORGANIZATION_ID
const MAIN_BACKEND_API_KEY = process.env.MAIN_BACKEND_API_KEY

if (!TENANT_ORGANIZATION_ID) {
  throw new Error('TENANT_ORGANIZATION_ID environment variable is required')
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  authToken?: string
}

async function requestMainBackend(
  endpoint: string,
  options: RequestOptions = {}
): Promise<any> {
  const { method = 'GET', body, headers = {}, authToken } = options

  const url = `${MAIN_BACKEND_URL}${endpoint}`
  
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // Add authentication
  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`
  }

  // Add API key if configured
  if (MAIN_BACKEND_API_KEY) {
    requestHeaders['X-API-Key'] = MAIN_BACKEND_API_KEY
  }

  // Always include organization ID in query params for GET requests
  // For POST/PATCH, include it in the body if not already present
  let finalUrl = url
  let requestBody = body
  
  if (method === 'GET') {
    finalUrl = endpoint.includes('?')
      ? `${url}&organizationId=${TENANT_ORGANIZATION_ID}`
      : `${url}?organizationId=${TENANT_ORGANIZATION_ID}`
  } else if (requestBody && typeof requestBody === 'object') {
    // Ensure organizationId is in the body for POST/PATCH requests
    requestBody = { ...requestBody, organizationId: TENANT_ORGANIZATION_ID }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  }

  if (requestBody && method !== 'GET') {
    config.body = JSON.stringify(requestBody)
  }

  try {
    const response = await fetch(finalUrl, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error(`Error calling main backend ${endpoint}:`, error)
    throw error
  }
}

export const mainBackendClient = {
  // Organization
  getOrganization: (authToken?: string) =>
    requestMainBackend(`/api/organizations`, { method: 'GET', authToken }),

  // Classes
  getClasses: (authToken?: string) =>
    requestMainBackend(`/api/classes`, { method: 'GET', authToken }),
  
  getClass: (id: string, authToken?: string) =>
    requestMainBackend(`/api/classes/${id}`, { method: 'GET', authToken }),

  // Sessions
  getSessions: (authToken?: string) =>
    requestMainBackend(`/api/sessions`, { method: 'GET', authToken }),
  
  getSession: (id: string, authToken?: string) =>
    requestMainBackend(`/api/sessions/${id}`, { method: 'GET', authToken }),

  // Bookings
  getBookings: (authToken?: string) =>
    requestMainBackend(`/api/bookings`, { method: 'GET', authToken }),
  
  getBooking: (id: string, authToken?: string) =>
    requestMainBackend(`/api/bookings/${id}`, { method: 'GET', authToken }),
  
  createBooking: (data: any, authToken?: string) =>
    requestMainBackend(`/api/bookings`, { method: 'POST', body: data, authToken }),
  
  updateBooking: (id: string, data: any, authToken?: string) =>
    requestMainBackend(`/api/bookings/${id}`, { method: 'PATCH', body: data, authToken }),
  
  deleteBooking: (id: string, authToken?: string) =>
    requestMainBackend(`/api/bookings/${id}`, { method: 'DELETE', authToken }),

  // Members
  getMembers: (authToken?: string) =>
    requestMainBackend(`/api/members`, { method: 'GET', authToken }),
  
  getMember: (id: string, authToken?: string) =>
    requestMainBackend(`/api/members/${id}`, { method: 'GET', authToken }),

  // Instructors
  getInstructors: (authToken?: string) =>
    requestMainBackend(`/api/instructors`, { method: 'GET', authToken }),
}
