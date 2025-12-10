'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useTheme } from '@/lib/useTheme'
import { useLanguage } from '@/lib/LanguageContext'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const [organizationName, setOrganizationName] = useState<string>('')
  const [loadingOrg, setLoadingOrg] = useState(true)
  
  // Theme styles
  const themeStyles = {
    light: {
      bg: '#f5f5f5',
      cardBg: 'white',
      text: '#333',
      textSecondary: '#666',
      border: '#e0e0e0',
      headerBg: 'white',
      navBg: 'white',
      activeBorder: '#1976d2',
      activeText: '#1976d2',
      inactiveText: '#666'
    },
    dark: {
      bg: '#121212',
      cardBg: '#1e1e1e',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0',
      border: '#333',
      headerBg: '#1e1e1e',
      navBg: '#1e1e1e',
      activeBorder: '#64b5f6',
      activeText: '#64b5f6',
      inactiveText: '#b0b0b0'
    }
  }
  
  const colors = themeStyles[theme]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('supabase_auth_token')
      localStorage.removeItem('supabase_session')
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      localStorage.removeItem('supabase_auth_token')
      localStorage.removeItem('supabase_session')
      router.push('/login')
    }
  }

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const authToken = localStorage.getItem('supabase_auth_token')
        if (!authToken) {
          setLoadingOrg(false)
          return
        }

        const response = await fetch('/api/organization', {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setOrganizationName(data.name || '')
        }
      } catch (error) {
        console.error('Error fetching organization:', error)
      } finally {
        setLoadingOrg(false)
      }
    }

    fetchOrganization()
  }, [])

  const navItems = [
    { href: '/admin', label: t('organization') },
    { href: '/admin/classes', label: t('classes') },
    { href: '/admin/sessions', label: t('sessions') },
    { href: '/admin/bookings', label: t('bookings') },
    { href: '/admin/members', label: t('members') },
    { href: '/admin/instructors', label: t('instructors') },
    { href: '/admin/users', label: t('users') },
  ]

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
        borderBottom: `1px solid ${colors.border}`,
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'background-color 0.3s, border-color 0.3s'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: colors.text }}>
          {loadingOrg ? (
            t('adminDashboard')
          ) : organizationName ? (
            `${organizationName} - ${t('adminDashboard')}`
          ) : (
            t('adminDashboard')
          )}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {t('logout')}
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        backgroundColor: colors.navBg,
        borderBottom: `1px solid ${colors.border}`,
        padding: '0 2rem',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        transition: 'background-color 0.3s, border-color 0.3s'
      }}>
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '1rem 1.5rem',
                textDecoration: 'none',
                borderBottom: isActive ? `2px solid ${colors.activeBorder}` : '2px solid transparent',
                color: isActive ? colors.activeText : colors.inactiveText,
                fontWeight: isActive ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                transition: 'all 0.3s'
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Content */}
      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}

