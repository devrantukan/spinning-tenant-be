'use client'

import { useEffect } from 'react'

export default function DynamicTitle() {
  useEffect(() => {
    const updateTitle = async () => {
      const authToken = localStorage.getItem('supabase_auth_token')
      if (!authToken) {
        document.title = 'Spinning Tenant'
        return
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch('/api/organization', {
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          if (data?.name) {
            document.title = data.name
          } else {
            document.title = 'Spinning Tenant'
          }
        } else if (response.status === 401 || response.status === 403) {
          document.title = 'Spinning Tenant'
        } else {
          document.title = 'Spinning Tenant'
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId)
        
        const error = fetchError as { name?: string; message?: string }
        
        // Ignore abort errors (timeout) and network errors silently
        if (error.name === 'AbortError' || error.message === 'Failed to fetch') {
          document.title = 'Spinning Tenant'
          return
        }
        
        // Only log unexpected errors
        console.error('Error fetching organization for title:', fetchError)
        document.title = 'Spinning Tenant'
      }
    }

    // Initial update with a small delay to ensure localStorage is available
    const timer = setTimeout(() => {
      updateTitle()
    }, 100)

    // Update title when storage changes (e.g., after login/logout)
    const handleStorageChange = () => {
      updateTitle()
    }

    // Listen for organization updates
    const handleOrganizationUpdate = () => {
      updateTitle()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-state-change', handleStorageChange)
    window.addEventListener('organization-updated', handleOrganizationUpdate)

    // Poll for changes periodically (every 30 seconds)
    const checkAndPoll = () => {
      const authToken = localStorage.getItem('supabase_auth_token')
      if (authToken) {
        updateTitle()
      }
    }
    const interval = setInterval(checkAndPoll, 30000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-state-change', handleStorageChange)
      window.removeEventListener('organization-updated', handleOrganizationUpdate)
      clearInterval(interval)
    }
  }, [])

  return null
}
