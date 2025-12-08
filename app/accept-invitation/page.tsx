'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/LanguageContext'

function AcceptInvitationForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionSet, setSessionSet] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  useEffect(() => {
    // Handle Supabase invitation token automatically
    // Supabase invitation links redirect with hash fragments:
    // #access_token=...&refresh_token=...&type=invite
    const handleInvitation = async () => {
      console.log('[ACCEPT_INVITATION] Checking for invitation tokens...', {
        hash: window.location.hash,
        search: window.location.search,
        fullUrl: window.location.href
      })

      // Check if we already have a session
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
        console.log('[ACCEPT_INVITATION] Session already exists')
        setSessionSet(true)
        return
      }

      // Check hash fragments first (Supabase redirects with these after verify endpoint)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      
      // Check query params (some formats use query params)
      const queryToken = searchParams.get('token')
      const queryType = searchParams.get('type')
      const queryAccessToken = searchParams.get('access_token')
      const queryRefreshToken = searchParams.get('refresh_token')

      console.log('[ACCEPT_INVITATION] Tokens found:', {
        hashAccessToken: !!accessToken,
        hashRefreshToken: !!refreshToken,
        hashType: type,
        queryToken: !!queryToken,
        queryType: queryType,
        queryAccessToken: !!queryAccessToken,
        queryRefreshToken: !!queryRefreshToken
      })

      // Try hash fragments first (most common after Supabase verify redirect)
      if (accessToken && refreshToken && (type === 'invite' || type === 'signup')) {
        try {
          console.log('[ACCEPT_INVITATION] Setting session from hash fragments')
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('[ACCEPT_INVITATION] Session error:', sessionError)
            setError('Invalid or expired invitation link. Please request a new invitation.')
          } else {
            console.log('[ACCEPT_INVITATION] Session set successfully from hash fragments', data)
            setSessionSet(true)
            // Clear the hash from URL for cleaner UX
            window.history.replaceState(null, '', window.location.pathname)
          }
        } catch (err: any) {
          console.error('[ACCEPT_INVITATION] Invitation handling error:', err)
          setError('Failed to process invitation link. Please request a new invitation.')
        }
      } 
      // Try query params (from verify endpoint redirect)
      else if (queryAccessToken && queryRefreshToken && (queryType === 'invite' || queryType === 'signup')) {
        try {
          console.log('[ACCEPT_INVITATION] Setting session from query params')
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: queryAccessToken,
            refresh_token: queryRefreshToken,
          })

          if (sessionError) {
            console.error('[ACCEPT_INVITATION] Session error:', sessionError)
            setError('Invalid or expired invitation link. Please request a new invitation.')
          } else {
            console.log('[ACCEPT_INVITATION] Session set successfully from query params', data)
            setSessionSet(true)
            // Clear query params from URL
            window.history.replaceState(null, '', window.location.pathname)
          }
        } catch (err: any) {
          console.error('[ACCEPT_INVITATION] Invitation handling error:', err)
          setError('Failed to process invitation link. Please request a new invitation.')
        }
      }
      // If we have a token in query but no hash, wait for Supabase redirect
      else if (queryToken || window.location.search.includes('token=')) {
        console.log('[ACCEPT_INVITATION] Found token in URL from verify endpoint, waiting for redirect...')
        // Wait a bit for Supabase verify endpoint to redirect with hash fragments
        const waitForRedirect = setTimeout(() => {
          const delayedHash = new URLSearchParams(window.location.hash.substring(1))
          const delayedAccessToken = delayedHash.get('access_token')
          if (!delayedAccessToken) {
            console.error('[ACCEPT_INVITATION] Verify endpoint did not redirect with tokens after 2 seconds')
            setError('The invitation link appears to be invalid or expired. Please request a new invitation.')
          }
        }, 2000)
        
        return () => clearTimeout(waitForRedirect)
      } 
      // Listen for auth state changes
      else {
        console.log('[ACCEPT_INVITATION] Setting up auth state listener...')
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('[ACCEPT_INVITATION] Auth state changed:', event, session ? 'has session' : 'no session')
          if (event === 'SIGNED_IN' && session) {
            console.log('[ACCEPT_INVITATION] User signed in via invitation, session:', session ? 'active' : 'none')
            setSessionSet(true)
            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname)
          }
        })

        // Cleanup subscription on unmount
        return () => {
          subscription.unsubscribe()
        }
      }
    }

    handleInvitation()
  }, [searchParams])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // Check if we have a session first
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('No active session. Please click the invitation link again.')
        setLoading(false)
        return
      }

      // Update password for the current user
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('[ACCEPT_INVITATION] Password update error:', updateError)
        setError(updateError.message || 'Failed to set password. Please try again.')
        setLoading(false)
        return
      }

      console.log('[ACCEPT_INVITATION] Password set successfully')
      setSuccess(true)

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      console.error('[ACCEPT_INVITATION] Error setting password:', err)
      setError(err.message || 'Failed to set password. Please try again.')
      setLoading(false)
    }
  }

  if (!sessionSet && !error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ textAlign: 'center', color: '#666' }}>
            {t('loading')}...
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#4caf50', marginBottom: '1rem' }}>
            {t('passwordSetSuccess') || 'Password Set Successfully!'}
          </h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            {t('redirectingToLogin') || 'Redirecting to login...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '2rem', 
        borderRadius: '8px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ 
          marginBottom: '1.5rem', 
          fontSize: '1.5rem',
          textAlign: 'center'
        }}>
          {t('acceptInvitation') || 'Accept Invitation'}
        </h1>

        <p style={{ 
          marginBottom: '1.5rem', 
          color: '#666',
          textAlign: 'center'
        }}>
          {t('setPasswordDescription') || 'Please set a password to complete your account setup.'}
        </p>

        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {!sessionSet && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#fff3cd',
            color: '#856404',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {t('waitingForInvitation') || 'Processing invitation link...'}
          </div>
        )}

        <form onSubmit={handleSetPassword}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: '600'
            }}>
              {t('newPassword') || 'New Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!sessionSet || loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: '600'
            }}>
              {t('confirmPassword') || 'Confirm Password'}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={!sessionSet || loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!sessionSet || loading || password !== confirmPassword}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: sessionSet && !loading && password === confirmPassword ? '#1976d2' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: sessionSet && !loading && password === confirmPassword ? 'pointer' : 'not-allowed',
              opacity: sessionSet && !loading && password === confirmPassword ? 1 : 0.6
            }}
          >
            {loading ? (t('setting') || 'Setting...') : (t('setPassword') || 'Set Password')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AcceptInvitation() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p>{'loading'}...</p>
      </div>
    }>
      <AcceptInvitationForm />
    </Suspense>
  )
}

