'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/LanguageContext'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  useEffect(() => {
    // Handle Supabase recovery token automatically
    // Supabase recovery links redirect with hash fragments: #access_token=...&refresh_token=...&type=recovery
    const handleRecovery = async () => {
      // Check hash fragments first (Supabase redirects with these)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      
      // Also check query params as fallback (some setups might use these)
      const queryToken = searchParams.get('token')
      const queryType = searchParams.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        try {
          // Set the session from the recovery tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            setError('Invalid or expired reset link. Please request a new password reset.')
          } else {
            // Clear the hash from URL for cleaner UX
            window.history.replaceState(null, '', window.location.pathname)
          }
        } catch (err: any) {
          console.error('Recovery handling error:', err)
          setError('Failed to process reset link. Please request a new password reset.')
        }
      } else if (!queryToken && !accessToken) {
        // No token found at all
        setError('Invalid or missing reset token. Please request a new password reset.')
      }
    }

    handleRecovery()
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Check if we have a session (from recovery token)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Try to get token from URL and establish session
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            throw new Error('Invalid or expired reset link. Please request a new password reset.')
          }
        } else {
          throw new Error('Invalid or expired reset link. Please request a new password reset.')
        }
      }

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      
      // Sign out and redirect to login after 2 seconds
      await supabase.auth.signOut()
      setTimeout(() => {
        router.push('/login?password=reset')
      }, 2000)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          marginTop: 0,
          marginBottom: '1.5rem',
          fontSize: '1.75rem',
          fontWeight: '600',
          color: '#1a1a1a',
          textAlign: 'center'
        }}>
          Reset Password
        </h1>

        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #d32f2f',
            color: '#c62828'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#e8f5e9',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #388e3c',
            color: '#2e7d32'
          }}>
            Password reset successfully! Redirecting to login...
          </div>
        )}

        {!success && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem',
                color: '#333'
              }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  color: '#1a1a1a',
                  backgroundColor: '#fff'
                }}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem',
                color: '#333'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  color: '#1a1a1a',
                  backgroundColor: '#fff'
                }}
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: loading || success ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading || success ? 'not-allowed' : 'pointer',
                opacity: loading || success ? 0.6 : 1
              }}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center'
        }}>
          <a
            href="/login"
            style={{
              color: '#1976d2',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
