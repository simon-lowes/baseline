import { db } from '@/runtime/appRuntime'
import type { PainEntry } from '@/types/pain-entry'
import type { QueuedEntry, QueueStatus } from '@/hooks/useOfflineQueue'

/** Delay between sync attempts in ms */
const SYNC_DELAY = 1000

/** Exponential backoff base delay */
const BACKOFF_BASE = 2000

/**
 * Calculate delay for retry with exponential backoff.
 * @param attempts - Number of previous attempts
 * @returns Delay in milliseconds
 */
function getBackoffDelay(attempts: number): number {
  return Math.min(BACKOFF_BASE * Math.pow(2, attempts), 30000) // Max 30 seconds
}

/**
 * Result of a sync operation for a single entry.
 */
export interface SyncResult {
  entryId: string
  success: boolean
  error?: string
}

/**
 * Sync a single entry to the database.
 *
 * @param entry - The entry to sync
 * @returns Promise resolving to sync result
 */
export async function syncEntry(entry: PainEntry): Promise<SyncResult> {
  try {
    const result = await db.insert<PainEntry>('tracker_entries', entry)

    if (result.error) {
      // Check for duplicate key error (entry already exists)
      if (result.error.message?.includes('duplicate') || result.error.message?.includes('unique')) {
        // Entry already exists - consider this a success
        return { entryId: entry.id, success: true }
      }
      return { entryId: entry.id, success: false, error: result.error.message }
    }

    return { entryId: entry.id, success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { entryId: entry.id, success: false, error: message }
  }
}

/**
 * Sync all pending entries from the queue.
 *
 * @param pendingEntries - Array of queued entries to sync
 * @param onStatusUpdate - Callback to update entry status
 * @param onComplete - Callback when sync is complete
 */
export async function syncPendingEntries(
  pendingEntries: QueuedEntry[],
  onStatusUpdate: (entryId: string, status: QueueStatus, error?: string) => void,
  onComplete: (results: SyncResult[]) => void
): Promise<void> {
  const results: SyncResult[] = []

  for (const queuedEntry of pendingEntries) {
    // Mark as syncing
    onStatusUpdate(queuedEntry.entry.id, 'syncing')

    // Add delay based on retry attempts (exponential backoff)
    if (queuedEntry.attempts > 0) {
      const delay = getBackoffDelay(queuedEntry.attempts)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    // Attempt sync
    const result = await syncEntry(queuedEntry.entry)
    results.push(result)

    if (result.success) {
      onStatusUpdate(queuedEntry.entry.id, 'synced')
    } else {
      onStatusUpdate(queuedEntry.entry.id, 'failed', result.error)
    }

    // Small delay between entries to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, SYNC_DELAY))
  }

  onComplete(results)
}

/**
 * Hook-like function to create a sync controller.
 * Returns functions to start/stop background sync.
 */
export function createSyncController() {
  let isSyncing = false
  let syncTimeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * Start syncing pending entries.
   */
  const startSync = async (
    getPendingEntries: () => QueuedEntry[],
    onStatusUpdate: (entryId: string, status: QueueStatus, error?: string) => void,
    onSyncComplete: (results: SyncResult[]) => void
  ) => {
    if (isSyncing) return

    const pending = getPendingEntries()
    if (pending.length === 0) return

    isSyncing = true

    await syncPendingEntries(pending, onStatusUpdate, (results) => {
      isSyncing = false
      onSyncComplete(results)
    })
  }

  /**
   * Stop any pending sync operations.
   */
  const stopSync = () => {
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId)
      syncTimeoutId = null
    }
  }

  /**
   * Check if sync is currently in progress.
   */
  const isCurrentlySyncing = () => isSyncing

  return {
    startSync,
    stopSync,
    isCurrentlySyncing,
  }
}

/**
 * Utility to merge queued entries with live entries.
 * Pending entries appear at the top with a "pending" badge indicator.
 *
 * @param liveEntries - Entries from the database
 * @param queuedEntries - Entries in the offline queue
 * @returns Merged array with pending entries marked
 */
export function mergeEntriesWithQueue(
  liveEntries: PainEntry[],
  queuedEntries: QueuedEntry[]
): Array<PainEntry & { isPending?: boolean }> {
  const liveIds = new Set(liveEntries.map((e) => e.id))

  // Filter queued entries that aren't already in live data
  const pendingOnly = queuedEntries
    .filter((q) => !liveIds.has(q.entry.id) && q.status !== 'synced')
    .map((q) => ({
      ...q.entry,
      isPending: true,
    }))

  // Pending entries first, then live entries sorted by timestamp
  return [...pendingOnly, ...liveEntries].sort((a, b) => b.timestamp - a.timestamp)
}
