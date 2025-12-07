import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/users - Get all users for the tenant organization
 * POST /api/users - Add a new user to the organization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const users = await mainBackendClient.getUsers(authToken)
    
    return NextResponse.json(users)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    
    const { email, name, role } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Note: Users must first exist in Supabase auth
    // This endpoint will sync/link the Supabase user to the organization
    // For now, we'll return an error suggesting the user sign up first
    // In a production system, you'd want to:
    // 1. Check if user exists in Supabase
    // 2. If not, send an invite email
    // 3. If yes, sync them to the organization
    
    // Try to create user via main backend admin endpoint
    try {
      const newUser = await mainBackendClient.createUser({
        email,
        name: name || null,
        role: role || 'MEMBER',
        organizationId: user.organizationId
      }, authToken)
      
      return NextResponse.json(newUser, { status: 201 })
    } catch (createError: any) {
      // If user creation fails, it might be because user doesn't exist in Supabase
      return NextResponse.json(
        { 
          error: createError.message || 'Failed to add user. User must first sign up in Supabase auth.',
          details: 'The user with this email must have an account in Supabase before they can be added to the organization.'
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

