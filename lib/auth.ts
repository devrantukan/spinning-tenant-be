/**
 * Authentication utilities for tenant backend
 * Validates Supabase JWT tokens and ensures user belongs to the tenant organization
 */

import { NextRequest } from 'next/server'
import { createServerClient } from './supabase'
import { mainBackendClient } from './main-backend-client'

export interface AuthUser {
  id: string
  email: string
  supabaseUserId: string
  organizationId: string
  role: string
}

const TENANT_ORGANIZATION_ID = process.env.TENANT_ORGANIZATION_ID

if (!TENANT_ORGANIZATION_ID) {
  throw new Error('TENANT_ORGANIZATION_ID environment variable is required')
}

/**
 * Get authenticated user from Supabase session
 * Verifies the user belongs to this tenant's organization
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify token with Supabase
    const serverSupabase = createServerClient()
    const { data: { user: supabaseUser }, error: supabaseError } = 
      await serverSupabase.auth.getUser(token)
    
    if (supabaseError || !supabaseUser) {
      return null
    }

    // Verify user belongs to this tenant's organization by checking organization endpoint
    // The main backend will return 401/403 if user doesn't belong to the organization
    try {
      const organization = await mainBackendClient.getOrganization(token)
      
      // Verify the organization matches our tenant
      if (organization.id !== TENANT_ORGANIZATION_ID) {
        console.warn(`Organization ${organization.id} does not match tenant organization ${TENANT_ORGANIZATION_ID}`)
        return null
      }

      // For now, we'll construct a basic user object
      // In a real scenario, you might want to fetch user details from main backend
      // or have the main backend return user info in the organization response
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        supabaseUserId: supabaseUser.id,
        organizationId: TENANT_ORGANIZATION_ID,
        role: 'MEMBER' // Default role, could be fetched from main backend
      }
    } catch (error: any) {
      // If main backend returns 401/403, user doesn't belong to this organization
      if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('Unauthorized')) {
        console.warn(`User ${supabaseUser.email} does not belong to tenant organization ${TENANT_ORGANIZATION_ID}`)
        return null
      }
      console.error('Error verifying user organization:', error)
      return null
    }
  } catch (error) {
    console.error('Error in getAuthUser:', error)
    return null
  }
}

/**
 * Require authentication and return user or throw error
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request)
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

/**
 * Require specific role
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthUser> {
  const user = await requireAuth(request)
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions')
  }
  
  return user
}
