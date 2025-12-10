"use client"

import { useTheme } from "@/lib/useTheme"
import { useEffect } from 'react'

interface SpinnerProps {
  size?: number
  color?: string
  text?: string
}

export default function Spinner({ size = 24, color, text }: SpinnerProps) {
  const { theme } = useTheme()
  const spinnerColor = color || (theme === 'dark' ? '#ffffff' : '#1976d2')

  useEffect(() => {
    // Inject keyframes if not already present
    if (typeof document !== 'undefined' && !document.getElementById('spinner-keyframes')) {
      const style = document.createElement('style')
      style.id = 'spinner-keyframes'
      style.textContent = `
        @keyframes spinner-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  return (
    <div style={{
      display: text ? 'flex' : 'inline-block',
      flexDirection: text ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: text ? '0.75rem' : '0'
    }}>
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          borderTop: `3px solid ${spinnerColor}`,
          borderRadius: '50%',
          animation: 'spinner-spin 0.8s linear infinite',
          flexShrink: 0
        }}
      />
      {text && (
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: theme === 'dark' ? '#e0e0e0' : '#666'
        }}>
          {text}
        </p>
      )}
    </div>
  )
}

