import { useState, useEffect, useCallback } from 'react'
import type { PainEntry } from '@/types/pain-entry'

/** Status of a queued entry */
export type QueueStatus = 'pending' | 'syncing' | 'failed' | 'synced'

/** A queued entry waiting to be synced */
export interface QueuedEntry {
  /** The entry data */
  entry: PainEntry
  /** Current sync status */
  status: QueueStatus
  /** When the entry was queued */
  queuedAt: number
  /** Number of sync attempts */
  attempts: number
  /** Last error message if failed */
  lastError?: string
}

/** Storage key for the offline queue */
const QUEUE_STORAGE_KEY = 'baseline-offline-queue'

/** Maximum retry attempts before giving up */
const MAX_RETRY_ATTEMPTS = 5

/**
 * Hook to manage offline entry queue with localStorage persistence.
 *
 * When the app is offline, entries are queued locally. When online,
 * the syncService processes the queue.
 *
 * @example
 * ```tsx
 * const { queue, addToQueue, removeFromQueue, updateStatus } = useOfflineQueue()
 *
 * // When creating an entry offline
 * if (!isOnline) {
 *   addToQueue(newEntry)
 *   toast('Entry saved offline. Will sync when connected.')
 * }
 *
 * // Check if there are pending entries
 * const pendingCount = queue.filter(q => q.status === 'pending').length
 * ```
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedEntry[]>([])

  // Load queue from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as QueuedEntry[]
        // Reset any "syncing" entries back to "pending" (in case app crashed during sync)
        const reset = parsed.map((item) =>
          item.status === 'syncing' ? { ...item, status: 'pending' as const } : item
        )
        setQueue(reset)
      }
    } catch (error) {
      console.error('[useOfflineQueue] Failed to load queue from storage:', error)
    }
  }, [])

  // Persist queue to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (queue.length === 0) {
      localStorage.removeItem(QUEUE_STORAGE_KEY)
    } else {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
    }
  }, [queue])

  /**
   * Add an entry to the offline queue.
   */
  const addToQueue = useCallback((entry: PainEntry) => {
    const queuedEntry: QueuedEntry = {
      entry,
      status: 'pending',
      queuedAt: Date.now(),
      attempts: 0,
    }
    setQueue((prev) => [...prev, queuedEntry])
  }, [])

  /**
   * Remove an entry from the queue (after successful sync or user deletion).
   */
  const removeFromQueue = useCallback((entryId: string) => {
    setQueue((prev) => prev.filter((item) => item.entry.id !== entryId))
  }, [])

  /**
   * Update the status of a queued entry.
   */
  const updateStatus = useCallback(
    (entryId: string, status: QueueStatus, error?: string) => {
      setQueue((prev) =>
        prev.map((item) => {
          if (item.entry.id !== entryId) return item

          const newAttempts = status === 'syncing' ? item.attempts + 1 : item.attempts

          // If we've exceeded max retries, mark as failed permanently
          if (status === 'failed' && newAttempts >= MAX_RETRY_ATTEMPTS) {
            return {
              ...item,
              status: 'failed' as const,
              attempts: newAttempts,
              lastError: error || 'Max retry attempts exceeded',
            }
          }

          return {
            ...item,
            status,
            attempts: newAttempts,
            lastError: error,
          }
        })
      )
    },
    []
  )

  /**
   * Get entries that are ready to sync (pending and not exceeded max retries).
   */
  const getPendingEntries = useCallback(() => {
    return queue.filter(
      (item) =>
        item.status === 'pending' ||
        (item.status === 'failed' && item.attempts < MAX_RETRY_ATTEMPTS)
    )
  }, [queue])

  /**
   * Clear all successfully synced entries from the queue.
   */
  const clearSynced = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== 'synced'))
  }, [])

  /**
   * Clear the entire queue (use with caution - for debugging/recovery).
   */
  const clearAll = useCallback(() => {
    setQueue([])
  }, [])

  /**
   * Check if an entry ID exists in the queue.
   */
  const isInQueue = useCallback(
    (entryId: string) => {
      return queue.some((item) => item.entry.id === entryId)
    },
    [queue]
  )

  return {
    /** The current offline queue */
    queue,
    /** Add an entry to the queue */
    addToQueue,
    /** Remove an entry from the queue */
    removeFromQueue,
    /** Update entry status */
    updateStatus,
    /** Get entries ready to sync */
    getPendingEntries,
    /** Clear synced entries */
    clearSynced,
    /** Clear entire queue */
    clearAll,
    /** Check if entry is queued */
    isInQueue,
    /** Count of pending entries */
    pendingCount: queue.filter((q) => q.status === 'pending' || q.status === 'failed').length,
    /** Count of total queued entries */
    totalCount: queue.length,
  }
}
