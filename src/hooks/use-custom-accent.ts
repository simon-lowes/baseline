/**
 * Custom Accent Color Hook
 *
 * Manages a user-defined custom accent color that overrides the theme's default.
 * Persists to localStorage and applies via CSS custom property injection.
 */

import { useState, useEffect, useCallback } from 'react'
import { getContrastingForeground } from '@/lib/color-utils'

const STORAGE_KEY = 'baseline-custom-accent'

/**
 * Apply a custom accent color to the document
 *
 * Sets both --primary and --accent since shadcn/ui uses:
 * - --primary for main UI elements (buttons, switches, badges)
 * - --accent for secondary highlighting (hover states, focus backgrounds)
 */
function applyAccentToDOM(oklch: string) {
  const root = document.documentElement

  // Calculate contrasting foreground for text on colored backgrounds
  const foreground = getContrastingForeground(oklch)

  // Set primary color (used by buttons, switches, progress bars, etc.)
  root.style.setProperty('--primary', oklch)
  root.style.setProperty('--primary-foreground', foreground)

  // Set accent color (used for hover states, focus backgrounds, etc.)
  root.style.setProperty('--accent', oklch)
  root.style.setProperty('--accent-foreground', foreground)

  // Update ring color for focus states
  root.style.setProperty('--ring', oklch)
}

/**
 * Remove custom accent colors from the document
 * This restores the theme's default colors
 */
function removeAccentFromDOM() {
  const root = document.documentElement
  root.style.removeProperty('--primary')
  root.style.removeProperty('--primary-foreground')
  root.style.removeProperty('--accent')
  root.style.removeProperty('--accent-foreground')
  root.style.removeProperty('--ring')
}

/**
 * Hook for managing a custom accent color
 *
 * @returns Object with:
 *   - customAccent: Current custom accent color (OKLch string) or null
 *   - setCustomAccent: Function to set a new custom accent
 *   - clearCustomAccent: Function to clear the custom accent and restore theme default
 *   - hasCustomAccent: Boolean indicating if a custom accent is active
 */
export function useCustomAccent() {
  const [customAccent, setCustomAccentState] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load custom accent from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setCustomAccentState(stored)
      applyAccentToDOM(stored)
    }
    setIsInitialized(true)
  }, [])

  // Set a new custom accent color
  const setCustomAccent = useCallback((oklch: string) => {
    setCustomAccentState(oklch)
    localStorage.setItem(STORAGE_KEY, oklch)
    applyAccentToDOM(oklch)
  }, [])

  // Clear the custom accent and restore theme default
  const clearCustomAccent = useCallback(() => {
    setCustomAccentState(null)
    localStorage.removeItem(STORAGE_KEY)
    removeAccentFromDOM()
  }, [])

  return {
    customAccent,
    setCustomAccent,
    clearCustomAccent,
    hasCustomAccent: customAccent !== null,
    isInitialized,
  }
}
