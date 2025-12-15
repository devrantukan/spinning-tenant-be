'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/useTheme'
import { useLanguage } from '@/lib/LanguageContext'
import Spinner from '@/components/Spinner'

interface Booking {
  id: string
  sessionId: string
  memberId: string
  status: string
  createdAt: string
  session?: {
    id: string
    startTime: string
    endTime: string
    class?: {
      id: string
      name: string
    }
  }
  member?: {
    id: string
    user: {
      id: string
      name?: string
      email: string
    }
  }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const { theme } = useTheme()
  const { t } = useLanguage()

  // Theme colors
  const themeColors = {
    light: {
      cardBg: 'white',
      theadBg: '#f5f5f5',
      rowEven: 'white',
      rowOdd: '#fafafa',
      border: '#e0e0e0',
      text: '#333',
      textSecondary: '#666',
      textMuted: '#999',
      inputBg: 'white',
      inputBorder: '#ccc',
      background: '#f5f5f5',
      primary: '#1976d2',
      errorBg: '#ffebee',
      error: '#c62828',
      shadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    dark: {
      cardBg: '#1e1e1e',
      theadBg: '#2a2a2a',
      rowEven: '#1e1e1e',
      rowOdd: '#252525',
      border: '#333',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0',
      textMuted: '#888',
      inputBg: '#2a2a2a',
      inputBorder: '#444',
      background: '#121212',
      primary: '#1976d2',
      errorBg: '#3d1f1f',
      error: '#ef5350',
      shadow: '0 2px 4px rgba(0,0,0,0.3)'
    }
  }

  const colors = themeColors[theme]

  useEffect(() => {
    const authToken = localStorage.getItem('supabase_auth_token')
    
    if (!authToken) {
      router.push('/login')
      return
    }

    setToken(authToken)
    fetchBookings(authToken)
  }, [router])

  const fetchBookings = async (authToken: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('supabase_auth_token')
          localStorage.removeItem('supabase_session')
          router.push('/login')
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  const refreshBookings = () => {
    if (token) {
      fetchBookings(token)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return { bg: '#e8f5e9', color: '#388e3c' }
      case 'CANCELLED':
        return { bg: '#ffebee', color: '#d32f2f' }
      case 'PENDING':
        return { bg: '#fff3e0', color: '#f57c00' }
      case 'COMPLETED':
        return { bg: '#e3f2fd', color: '#1976d2' }
      default:
        return { bg: '#f5f5f5', color: '#666' }
    }
  }

  if (!token) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Spinner text={t('loading')} />
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: colors.background,
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: colors.cardBg,
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: colors.shadow
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: colors.text
          }}>
            {t('bookings')}
          </h1>
          <button
            onClick={refreshBookings}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? (
              <>
                <Spinner size={16} color="#ffffff" />
                <span>{t('loading')}</span>
              </>
            ) : t('refresh')}
          </button>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: colors.errorBg,
            color: colors.error,
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: 0 }}>{t('error')}: {error}</p>
          </div>
        )}

        {loading && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <Spinner text={t('loading')} />
          </div>
        )}

        {!loading && !error && (
          <div style={{ overflowX: 'auto' }}>
            {bookings.length > 0 ? (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
                color: colors.text
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: colors.theadBg,
                    borderBottom: `2px solid ${colors.border}`
                  }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>
                      {t('member') || 'Member'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>
                      {t('class') || 'Class'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>
                      {t('startTime') || 'Start Time'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>
                      {t('endTime') || 'End Time'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>
                      {t('status') || 'Status'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>
                      {t('created') || 'Created'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, index) => {
                    const statusColors = getStatusColor(booking.status)
                    return (
                      <tr
                        key={booking.id}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          backgroundColor: index % 2 === 0 ? colors.rowEven : colors.rowOdd
                        }}
                      >
                        <td style={{ padding: '1rem', color: colors.text }}>
                          <div>
                            <strong>{booking.member?.user?.name || 'N/A'}</strong>
                            {booking.member?.user?.email && (
                              <div style={{ fontSize: '0.85rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                                {booking.member.user.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: colors.text }}>
                          {booking.session?.class?.name || 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', color: colors.text }}>
                          {booking.session?.startTime ? formatDate(booking.session.startTime) : 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', color: colors.text }}>
                          {booking.session?.endTime ? formatDate(booking.session.endTime) : 'N/A'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            backgroundColor: statusColors.bg,
                            color: statusColors.color
                          }}>
                            {booking.status || 'UNKNOWN'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: colors.text }}>
                          {formatDate(booking.createdAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>
                <p>{t('noDataAvailable')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
