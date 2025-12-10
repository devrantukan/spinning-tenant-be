import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/members/[id] - Get a specific member
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const member = await mainBackendClient.getMember(id, authToken)
    
    return NextResponse.json(member)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }
    console.error('Error fetching member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/members/[id] - Update a member
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    
    const member = await mainBackendClient.updateMember(id, body, authToken)
    
    return NextResponse.json(member)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }
    console.error('Error updating member:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/members/[id] - Delete a member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    await mainBackendClient.deleteMember(id, authToken)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }
    console.error('Error deleting member:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


