import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/sessions - Get all sessions for the tenant organization
 * POST /api/sessions - Create a new session
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const sessions = await mainBackendClient.getSessions(authToken)
    
    return NextResponse.json(sessions)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching sessions:', error)
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
    
    const newSession = await mainBackendClient.createSession(body, authToken)
    
    return NextResponse.json(newSession, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}





