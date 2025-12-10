'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/useTheme'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []

export function showToast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).substring(2, 9)
  const newToast: Toast = { id, message, type }
  
  toasts = [...toasts, newToast]
  toastListeners.forEach(listener => listener(toasts))
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    toastListeners.forEach(listener => listener(toasts))
  }, 5000)
  
  return id
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  toastListeners.forEach(listener => listener(toasts))
}

export function ToastContainer() {
  const [toastList, setToastList] = useState<Toast[]>([])
  const { theme } = useTheme()
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToastList(newToasts)
    }
    toastListeners.push(listener)
    setToastList(toasts)
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])
  
  const themeColors = {
    light: {
      success: '#4caf50',
      error: '#f44336',
      info: '#2196f3',
      warning: '#ff9800',
      bg: 'white',
      text: '#333',
      border: '#e0e0e0'
    },
    dark: {
      success: '#66bb6a',
      error: '#ef5350',
      info: '#42a5f5',
      warning: '#ffa726',
      bg: '#1e1e1e',
      text: '#e0e0e0',
      border: '#333'
    }
  }
  
  const colors = themeColors[theme]
  
  if (toastList.length === 0) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px'
    }}>
      {toastList.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: `1px solid ${colors.border}`,
            borderLeft: `4px solid ${colors[toast.type]}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeToast(toast.id)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text,
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0',
              lineHeight: '1',
              opacity: 0.7
            }}
          >
            ×
          </button>
        </div>
      ))}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}


