import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/classes - Get all classes for the tenant organization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const classes = await mainBackendClient.getClasses(authToken)
    
    return NextResponse.json(classes)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching classes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

