import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/bookings/[id] - Get a specific booking
 * PATCH /api/bookings/[id] - Update a booking
 * DELETE /api/bookings/[id] - Delete a booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const booking = await mainBackendClient.getBooking(id, authToken)
    
    return NextResponse.json(booking)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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
    
    const booking = await mainBackendClient.updateBooking(id, body, authToken)
    
    return NextResponse.json(booking)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating booking:', error)
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
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    await mainBackendClient.deleteBooking(id, authToken)
    
    return NextResponse.json({ message: 'Booking deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}













