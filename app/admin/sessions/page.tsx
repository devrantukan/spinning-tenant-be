'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/useTheme'
import { useLanguage } from '@/lib/LanguageContext'
import Spinner from '@/components/Spinner'

interface Session {
  id: string
  classId: string
  class?: {
    id: string
    name: string
  }
  startTime: string
  endTime: string
  maxCapacity: number
  currentBookings: number
  status: string
  instructorId?: string
  instructor?: {
    user: {
      name?: string
      email: string
    }
  }
}

interface Class {
  id: string
  name: string
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    classId: '',
    instructorId: '',
    startTime: '',
    endTime: '',
    maxCapacity: '20',
    status: 'SCHEDULED'
  })
  const [saving, setSaving] = useState(false)
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
      inputBorder: '#ccc'
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
      inputBorder: '#444'
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
    fetchSessions(authToken)
    fetchClasses(authToken)
    fetchInstructors(authToken)
  }, [router])

  const fetchSessions = async (authToken: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions', {
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
      setSessions(Array.isArray(result) ? result : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async (authToken: string) => {
    try {
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setClasses(Array.isArray(result) ? result : [])
      }
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const fetchInstructors = async (authToken: string) => {
    try {
      const response = await fetch('/api/instructors', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setInstructors(Array.isArray(result) ? result : [])
      }
    } catch (err) {
      console.error('Error fetching instructors:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId: formData.classId,
          instructorId: formData.instructorId || undefined,
          startTime: formData.startTime,
          endTime: formData.endTime,
          maxCapacity: parseInt(formData.maxCapacity)
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      await fetchSessions(token)
      setShowForm(false)
      setFormData({ classId: '', instructorId: '', startTime: '', endTime: '', maxCapacity: '20', status: 'SCHEDULED' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (session: Session) => {
    setEditingId(session.id)
    setFormData({
      classId: session.classId,
      instructorId: session.instructorId || '',
      startTime: formatDateTimeLocal(session.startTime),
      endTime: formatDateTimeLocal(session.endTime),
      maxCapacity: session.maxCapacity.toString(),
      status: session.status
    })
    setShowForm(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !editingId) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId: formData.classId,
          instructorId: formData.instructorId || undefined,
          startTime: formData.startTime,
          endTime: formData.endTime,
          maxCapacity: parseInt(formData.maxCapacity),
          status: formData.status
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      await fetchSessions(token)
      setShowForm(false)
      setEditingId(null)
      setFormData({ classId: '', instructorId: '', startTime: '', endTime: '', maxCapacity: '20', status: 'SCHEDULED' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ classId: '', instructorId: '', startTime: '', endTime: '', maxCapacity: '20', status: 'SCHEDULED' })
    setError(null)
  }

  const refreshData = () => {
    if (token) {
      fetchSessions(token)
    }
  }

  if (!token) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: colors.text }}>
        <Spinner text={t('loading')} />
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: colors.cardBg,
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: theme === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.3)',
      border: `1px solid ${colors.border}`,
      color: colors.text
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: colors.text }}>
          {t('sessions')}
        </h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
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
          <button
            onClick={() => {
              if (showForm) {
                handleCancel()
              } else {
                setShowForm(true)
                setEditingId(null)
              }
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: showForm ? '#666' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showForm ? t('cancel') : `+ ${t('newSession')}`}
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
          <p style={{ margin: 0 }}>{t('error')}: {error}</p>
        </div>
      )}

      {showForm && (
        <div style={{
          backgroundColor: colors.cardBg,
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: `1px solid ${colors.border}`
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: colors.text }}>
            {editingId ? t('editSession') : t('createNewSession')}
          </h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: colors.text }}>
                  {t('class')} *
                </label>
                <select
                  required
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    backgroundColor: colors.inputBg,
                    color: colors.text
                  }}
                >
                  <option value="">{t('selectClass')}</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: colors.text }}>
                  {t('maxCapacity')}
                </label>
                <input
                  type="number"
                  value={formData.maxCapacity}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    backgroundColor: colors.inputBg,
                    color: colors.text
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: colors.text }}>
                  {t('startTime')} *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    backgroundColor: colors.inputBg,
                    color: colors.text
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: colors.text }}>
                  {t('endTime')} *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    backgroundColor: colors.inputBg,
                    color: colors.text
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: colors.text }}>
                {t('instructor')} ({t('optional')})
              </label>
              <select
                value={formData.instructorId}
                onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: colors.inputBg,
                  color: colors.text
                }}
              >
                <option value="">{t('selectInstructor')}</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.user?.name || instructor.user?.email || instructor.id}
                  </option>
                ))}
              </select>
            </div>
            {editingId && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: colors.text }}>
                  {t('status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    backgroundColor: colors.inputBg,
                    color: colors.text
                  }}
                >
                  <option value="SCHEDULED">{t('scheduled')}</option>
                  <option value="IN_PROGRESS">{t('inProgress')}</option>
                  <option value="COMPLETED">{t('completed')}</option>
                  <option value="CANCELLED">{t('cancelled')}</option>
                </select>
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {saving && <Spinner size={16} color="#ffffff" />}
              {saving ? t('saving') : (editingId ? t('save') : t('createSession'))}
            </button>
          </form>
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: colors.text }}>
          <p>{t('loading')}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>
          <p>{t('noSessionsFound')}</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: colors.cardBg,
          borderRadius: '8px',
          overflow: 'hidden',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.theadBg
          }}>
            <strong style={{ color: colors.text }}>
              {t('allSessions')} ({sessions.length})
            </strong>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: colors.theadBg }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('class')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('startTime')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('endTime')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('currentBookings')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('status')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr
                  key={session.id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: index % 2 === 0 ? colors.rowEven : colors.rowOdd
                  }}
                >
                  <td style={{ padding: '1rem', color: colors.text }}>
                    <strong>{session.class?.name || 'N/A'}</strong>
                  </td>
                  <td style={{ padding: '1rem', color: colors.text }}>{formatDate(session.startTime)}</td>
                  <td style={{ padding: '1rem', color: colors.text }}>{formatDate(session.endTime)}</td>
                  <td style={{ padding: '1rem', color: colors.text }}>
                    {session.currentBookings} / {session.maxCapacity}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      backgroundColor: 
                        session.status === 'SCHEDULED' ? '#e3f2fd' :
                        session.status === 'COMPLETED' ? '#e8f5e9' :
                        session.status === 'CANCELLED' ? '#ffebee' : '#fff3e0',
                      color: 
                        session.status === 'SCHEDULED' ? '#1976d2' :
                        session.status === 'COMPLETED' ? '#388e3c' :
                        session.status === 'CANCELLED' ? '#d32f2f' : '#f57c00'
                    }}>
                      {session.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      onClick={() => handleEdit(session)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      {t('edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
