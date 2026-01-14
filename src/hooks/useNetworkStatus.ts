import { useState, useEffect, useCallback } from 'react'

interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean
  /** Whether we were offline at some point and have now reconnected */
  wasOffline: boolean
  /** Timestamp of last connectivity change */
  lastChanged: number | null
}

/**
 * Hook to track network connectivity status.
 *
 * Uses the Navigator.onLine API with online/offline event listeners.
 * Includes debouncing to avoid rapid state changes during flaky connections.
 *
 * @example
 * ```tsx
 * const { isOnline, wasOffline } = useNetworkStatus()
 *
 * if (!isOnline) {
 *   showToast('You are offline. Changes will sync when connected.')
 * }
 *
 * if (wasOffline) {
 *   // Trigger sync when coming back online
 *   syncPendingEntries()
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastChanged: null,
  })

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline ? true : prev.wasOffline,
      lastChanged: Date.now(),
    }))
  }, [])

  const handleOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
      lastChanged: Date.now(),
    }))
  }, [])

  useEffect(() => {
    // Skip if running in SSR
    if (typeof window === 'undefined') return

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return status
}

/**
 * Clear the "wasOffline" flag after sync is complete.
 * Call this after successfully syncing pending data.
 */
export function useNetworkStatusWithReset() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastChanged: null,
  })

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: !prev.isOnline ? true : prev.wasOffline,
      lastChanged: Date.now(),
    }))
  }, [])

  const handleOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
      lastChanged: Date.now(),
    }))
  }, [])

  const resetWasOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      wasOffline: false,
    }))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return { ...status, resetWasOffline }
}
