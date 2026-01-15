/**
 * User Preferences Hook
 *
 * Manages theme and accessibility preferences with server-side persistence.
 * - For authenticated users: syncs to Supabase profiles table
 * - For unauthenticated users: uses localStorage as fallback
 *
 * Preferences are applied optimistically (local state updates immediately),
 * then synced to the server in the background.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabaseAuth } from '@/hooks/useAuth'
import { db } from '@/runtime/appRuntime'

// Local storage keys for unauthenticated users
const LOCAL_THEME_KEY = 'baseline-theme'
const LOCAL_PATTERNS_KEY = 'baseline-patterns-enabled'
const LOCAL_CUSTOM_ACCENT_KEY = 'baseline-custom-accent'

/**
 * User preferences stored in the profiles table
 */
export interface UserPreferences {
  themeColor: string        // e.g., 'zinc', 'nature', 'rose'
  themeMode: 'light' | 'dark' | 'system'
  customAccent: string | null  // OKLch color string or null
  patternsEnabled: boolean
}

/**
 * Database row shape (snake_case for Supabase)
 */
interface ProfilePreferencesRow {
  theme_color: string
  theme_mode: string
  custom_accent: string | null
  patterns_enabled: boolean
}

/**
 * Default preferences for new users
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  themeColor: 'zinc',
  themeMode: 'light',
  customAccent: null,
  patternsEnabled: false,
}

/**
 * Convert database row to UserPreferences
 */
function rowToPreferences(row: ProfilePreferencesRow): UserPreferences {
  return {
    themeColor: row.theme_color || DEFAULT_PREFERENCES.themeColor,
    themeMode: (row.theme_mode as UserPreferences['themeMode']) || DEFAULT_PREFERENCES.themeMode,
    customAccent: row.custom_accent,
    patternsEnabled: row.patterns_enabled ?? DEFAULT_PREFERENCES.patternsEnabled,
  }
}

/**
 * Convert UserPreferences to database row format
 */
function preferencesToRow(prefs: Partial<UserPreferences>): Partial<ProfilePreferencesRow> {
  const row: Partial<ProfilePreferencesRow> = {}
  if (prefs.themeColor !== undefined) row.theme_color = prefs.themeColor
  if (prefs.themeMode !== undefined) row.theme_mode = prefs.themeMode
  if (prefs.customAccent !== undefined) row.custom_accent = prefs.customAccent
  if (prefs.patternsEnabled !== undefined) row.patterns_enabled = prefs.patternsEnabled
  return row
}

/**
 * Load preferences from localStorage (for unauthenticated users)
 */
function loadLocalPreferences(): UserPreferences {
  // Parse theme from next-themes format: 'zinc-dark' -> color: 'zinc', mode: 'dark'
  const storedTheme = localStorage.getItem(LOCAL_THEME_KEY)
  let themeColor = DEFAULT_PREFERENCES.themeColor
  let themeMode: UserPreferences['themeMode'] = DEFAULT_PREFERENCES.themeMode

  if (storedTheme) {
    const parts = storedTheme.split('-')
    if (parts.length === 2) {
      themeColor = parts[0]
      themeMode = parts[1] as 'light' | 'dark'
    }
  }

  const patternsEnabled = localStorage.getItem(LOCAL_PATTERNS_KEY) === 'true'
  const customAccent = localStorage.getItem(LOCAL_CUSTOM_ACCENT_KEY)

  return {
    themeColor,
    themeMode,
    customAccent,
    patternsEnabled,
  }
}

/**
 * Hook for managing user preferences with server sync
 *
 * @returns Object with:
 *   - preferences: Current user preferences
 *   - isLoading: Whether preferences are being loaded
 *   - isSyncing: Whether preferences are being saved to server
 *   - updatePreferences: Function to update one or more preferences
 *   - refreshPreferences: Function to reload preferences from server
 */
export function useUserPreferences() {
  const { user, isLoading: authLoading } = useSupabaseAuth()
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track if we've loaded from server to avoid duplicate loads
  const hasLoadedFromServer = useRef(false)
  // Debounce timer for server sync
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Load preferences from server (authenticated) or localStorage (unauthenticated)
   */
  const loadPreferences = useCallback(async () => {
    if (authLoading) return // Wait for auth to resolve

    setIsLoading(true)
    setError(null)

    try {
      if (user) {
        // Authenticated user: load from database
        const { data, error: dbError } = await db.select<ProfilePreferencesRow>('profiles', {
          columns: ['theme_color', 'theme_mode', 'custom_accent', 'patterns_enabled'],
          where: { id: user.id },
          limit: 1,
        })

        if (dbError) {
          throw dbError
        }

        if (data && data.length > 0) {
          const serverPrefs = rowToPreferences(data[0])
          setPreferences(serverPrefs)
          hasLoadedFromServer.current = true
        } else {
          // No profile row yet, use defaults
          setPreferences(DEFAULT_PREFERENCES)
        }
      } else {
        // Unauthenticated user: load from localStorage
        const localPrefs = loadLocalPreferences()
        setPreferences(localPrefs)
      }
    } catch (err) {
      console.error('[useUserPreferences] Failed to load preferences:', err)
      setError(err instanceof Error ? err : new Error('Failed to load preferences'))
      // Fall back to localStorage on error
      const localPrefs = loadLocalPreferences()
      setPreferences(localPrefs)
    } finally {
      setIsLoading(false)
    }
  }, [user, authLoading])

  // Load preferences on mount and when user changes
  useEffect(() => {
    void loadPreferences()
  }, [loadPreferences])

  /**
   * Sync preferences to server with debouncing
   */
  const syncToServer = useCallback(
    async (prefs: Partial<UserPreferences>) => {
      if (!user) return // Only sync for authenticated users

      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      // Debounce: wait 500ms before syncing
      syncTimeoutRef.current = setTimeout(async () => {
        setIsSyncing(true)
        try {
          const row = preferencesToRow(prefs)
          const { error: dbError } = await db.update('profiles', { id: user.id }, row)

          if (dbError) {
            console.error('[useUserPreferences] Failed to sync preferences:', dbError)
            setError(dbError)
          }
        } catch (err) {
          console.error('[useUserPreferences] Sync error:', err)
          setError(err instanceof Error ? err : new Error('Failed to sync preferences'))
        } finally {
          setIsSyncing(false)
        }
      }, 500)
    },
    [user]
  )

  /**
   * Update one or more preferences
   * Updates local state immediately, then syncs to server
   */
  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...updates }

        // Sync to server in background (for authenticated users)
        if (user) {
          void syncToServer(updates)
        }

        return next
      })
    },
    [user, syncToServer]
  )

  /**
   * Force reload preferences from server
   */
  const refreshPreferences = useCallback(() => {
    hasLoadedFromServer.current = false
    void loadPreferences()
  }, [loadPreferences])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  return {
    preferences,
    isLoading: isLoading || authLoading,
    isSyncing,
    error,
    updatePreferences,
    refreshPreferences,
    isAuthenticated: !!user,
  }
}
