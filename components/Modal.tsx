"use client"

import { useEffect } from "react"
import { useTheme } from "@/lib/useTheme"
import { useLanguage } from "@/lib/LanguageContext"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onConfirm?: () => void | Promise<void>
  confirmText?: string
  cancelText?: string
  confirmButtonStyle?: React.CSSProperties
  cancelButtonStyle?: React.CSSProperties
  showCancel?: boolean
  showConfirm?: boolean
  size?: 'small' | 'medium' | 'large'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText,
  cancelText,
  showCancel = true,
  showConfirm = true,
  confirmButtonStyle,
  cancelButtonStyle,
  size = 'medium'
}: ModalProps) {
  const { theme } = useTheme()
  const { t } = useLanguage()

  useEffect(() => {
    if (!isOpen) return
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])
  
  if (!isOpen) return null

  const colors = {
    light: {
      overlay: 'rgba(0, 0, 0, 0.5)',
      bg: 'white',
      border: '#e0e0e0',
      text: '#333',
      textSecondary: '#666'
    },
    dark: {
      overlay: 'rgba(0, 0, 0, 0.7)',
      bg: '#1e1e1e',
      border: '#333',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0'
    }
  }

  const currentColors = colors[theme]

  const sizeStyles = {
    small: { maxWidth: '400px' },
    medium: { maxWidth: '500px' },
    large: { maxWidth: '600px' }
  }

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm()
    }
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: currentColors.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: currentColors.bg,
          borderRadius: '8px',
          padding: '1.5rem',
          width: '100%',
          ...sizeStyles[size],
          border: `1px solid ${currentColors.border}`,
          boxShadow: theme === 'light' 
            ? '0 4px 6px rgba(0,0,0,0.1)' 
            : '0 4px 6px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            color: currentColors.text
          }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: currentColors.textSecondary,
              padding: '0.25rem 0.5rem',
              lineHeight: '1',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#333' : '#f0f0f0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          color: currentColors.text,
          marginBottom: '1.5rem',
          lineHeight: '1.6'
        }}>
          {children}
        </div>

        {(showCancel || showConfirm) && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: `1px solid ${currentColors.border}`
          }}>
            {showCancel && (
              <button
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: theme === 'dark' ? '#666' : '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  ...cancelButtonStyle
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#777' : '#888'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? '#666' : '#999'
                }}
              >
                {cancelText || t('cancel') || 'Cancel'}
              </button>
            )}
            {showConfirm && onConfirm && (
              <button
                onClick={async () => {
                  try {
                    await handleConfirm()
                  } catch (error) {
                    // Don't close modal on error - let the error handler manage the state
                    console.error('Modal confirm error:', error)
                  }
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  ...confirmButtonStyle
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#45a049'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4caf50'
                }}
              >
                {confirmText || t('confirm') || 'Confirm'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

