import { NextRequest, NextResponse } from 'next/server'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/instructors/[id] - Get a specific instructor
 * PATCH /api/instructors/[id] - Update an instructor
 * DELETE /api/instructors/[id] - Delete an instructor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication is no longer required for GET requests
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const instructor = await mainBackendClient.getInstructor(id, authToken)
    
    return NextResponse.json(instructor)
  } catch (error: any) {
    console.error('Error fetching instructor:', error?.message || error)
    
    if (
      error?.message === 'Unauthorized' ||
      error?.status === 401 ||
      error?.statusText === 'Unauthorized'
    ) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    
    const instructor = await mainBackendClient.updateInstructor(id, body, authToken)
    
    return NextResponse.json(instructor)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating instructor:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    console.log(`[API-INSTRUCTORS] Deleting instructor with ID: ${id}`);
    
    await mainBackendClient.deleteInstructor(id, authToken)
    
    return NextResponse.json({ message: 'Instructor deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting instructor:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
