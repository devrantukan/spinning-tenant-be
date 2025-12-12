'use client'

import { useState, useEffect } from 'react'

export default function SpinningPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get auth token from localStorage (set by frontend after Supabase login)
    const token = localStorage.getItem('supabase_auth_token')
    
    if (!token) {
      setError('Not authenticated. Please log in.')
      setLoading(false)
      return
    }

    // Fetch organization data
    fetch('/api/organization', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading organization data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <p>Error: {error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Spinning App - Tenant Backend</h1>
      <div style={{ marginTop: '2rem' }}>
        <h2>Organization</h2>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  )
}





