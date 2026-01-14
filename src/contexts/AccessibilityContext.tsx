/**
 * AccessibilityContext - User Accessibility Preferences
 *
 * Provides app-wide accessibility settings that users can toggle:
 * - patternsEnabled: Show patterns on charts for colorblind users
 *
 * Settings are persisted to localStorage and hydrated on mount.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const STORAGE_KEY = 'baseline-accessibility-settings'

interface AccessibilitySettings {
  /** When true, charts display patterns in addition to colors */
  patternsEnabled: boolean
}

interface AccessibilityContextValue extends AccessibilitySettings {
  /** Toggle pattern visibility */
  setPatternsEnabled: (enabled: boolean) => void
  /** Reset all settings to defaults */
  resetSettings: () => void
}

const defaultSettings: AccessibilitySettings = {
  patternsEnabled: false, // Off by default, opt-in for users who need it
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [mounted, setMounted] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AccessibilitySettings>
        setSettings((prev) => ({
          ...prev,
          ...parsed,
        }))
      }
    } catch {
      // If localStorage fails, use defaults
      console.warn('Failed to load accessibility settings from localStorage')
    }
    setMounted(true)
  }, [])

  // Persist settings to localStorage when they change
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      console.warn('Failed to save accessibility settings to localStorage')
    }
  }, [settings, mounted])

  const setPatternsEnabled = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, patternsEnabled: enabled }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  const value: AccessibilityContextValue = {
    ...settings,
    setPatternsEnabled,
    resetSettings,
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

/**
 * Hook to access accessibility settings
 * @throws Error if used outside AccessibilityProvider
 */
export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

/**
 * Hook that returns patternsEnabled safely (returns false if outside provider)
 * Use this in chart components that may be rendered outside the provider context
 */
export function usePatternsEnabled(): boolean {
  const context = useContext(AccessibilityContext)
  return context?.patternsEnabled ?? false
}
