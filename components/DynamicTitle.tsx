'use client'

import { useEffect } from 'react'

export default function DynamicTitle() {
  useEffect(() => {
    const updateTitle = async () => {
      try {
        const authToken = localStorage.getItem('supabase_auth_token')
        if (!authToken) {
          document.title = 'Spinning Tenant'
          return
        }

        const response = await fetch('/api/organization', {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.name) {
            document.title = data.name
          } else {
            document.title = 'Spinning Tenant'
          }
        } else {
          document.title = 'Spinning Tenant'
        }
      } catch (error) {
        console.error('Error fetching organization for title:', error)
        document.title = 'Spinning Tenant'
      }
    }

    // Initial update
    updateTitle()

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

    // Poll for changes periodically (every 30 seconds) in case organization is updated elsewhere
    const interval = setInterval(updateTitle, 30000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-state-change', handleStorageChange)
      window.removeEventListener('organization-updated', handleOrganizationUpdate)
      clearInterval(interval)
    }
  }, [])

  return null
}

