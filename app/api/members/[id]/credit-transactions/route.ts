import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { mainBackendClient } from '@/lib/main-backend-client'

/**
 * GET /api/members/[id]/credit-transactions - Get credit transaction history for a member
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const transactions = await mainBackendClient.getMemberCreditTransactions(id, authToken)
    
    return NextResponse.json(transactions)
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
    console.error('Error fetching credit transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

