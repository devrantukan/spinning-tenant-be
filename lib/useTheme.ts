'use client'

import { useContext } from 'react'
import { ThemeContext } from './ThemeContext'

// Export useTheme hook for backward compatibility
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

