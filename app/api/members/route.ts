import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/members - Get all members for the tenant organization
 * POST /api/members - Create a new member
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const members = await mainBackendClient.getMembers(authToken)
    
    return NextResponse.json(members)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    
    const member = await mainBackendClient.createMember(body, authToken)
    
    return NextResponse.json(member, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating member:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}


