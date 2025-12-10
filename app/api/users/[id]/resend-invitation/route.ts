import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

// POST /api/users/[id]/resend-invitation - Resend invitation email to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')

    const result = await mainBackendClient.resendUserInvitation(id, authToken)

    return NextResponse.json(result)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error resending invitation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}


