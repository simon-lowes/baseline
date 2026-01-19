/**
 * Theme Onboarding Hook
 *
 * Manages the display of theme-related onboarding indicators:
 * 1. Theme CTA (color picker) - Persistent, max 6 shows, server-synced for auth users
 * 2. Mode Indicator (light/dark/system) - Session-based, auto-dismiss after timeout
 *
 * Design principles (based on UX research):
 * - Pull-based > Push-based: Make help visible but don't overwhelm
 * - Progressive disclosure: Introduce features gradually
 * - Respect user choice: Once dismissed, stay dismissed
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabaseAuth } from '@/hooks/useAuth'
import { db } from '@/runtime/appRuntime'
import { useTheme } from 'next-themes'

// Storage keys
const THEME_CTA_SHOWN_KEY = 'baseline-theme-cta-shown'       // Boolean: has CTA been dismissed
const THEME_CTA_COUNT_KEY = 'baseline-theme-cta-count'       // Number: times CTA has been shown
const MODE_INDICATOR_SHOWN_KEY = 'baseline-mode-indicator-shown'  // Session: mode tooltip shown

// Configuration
const MAX_CTA_SHOWS = 6        // Maximum times to show theme CTA
const MODE_TOOLTIP_DELAY = 1500  // Delay before showing mode tooltip (ms)
const MODE_TOOLTIP_DURATION = 4000  // How long mode tooltip stays visible (ms)
const SYSTEM_TOOLTIP_DURATION = 6000  // How long system mode tooltip stays visible (ms)

interface ThemeOnboarding {
  // Theme picker CTA (persistent)
  showThemeCTA: boolean
  dismissThemeCTA: () => void

  // Mode indicator (session-based)
  showModeIndicator: boolean
  currentModeLabel: string
  modeIndicatorTooltip: string
  dismissModeIndicator: () => void

  // Loading state
  isLoading: boolean
}

/**
 * Get the display label for the current theme mode
 */
function getModeLabel(mode: string | undefined, resolvedTheme: string | undefined): string {
  if (mode === 'system') return 'System theme'
  if (resolvedTheme?.includes('dark') || mode === 'dark') return 'Dark mode'
  return 'Light mode'
}

/**
 * Get the tooltip text for the mode indicator
 */
function getModeTooltip(mode: string | undefined): string {
  if (mode === 'system') return 'Following your device settings'
  if (mode === 'dark') return 'Dark mode active'
  return 'Light mode active'
}

/**
 * Hook for managing theme onboarding state
 */
export function useThemeOnboarding(): ThemeOnboarding {
  const { user, isLoading: authLoading } = useSupabaseAuth()
  const { theme, resolvedTheme } = useTheme()
  
  // Theme CTA state (persistent)
  const [showThemeCTA, setShowThemeCTA] = useState(false)
  const [ctaLoading, setCtaLoading] = useState(true)
  
  // Mode indicator state (session)
  const [showModeIndicator, setShowModeIndicator] = useState(false)
  
  // Refs for cleanup
  const modeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ctaDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Extract mode from theme (e.g., 'zinc-dark' -> 'dark')
  const currentMode = theme?.split('-')[1] || 'light'
  const currentModeLabel = getModeLabel(currentMode, resolvedTheme)
  const modeIndicatorTooltip = getModeTooltip(currentMode)

  /**
   * Load theme CTA state from localStorage and optionally server
   */
  const loadCTAState = useCallback(async () => {
    setCtaLoading(true)

    try {
      // First check localStorage
      const localDismissed = localStorage.getItem(THEME_CTA_SHOWN_KEY) === 'true'
      const localCount = parseInt(localStorage.getItem(THEME_CTA_COUNT_KEY) || '0', 10)

      // If already dismissed locally or exceeded max, don't show
      if (localDismissed || localCount >= MAX_CTA_SHOWS) {
        setShowThemeCTA(false)
        setCtaLoading(false)
        return
      }

      // For authenticated users, also check server
      if (user) {
        const { data, error } = await db.select<{ theme_onboarding_completed: boolean }>('profiles', {
          columns: ['theme_onboarding_completed'],
          where: { id: user.id },
          limit: 1,
        })

        if (!error && data?.[0]?.theme_onboarding_completed) {
          // Server says completed - update local and don't show
          localStorage.setItem(THEME_CTA_SHOWN_KEY, 'true')
          setShowThemeCTA(false)
          setCtaLoading(false)
          return
        }
      }

      // Increment show count
      const newCount = localCount + 1
      localStorage.setItem(THEME_CTA_COUNT_KEY, newCount.toString())

      // Show CTA after delay (gives page time to load)
      ctaDelayRef.current = setTimeout(() => {
        setShowThemeCTA(true)
      }, 1500)

    } catch (err) {
      console.error('[useThemeOnboarding] Error loading CTA state:', err)
      // On error, be conservative and don't show
      setShowThemeCTA(false)
    } finally {
      setCtaLoading(false)
    }
  }, [user])

  /**
   * Dismiss the theme CTA permanently
   */
  const dismissThemeCTA = useCallback(async () => {
    setShowThemeCTA(false)
    localStorage.setItem(THEME_CTA_SHOWN_KEY, 'true')

    // For authenticated users, also update server
    if (user) {
      try {
        await db.update('profiles', { id: user.id }, {
          theme_onboarding_completed: true,
        })
      } catch (err) {
        console.error('[useThemeOnboarding] Error syncing CTA dismissal:', err)
        // Local state is already updated, so user won't see it again this session
      }
    }
  }, [user])

  /**
   * Load mode indicator state (session-based)
   */
  const loadModeIndicatorState = useCallback(() => {
    // Check if already shown this session
    const alreadyShown = sessionStorage.getItem(MODE_INDICATOR_SHOWN_KEY) === 'true'
    if (alreadyShown) {
      setShowModeIndicator(false)
      return
    }

    // Show after delay
    modeTimeoutRef.current = setTimeout(() => {
      setShowModeIndicator(true)

      // Auto-dismiss based on mode (system mode gets longer)
      const duration = currentMode === 'system' ? SYSTEM_TOOLTIP_DURATION : MODE_TOOLTIP_DURATION
      modeTimeoutRef.current = setTimeout(() => {
        setShowModeIndicator(false)
        sessionStorage.setItem(MODE_INDICATOR_SHOWN_KEY, 'true')
      }, duration)
    }, MODE_TOOLTIP_DELAY)
  }, [currentMode])

  /**
   * Dismiss mode indicator
   */
  const dismissModeIndicator = useCallback(() => {
    setShowModeIndicator(false)
    sessionStorage.setItem(MODE_INDICATOR_SHOWN_KEY, 'true')
    if (modeTimeoutRef.current) {
      clearTimeout(modeTimeoutRef.current)
    }
  }, [])

  // Load CTA state when auth resolves
  useEffect(() => {
    if (!authLoading) {
      void loadCTAState()
    }
  }, [authLoading, loadCTAState])

  // Load mode indicator state on mount (session-based)
  useEffect(() => {
    loadModeIndicatorState()
    return () => {
      if (modeTimeoutRef.current) clearTimeout(modeTimeoutRef.current)
      if (ctaDelayRef.current) clearTimeout(ctaDelayRef.current)
    }
  }, []) // Only on mount

  return {
    showThemeCTA,
    dismissThemeCTA,
    showModeIndicator,
    currentModeLabel,
    modeIndicatorTooltip,
    dismissModeIndicator,
    isLoading: ctaLoading || authLoading,
  }
}
