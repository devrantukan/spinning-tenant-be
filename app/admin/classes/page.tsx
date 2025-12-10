'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/useTheme'
import { useLanguage } from '@/lib/LanguageContext'
import Spinner from '@/components/Spinner'

interface Class {
  id: string
  name: string
  description?: string
  duration: number
  maxCapacity: number
  status: string
  instructorId?: string
  instructor?: {
    user: {
      name?: string
      email: string
    }
  }
  _count?: {
    sessions: number
  }
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '45',
    maxCapacity: '20',
    instructorId: '',
    status: 'ACTIVE'
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
    fetchClasses(authToken)
    fetchInstructors(authToken)
  }, [router])

  const fetchClasses = async (authToken: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/classes', {
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
      setClasses(Array.isArray(result) ? result : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes')
    } finally {
      setLoading(false)
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          duration: parseInt(formData.duration),
          maxCapacity: parseInt(formData.maxCapacity),
          instructorId: formData.instructorId || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      await fetchClasses(token)
      setShowForm(false)
      setFormData({ name: '', description: '', duration: '45', maxCapacity: '20', instructorId: '', status: 'ACTIVE' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create class')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cls: Class) => {
    setEditingId(cls.id)
    setFormData({
      name: cls.name,
      description: cls.description || '',
      duration: cls.duration.toString(),
      maxCapacity: cls.maxCapacity.toString(),
      instructorId: cls.instructorId || '',
      status: cls.status
    })
    setShowForm(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !editingId) return

    setSaving(true)
    setError(null)

    try {
      // Note: Update endpoint would need to be added to API
      const response = await fetch(`/api/classes/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          duration: parseInt(formData.duration),
          maxCapacity: parseInt(formData.maxCapacity),
          instructorId: formData.instructorId || undefined,
          status: formData.status
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      await fetchClasses(token)
      setShowForm(false)
      setEditingId(null)
      setFormData({ name: '', description: '', duration: '45', maxCapacity: '20', instructorId: '', status: 'ACTIVE' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update class')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', description: '', duration: '45', maxCapacity: '20', instructorId: '', status: 'ACTIVE' })
    setError(null)
  }

  const refreshData = () => {
    if (token) {
      fetchClasses(token)
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
          {t('classes')}
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
            {showForm ? t('cancel') : `+ ${t('newClass')}`}
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
            {editingId ? t('editClass') : t('createNewClass')}
          </h3>
          <form onSubmit={editingId ? handleUpdate : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: colors.text }}>
                  {t('name')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  {t('duration')} ({t('minutes')}) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
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
                {t('description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  backgroundColor: colors.inputBg,
                  color: colors.text
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
              <div>
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
                  <option value="ACTIVE">{t('active')}</option>
                  <option value="INACTIVE">{t('inactive')}</option>
                  <option value="ARCHIVED">{t('archived')}</option>
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
              {saving ? t('saving') : (editingId ? t('save') : t('createClass'))}
            </button>
          </form>
        </div>
      )}

      {loading && classes.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: colors.text }}>
          <p>{t('loading')}</p>
        </div>
      ) : classes.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>
          <p>{t('noClassesFound')}</p>
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
              {t('allClasses')} ({classes.length})
            </strong>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: colors.theadBg }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('name')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('duration')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('capacity')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('status')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('sessions')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, index) => (
                <tr
                  key={cls.id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: index % 2 === 0 ? colors.rowEven : colors.rowOdd
                  }}
                >
                  <td style={{ padding: '1rem', color: colors.text }}>
                    <strong>{cls.name}</strong>
                    {cls.description && (
                      <div style={{ fontSize: '0.85rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
                        {cls.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: colors.text }}>{cls.duration} {t('minutes')}</td>
                  <td style={{ padding: '1rem', color: colors.text }}>{cls.maxCapacity}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      backgroundColor: cls.status === 'ACTIVE' ? '#e8f5e9' : cls.status === 'ARCHIVED' ? '#f5f5f5' : '#fff3e0',
                      color: cls.status === 'ACTIVE' ? '#388e3c' : cls.status === 'ARCHIVED' ? '#666' : '#f57c00'
                    }}>
                      {cls.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: colors.text }}>{cls._count?.sessions || 0}</td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      onClick={() => handleEdit(cls)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        marginRight: '0.5rem'
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
