import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/sessions - Get all sessions for the tenant organization
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

