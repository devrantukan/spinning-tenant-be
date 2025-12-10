'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/LanguageContext";
import Spinner from "@/components/Spinner";

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        // Check for session in Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Store session in localStorage for API calls
          localStorage.setItem('supabase_session', JSON.stringify(session));
          localStorage.setItem('supabase_auth_token', session.access_token);
          setIsLoggedIn(true);

          // Fetch user role to determine redirect
          try {
            const meResponse = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (meResponse.ok) {
              const userData = await meResponse.json();
              setUserRole(userData.role);
              
              // Redirect based on role
              if (userData.role === 'INSTRUCTOR') {
                router.push('/instructor');
              } else if (userData.role === 'ADMIN' || userData.role === 'TENANT_ADMIN') {
                router.push('/admin');
              } else {
                // For MEMBER role, redirect to admin as well
                router.push('/admin');
              }
            } else {
              // If we can't get role, check localStorage token
              const token = localStorage.getItem('supabase_auth_token');
              if (token) {
                router.push('/admin'); // Default redirect
              }
            }
          } catch (err) {
            console.error('Error fetching user role:', err);
            // Default redirect if role fetch fails
            router.push('/admin');
          }
        } else {
          // No session, check localStorage as fallback
          const token = localStorage.getItem('supabase_auth_token');
          if (token) {
            // Try to verify token is still valid
            try {
              const meResponse = await fetch('/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (meResponse.ok) {
                const userData = await meResponse.json();
                setUserRole(userData.role);
                
                // Redirect based on role
                if (userData.role === 'INSTRUCTOR') {
                  router.push('/instructor');
                } else {
                  router.push('/admin');
                }
                setIsLoggedIn(true);
              } else {
                // Token is invalid, clear it
                localStorage.removeItem('supabase_auth_token');
                localStorage.removeItem('supabase_session');
              }
            } catch (err) {
              // Clear invalid token
              localStorage.removeItem('supabase_auth_token');
              localStorage.removeItem('supabase_session');
            }
          }
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('supabase_session', JSON.stringify(session));
        localStorage.setItem('supabase_auth_token', session.access_token);
        setIsLoggedIn(true);
        
        // Fetch role and redirect
        fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
          .then(res => res.json())
          .then(userData => {
            if (userData.role === 'INSTRUCTOR') {
              router.push('/instructor');
            } else {
              router.push('/admin');
            }
          })
          .catch(() => {
            router.push('/admin');
          });
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setUserRole(null);
        localStorage.removeItem('supabase_auth_token');
        localStorage.removeItem('supabase_session');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        // Store session in localStorage for API calls
        localStorage.setItem('supabase_session', JSON.stringify(data.session));
        localStorage.setItem('supabase_auth_token', data.session.access_token);
        setIsLoggedIn(true);
        
        // Get user's role to determine redirect
        try {
          const meResponse = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`
            }
          });
          
          if (meResponse.ok) {
            const userData = await meResponse.json();
            setUserRole(userData.role);
            
            // Redirect based on role
            if (userData.role === 'INSTRUCTOR') {
              router.push('/instructor');
            } else if (userData.role === 'ADMIN' || userData.role === 'TENANT_ADMIN') {
              router.push('/admin');
            } else {
              // For MEMBER role, redirect to admin as well
              router.push('/admin');
            }
          } else {
            // If we can't get role, default to admin
            router.push('/admin');
          }
        } catch (err) {
          // If there's an error getting role, default to admin
          console.error('Error fetching user role:', err);
          router.push('/admin');
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || t('failedToSignIn') || 'Failed to sign in');
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui'
      }}>
        <Spinner text={t('loading')} />
      </div>
    );
  }

  // If logged in and redirecting, show loading
  if (isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        fontFamily: 'system-ui'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#666', margin: 0 }}>
            {t('redirecting') || 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  // Show login form for unauthorized users
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui',
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
          marginBottom: '2rem', 
          textAlign: 'center',
          color: '#1a1a1a',
          fontSize: '1.75rem',
          fontWeight: '600'
        }}>
          {t('login') || 'Login'}
        </h1>

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem',
              color: '#333'
            }}>
              {t('email') || 'Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              placeholder={t('email') || 'Enter your email'}
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
              {t('password') || 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
              placeholder={t('password') || 'Enter your password'}
            />
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loginLoading ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loginLoading ? 'not-allowed' : 'pointer',
              opacity: loginLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loginLoading && <Spinner size={16} color="#ffffff" />}
            {loginLoading ? (t('signingIn') || 'Signing in...') : (t('signIn') || 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
}
