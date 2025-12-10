'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/useTheme'
import { useLanguage } from '@/lib/LanguageContext'
import Spinner from '@/components/Spinner'
import Modal from '@/components/Modal'
import { showToast } from '@/components/Toast'

interface User {
  id: string
  email: string
  name?: string
  role: string
  organization?: {
    id: string
    name: string
  }
  _count?: {
    memberships: number
    bookings: number
  }
  createdAt?: string
}

// Tenant admins can only create instructors
const ROLES = [
  { value: 'INSTRUCTOR', label: 'Instructor' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [resendingInvites, setResendingInvites] = useState<Set<string>>(new Set())
  const [resettingPasswords, setResettingPasswords] = useState<Set<string>>(new Set())
  const [invitationStatuses, setInvitationStatuses] = useState<Record<string, any>>({})
  const router = useRouter()
  const { theme } = useTheme()
  const { t } = useLanguage()
  
  // Theme colors for tables
  const themeColors = {
    light: {
      cardBg: 'white',
      theadBg: '#f5f5f5',
      rowEven: 'white',
      rowOdd: '#fafafa',
      border: '#e0e0e0',
      text: '#333',
      textSecondary: '#666',
      textMuted: '#999'
    },
    dark: {
      cardBg: '#1e1e1e',
      theadBg: '#2a2a2a',
      rowEven: '#1e1e1e',
      rowOdd: '#252525',
      border: '#333',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0',
      textMuted: '#888'
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
    fetchUsers(authToken)
  }, [router])

  const fetchUsers = async (authToken: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users', {
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

      const result = await response.json()
      const usersList = Array.isArray(result) ? result : []
      setUsers(usersList)
      
      // Check invitation status for all users
      if (usersList.length > 0) {
        // Set initial empty statuses
        const initialStatuses: Record<string, any> = {}
        usersList.forEach((user: User) => {
          initialStatuses[user.id] = null // null means checking
        })
        setInvitationStatuses(initialStatuses)
        
        // Set a timeout to show "Unknown" if checks take too long
        setTimeout(() => {
          setInvitationStatuses((prev) => {
            const updated = { ...prev }
            Object.keys(updated).forEach((userId) => {
              if (updated[userId] === null) {
                updated[userId] = {
                  hasInvitation: false,
                  emailConfirmed: false,
                  needsResend: false,
                  error: true,
                  message: 'Status check timeout'
                }
              }
            })
            return updated
          })
        }, 15000) // 15 second timeout
        
        // Then check actual statuses
        checkInvitationStatuses(usersList, authToken)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const checkInvitationStatuses = async (usersList: User[], authToken: string) => {
    if (!authToken) {
      console.warn('No auth token, skipping invitation status check')
      return
    }

    console.log(`Checking invitation statuses for ${usersList.length} users`)
    const statuses: Record<string, any> = {}
    
    // Check status for each user in parallel with timeout
    const statusPromises = usersList.map(async (user) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const res = await fetch(`/api/users/${user.id}/invitation-status`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (res.ok) {
          const status = await res.json()
          console.log(`Status for user ${user.id}:`, status)
          return { userId: user.id, status }
        } else {
          const errorData = await res.json().catch(() => ({}))
          console.error(`Failed to get status for user ${user.id} (${res.status}):`, errorData)
          
          // For 401 errors, the token might be invalid - don't retry
          if (res.status === 401) {
            return { 
              userId: user.id, 
              status: { 
                hasInvitation: false, 
                emailConfirmed: false, 
                needsResend: false,
                error: true,
                message: 'Authentication failed. Please refresh the page.'
              } 
            }
          }
          
          // Set a default status for other failed checks
          return { 
            userId: user.id, 
            status: { 
              hasInvitation: false, 
              emailConfirmed: false, 
              needsResend: false,
              error: true,
              message: errorData.error || `Failed to check status (${res.status})`
            } 
          }
        }
      } catch (error: any) {
        // Don't log AbortError as it's expected for timeouts
        if (error.name !== 'AbortError') {
          console.error(`Error checking status for user ${user.id}:`, error)
        }
        // Set a default status for errors
        return { 
          userId: user.id, 
          status: { 
            hasInvitation: false, 
            emailConfirmed: false, 
            needsResend: false,
            error: true,
            message: error.name === 'AbortError' ? 'Request timeout' : (error.message || 'Failed to check status')
          } 
        }
      }
    })
    
    try {
      const results = await Promise.allSettled(statusPromises)
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { userId, status } = result.value
          statuses[userId] = status
        } else {
          // Handle rejected promises
          const user = usersList[index]
          console.error(`Promise rejected for user ${user?.id || index}:`, result.reason)
          if (user) {
            statuses[user.id] = {
              hasInvitation: false,
              emailConfirmed: false,
              needsResend: false,
              error: true,
              message: result.reason?.message || 'Failed to check status'
            }
          }
        }
      })
      
      console.log('Final invitation statuses:', statuses)
      // Ensure all users have a status (even if it's an error)
      usersList.forEach((user) => {
        if (!statuses[user.id]) {
          statuses[user.id] = {
            hasInvitation: false,
            emailConfirmed: false,
            needsResend: false,
            error: true,
            message: 'Status check incomplete'
          }
        }
      })
      setInvitationStatuses(statuses)
    } catch (error) {
      console.error('Error processing invitation statuses:', error)
      // Set default error statuses so UI doesn't show "Checking..." forever
      const errorStatuses: Record<string, any> = {}
      usersList.forEach((user) => {
        errorStatuses[user.id] = {
          hasInvitation: false,
          emailConfirmed: false,
          needsResend: false,
          error: true,
          message: 'Failed to check status'
        }
      })
      setInvitationStatuses(errorStatuses)
    }
  }

  const handleResendInvitationClick = (userId: string, userEmail: string) => {
    setResendInvitationModal({ isOpen: true, userId, email: userEmail })
  }

  const handleResendInvitation = async () => {
    if (!token || !resendInvitationModal) {
      showToast(t('error') + ': Not authenticated', 'error')
      return
    }

    const { userId } = resendInvitationModal
    setResendInvitationModal(null)
    setResendingInvites(prev => new Set(prev).add(userId))

    try {
      const res = await fetch(`/api/users/${userId}/resend-invitation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend invitation')
      }

      showToast(t('invitationSent'), 'success')
      
      // Refresh invitation status
      const statusRes = await fetch(`/api/users/${userId}/invitation-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (statusRes.ok) {
        const status = await statusRes.json()
        setInvitationStatuses(prev => ({
          ...prev,
          [userId]: status
        }))
      }
    } catch (error: any) {
      showToast(`${t('error')}: ${error.message}`, 'error')
    } finally {
      setResendingInvites(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleResetPasswordClick = (userId: string, userEmail: string) => {
    setResetPasswordModal({ isOpen: true, userId, email: userEmail })
  }

  const handleResetPassword = async () => {
    if (!token || !resetPasswordModal) {
      showToast(t('error') + ': Not authenticated', 'error')
      return
    }

    const { userId } = resetPasswordModal
    setResetPasswordModal(null)
    setResettingPasswords(prev => new Set(prev).add(userId))

    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg = data.error || 'Failed to reset password'
        const details = data.details ? ` Details: ${data.details}` : ''
        const suggestion = data.suggestion ? ` ${data.suggestion}` : ''
        showToast(`${t('error')}: ${errorMsg}${details}${suggestion}`, 'error')
        return
      }

      // Show success message
      let message = t('passwordResetSent')
      if (data.link) {
        // Copy link to clipboard
        try {
          await navigator.clipboard.writeText(data.link)
          message += ` ${t('resetLinkCopied') || '(Link copied to clipboard)'}`
        } catch (err) {
          // Fallback if clipboard API not available
          console.log('Password Reset Link:', data.link)
        }
      }
      if (data.note) {
        message += ` ${data.note}`
      }
      
      showToast(message, 'success')
      
      // Also log to console for easier access
      if (data.link) {
        console.log('Password Reset Link:', data.link)
        console.log('Copy this link and share it with the user if email is not received')
      }
    } catch (error: any) {
      showToast(`${t('error')}: ${error.message}`, 'error')
    } finally {
      setResettingPasswords(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }


  const refreshData = () => {
    if (token) {
      fetchUsers(token)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
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
      backgroundColor: colors.cardBg,
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: `1px solid ${colors.border}`,
      transition: 'background-color 0.3s, border-color 0.3s'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: colors.text }}>{t('users')}</h2>
        <button
          onClick={refreshData}
          disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1976d2',
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
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <p style={{ margin: 0 }}>Error: {error}</p>
        </div>
      )}


      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Spinner text={t('loading')} />
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          {users.length > 0 ? (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              color: colors.text
            }}>
              <thead>
                <tr style={{
                  backgroundColor: colors.theadBg,
                  borderBottom: `2px solid ${colors.border}`,
                  transition: 'background-color 0.3s, border-color 0.3s'
                }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>{t('name')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>{t('email')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>{t('role')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>{t('memberships')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>{t('bookings')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>{t('invitationStatus')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>{t('created')}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold', color: colors.text }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const invitationStatus = invitationStatuses[user.id]
                  const needsResend = invitationStatus?.needsResend || false
                  const emailConfirmed = invitationStatus?.emailConfirmed || false
                  const isResending = resendingInvites.has(user.id)

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: index % 2 === 0 ? colors.rowEven : colors.rowOdd,
                        transition: 'background-color 0.3s, border-color 0.3s'
                      }}
                    >
                      <td style={{ padding: '0.75rem', color: colors.text }}>
                        {user.name || <span style={{ color: colors.textMuted, fontStyle: 'italic' }}>{t('noName')}</span>}
                      </td>
                      <td style={{ padding: '0.75rem', color: colors.text }}>{user.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: 
                            user.role === 'ADMIN' || user.role === 'TENANT_ADMIN' 
                              ? (theme === 'dark' ? '#1e3a5f' : '#e3f2fd') :
                            user.role === 'INSTRUCTOR' 
                              ? (theme === 'dark' ? '#5d4037' : '#fff3e0') :
                              (theme === 'dark' ? '#1b5e20' : '#e8f5e9'),
                          color:
                            user.role === 'ADMIN' || user.role === 'TENANT_ADMIN' 
                              ? (theme === 'dark' ? '#90caf9' : '#1976d2') :
                            user.role === 'INSTRUCTOR' 
                              ? (theme === 'dark' ? '#ffab91' : '#f57c00') :
                              (theme === 'dark' ? '#81c784' : '#388e3c')
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: colors.text }}>
                        {user._count?.memberships || 0}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', color: colors.text }}>
                        {user._count?.bookings || 0}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {invitationStatus === null || invitationStatus === undefined ? (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                            color: colors.textSecondary
                          }}>
                            {t('checking')}
                          </span>
                        ) : invitationStatus.error === true ? (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            backgroundColor: theme === 'dark' ? '#5d1a1a' : '#ffebee',
                            color: theme === 'dark' ? '#f48fb1' : '#d32f2f'
                          }} title={invitationStatus.message || t('error')}>
                            {t('unknown')}
                          </span>
                        ) : invitationStatus.emailConfirmed === true ? (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            backgroundColor: theme === 'dark' ? '#1b5e20' : '#e8f5e9',
                            color: theme === 'dark' ? '#81c784' : '#388e3c'
                          }}>
                            ✓ {t('confirmed')}
                          </span>
                        ) : (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            backgroundColor: theme === 'dark' ? '#5d4037' : '#fff3e0',
                            color: theme === 'dark' ? '#ffab91' : '#f57c00'
                          }}>
                            ⏳ {t('pending')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', color: colors.text }}>
                        {formatDate(user.createdAt)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {needsResend && (
                            <button
                              onClick={() => handleResendInvitationClick(user.id, user.email)}
                              disabled={isResending}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: isResending 
                                  ? (theme === 'dark' ? '#555' : '#ccc')
                                  : (theme === 'dark' ? '#d84315' : '#f57c00'),
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: isResending ? 'not-allowed' : 'pointer',
                                opacity: isResending ? 0.6 : 1,
                                transition: 'background-color 0.3s, opacity 0.3s'
                              }}
                            >
                              {isResending ? t('sending') : t('resendInvitation')}
                            </button>
                          )}
                          <button
                            onClick={() => handleResetPasswordClick(user.id, user.email)}
                            disabled={resettingPasswords.has(user.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: resettingPasswords.has(user.id)
                                ? (theme === 'dark' ? '#555' : '#ccc')
                                : (theme === 'dark' ? '#424242' : '#616161'),
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: resettingPasswords.has(user.id) ? 'not-allowed' : 'pointer',
                              opacity: resettingPasswords.has(user.id) ? 0.6 : 1,
                              transition: 'background-color 0.3s, opacity 0.3s'
                            }}
                          >
                            {resettingPasswords.has(user.id) ? t('resetting') : t('resetPassword')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>
              <p>{t('noUsersFound')}</p>
            </div>
          )}
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <Modal
          isOpen={resetPasswordModal.isOpen}
          onClose={() => setResetPasswordModal(null)}
          title={t('resetPassword') || 'Reset Password'}
          onConfirm={handleResetPassword}
          confirmText={t('resetPassword') || 'Reset Password'}
          cancelText={t('cancel') || 'Cancel'}
          confirmButtonStyle={{ backgroundColor: '#ff9800' }}
        >
          <p>
            {t('resetPasswordConfirm')?.replace('{email}', resetPasswordModal.email) || 
             `Are you sure you want to reset the password for ${resetPasswordModal.email}?`}
          </p>
          <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginTop: '0.5rem' }}>
            {t('resetPasswordNote') || 'A password reset email will be sent to this user.'}
          </p>
        </Modal>
      )}

      {/* Resend Invitation Modal */}
      {resendInvitationModal && (
        <Modal
          isOpen={resendInvitationModal.isOpen}
          onClose={() => setResendInvitationModal(null)}
          title={t('resendInvitation') || 'Resend Invitation'}
          onConfirm={handleResendInvitation}
          confirmText={t('resendInvitation') || 'Resend Invitation'}
          cancelText={t('cancel') || 'Cancel'}
          confirmButtonStyle={{ backgroundColor: '#2196f3' }}
        >
          <p>
            {t('resendInvitationConfirm')?.replace('{email}', resendInvitationModal.email) || 
             `Are you sure you want to resend the invitation email to ${resendInvitationModal.email}?`}
          </p>
          <p style={{ fontSize: '0.875rem', color: colors.textSecondary, marginTop: '0.5rem' }}>
            {t('resendInvitationNote') || 'A new invitation email will be sent to this user.'}
          </p>
        </Modal>
      )}
    </div>
  )
}
