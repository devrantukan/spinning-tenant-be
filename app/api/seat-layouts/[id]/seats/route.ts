import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/seat-layouts/[id]/seats - Get all seats for a seat layout
 * POST /api/seat-layouts/[id]/seats - Create a new seat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id: seatLayoutId } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const seats = await mainBackendClient.getSeats(seatLayoutId, authToken)
    
    return NextResponse.json(seats)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching seats:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id: seatLayoutId } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    
    const seat = await mainBackendClient.createSeats(seatLayoutId, body, authToken)
    
    return NextResponse.json(seat, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating seat:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}









