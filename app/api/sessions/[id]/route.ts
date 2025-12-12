import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/sessions/[id] - Get a specific session
 * PATCH /api/sessions/[id] - Update a session
 * DELETE /api/sessions/[id] - Delete a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const session = await mainBackendClient.getSession(id, authToken)
    
    return NextResponse.json(session)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    
    const updatedSession = await mainBackendClient.updateSession(id, body, authToken)
    
    return NextResponse.json(updatedSession)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    await mainBackendClient.deleteSession(id, authToken)
    
    return NextResponse.json({ message: 'Session deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

