import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/classes - Get all classes for the tenant organization
 * POST /api/classes - Create a new class
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

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    
    const newClass = await mainBackendClient.createClass(body, authToken)
    
    return NextResponse.json(newClass, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating class:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}












