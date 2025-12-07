'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/useTheme'
import { useLanguage } from '@/lib/LanguageContext'

interface InstructorInfo {
  id: string
  userId: string
  organizationId: string
  bio?: string
  specialties?: string[]
  status: string
  user: {
    id: string
    name?: string
    email: string
    role: string
  }
  _count?: {
    classes: number
    sessions: number
  }
}

interface UserInfo {
  id: string
  email: string
  role: string
  organizationId: string
}

export default function InstructorPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [instructorInfo, setInstructorInfo] = useState<InstructorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  
  // Theme styles
  const themeStyles = {
    light: {
      bg: '#f5f5f5',
      cardBg: 'white',
      text: '#333',
      textSecondary: '#666',
      border: '#e0e0e0',
      headerBg: 'white',
      shadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    dark: {
      bg: '#121212',
      cardBg: '#1e1e1e',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0',
      border: '#333',
      headerBg: '#1e1e1e',
      shadow: '0 2px 4px rgba(0,0,0,0.3)'
    }
  }
  
  const colors = themeStyles[theme]

  useEffect(() => {
    const authToken = localStorage.getItem('supabase_auth_token')
    
    if (!authToken) {
      router.push('/login')
      return
    }

    setToken(authToken)
    fetchUserData(authToken)
  }, [router])

  const fetchUserData = async (authToken: string) => {
    setLoading(true)
    setError(null)

    try {
      // Get current user info
      const meResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!meResponse.ok) {
        if (meResponse.status === 401) {
          localStorage.removeItem('supabase_auth_token')
          localStorage.removeItem('supabase_session')
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch user information')
      }

      const userData = await meResponse.json()
      setUser(userData)

      // Verify user is an instructor
      if (userData.role !== 'INSTRUCTOR') {
        router.push('/admin')
        return
      }

      // Fetch instructor details
      const instructorsResponse = await fetch('/api/instructors', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!instructorsResponse.ok) {
        throw new Error('Failed to fetch instructor information')
      }

      const instructors = await instructorsResponse.json()
      // Find the instructor record for this user
      const instructor = Array.isArray(instructors) 
        ? instructors.find((inst: InstructorInfo) => inst.userId === userData.id || inst.user?.email === userData.email)
        : null

      if (instructor) {
        setInstructorInfo(instructor)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load instructor data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('supabase_auth_token')
      localStorage.removeItem('supabase_session')
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
      localStorage.removeItem('supabase_auth_token')
      localStorage.removeItem('supabase_session')
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        color: colors.text
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', color: colors.textSecondary }}>Loading instructor dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg
      }}>
        <div style={{
          backgroundColor: colors.cardBg,
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: colors.shadow,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ color: '#c62828', fontSize: '1.1rem', marginBottom: '1rem' }}>Error: {error}</p>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: 'system-ui',
      transition: 'background-color 0.3s, color 0.3s'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: colors.headerBg,
        boxShadow: colors.shadow,
        borderBottom: `1px solid ${colors.border}`,
        padding: '1rem 2rem',
        marginBottom: '2rem',
        transition: 'background-color 0.3s, border-color 0.3s'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: colors.text }}>{t('instructorDashboard')}</h1>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'tr')}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: colors.cardBg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.3s'
              }}
            >
              <option value="en">🇬🇧 EN</option>
              <option value="tr">🇹🇷 TR</option>
            </select>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: colors.cardBg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s'
              }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <span style={{ fontSize: '1.2rem' }}>🌙</span>
              ) : (
                <span style={{ fontSize: '1.2rem' }}>☀️</span>
              )}
              <span>{t(theme === 'light' ? 'dark' : 'light')}</span>
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem 2rem'
      }}>
        {/* Welcome Section */}
        <div style={{
          backgroundColor: colors.cardBg,
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: colors.shadow,
          border: `1px solid ${colors.border}`,
          marginBottom: '2rem',
          transition: 'background-color 0.3s, border-color 0.3s'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', color: colors.text }}>
            {t('welcome')}, {instructorInfo?.user?.name || user?.email || 'Instructor'}!
          </h2>
          <p style={{ color: colors.textSecondary, margin: 0 }}>
            {user?.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: colors.shadow,
            border: `1px solid ${colors.border}`,
            transition: 'background-color 0.3s, border-color 0.3s'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem', color: colors.textSecondary }}>
              {t('status')}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: instructorInfo?.status === 'ACTIVE' ? '#388e3c' : '#c62828'
            }}>
              {instructorInfo?.status || 'N/A'}
            </p>
          </div>

          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: colors.shadow,
            border: `1px solid ${colors.border}`,
            transition: 'background-color 0.3s, border-color 0.3s'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem', color: colors.textSecondary }}>
              {t('classes')}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1976d2'
            }}>
              {instructorInfo?._count?.classes || 0}
            </p>
          </div>

          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: colors.shadow,
            border: `1px solid ${colors.border}`,
            transition: 'background-color 0.3s, border-color 0.3s'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem', color: colors.textSecondary }}>
              {t('sessions')}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1976d2'
            }}>
              {instructorInfo?._count?.sessions || 0}
            </p>
          </div>
        </div>

        {/* Instructor Details */}
        <div style={{
          backgroundColor: colors.cardBg,
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: colors.shadow,
          border: `1px solid ${colors.border}`,
          transition: 'background-color 0.3s, border-color 0.3s'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', color: colors.text }}>
            {t('instructorInformation')}
          </h2>

          {instructorInfo?.bio && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem', color: colors.textSecondary }}>
                {t('bio')}
              </h3>
              <p style={{ margin: 0, color: colors.text, lineHeight: '1.6' }}>
                {instructorInfo.bio}
              </p>
            </div>
          )}

          {instructorInfo?.specialties && instructorInfo.specialties.length > 0 && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem', color: colors.textSecondary }}>
                {t('specialties')}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {instructorInfo.specialties.map((specialty, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: theme === 'dark' ? '#1e3a5f' : '#e3f2fd',
                      color: theme === 'dark' ? '#90caf9' : '#1976d2',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(!instructorInfo?.bio && (!instructorInfo?.specialties || instructorInfo.specialties.length === 0)) && (
            <p style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
              {t('noAdditionalInfo')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

