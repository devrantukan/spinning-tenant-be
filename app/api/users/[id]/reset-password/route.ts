import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

// POST /api/users/[id]/reset-password - Send password reset email to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')

    // Fetch user to get their role
    let userRole: string | undefined
    try {
      const user = await mainBackendClient.getUsers(authToken)
      const foundUser = Array.isArray(user) ? user.find((u: any) => u.id === id) : null
      if (foundUser) {
        userRole = foundUser.role
      }
    } catch (err) {
      console.warn('Could not fetch user role, will use default:', err)
    }

    const result = await mainBackendClient.resetUserPassword(id, authToken, userRole)

    return NextResponse.json(result)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}


