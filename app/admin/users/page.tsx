'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/useTheme'
import { useLanguage } from '@/lib/LanguageContext'

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
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
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

  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'INSTRUCTOR' // Tenant admins can only create instructors
  })

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

  const handleResendInvitation = async (userId: string, userEmail: string) => {
    if (!token) {
      alert('Not authenticated')
      return
    }

    if (!confirm(t('resendInvitationConfirm').replace('{email}', userEmail))) {
      return
    }

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

      alert(t('invitationSent'))
      
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
      alert(`${t('error')}: ${error.message}`)
    } finally {
      setResendingInvites(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (!token) {
      alert('Not authenticated')
      return
    }

    if (!confirm(t('resetPasswordConfirm').replace('{email}', userEmail))) {
      return
    }

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
        const details = data.details ? `\n\nDetails: ${data.details}` : ''
        const suggestion = data.suggestion ? `\n\n${data.suggestion}` : ''
        alert(`${t('error')}: ${errorMsg}${details}${suggestion}`)
        return
      }

      // Show success message with link if provided (for development/testing)
      let message = t('passwordResetSent')
      if (data.link) {
        // Copy link to clipboard
        try {
          await navigator.clipboard.writeText(data.link)
          message += `\n\n${t('resetLinkCopied')}`
        } catch (err) {
          // Fallback if clipboard API not available
          message += `\n\n${t('resetLink')}:\n${data.link}`
        }
        message += `\n\n${t('resetLinkNote')}`
      }
      if (data.note) {
        message += `\n\n${data.note}`
      }
      
      alert(message)
      
      // Also log to console for easier access
      if (data.link) {
        console.log('Password Reset Link:', data.link)
        console.log('Copy this link and share it with the user if email is not received')
      }
    } catch (error: any) {
      alert(`${t('error')}: ${error.message}`)
    } finally {
      setResettingPasswords(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const created = await response.json()
      setUsers([created, ...users])
      setNewUser({ email: '', name: '', role: 'INSTRUCTOR' })
      setShowAddForm(false)
      
      // Show success message
      setError(null)
      alert('Instructor created successfully! An invitation email has been sent to ' + created.email)
    } catch (err: any) {
      setError(err.message || 'Failed to add user')
    } finally {
      setAdding(false)
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
        <p>Loading...</p>
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showAddForm ? t('cancel') : t('addUser')}
          </button>
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
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? t('loading') : t('refresh')}
          </button>
        </div>
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

      {showAddForm && (
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{t('createNewInstructor')}</h3>
          <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.875rem' }}>
            Create a new instructor account. An invitation email will be sent to the provided email address so they can set up their password and access the system.
          </p>
          <form onSubmit={handleAddUser}>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr auto' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  {t('email')} *
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                  placeholder="instructor@example.com"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  {t('name')}
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                  placeholder="Full Name"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={adding}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: adding ? 'not-allowed' : 'pointer',
                    opacity: adding ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {adding ? t('loading') : t('createAndSendInvite')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading...</p>
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
                              onClick={() => handleResendInvitation(user.id, user.email)}
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
                            onClick={() => handleResetPassword(user.id, user.email)}
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
    </div>
  )
}
