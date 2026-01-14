import { useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PainEntryCard } from '@/components/PainEntryCard'
import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'

/** Entry type with optional pending flag for offline support */
type EntryWithPending = PainEntry & { isPending?: boolean }

interface VirtualizedEntryListProps {
  entries: EntryWithPending[]
  tracker?: Tracker | null
  onDelete: (id: string) => void
  onEdit: (entry: PainEntry) => void
  /** Optional fixed height for the container. If not provided, uses CSS height */
  height?: number | string
  /** Estimated height of each entry card in pixels */
  estimatedItemSize?: number
  /** Class name for the container */
  className?: string
}

/**
 * Virtualized list component for rendering large numbers of entry cards efficiently.
 * Only renders items that are currently visible in the viewport, plus a small buffer.
 *
 * Uses TanStack Virtual for windowing - maintains ~20-30 DOM nodes regardless of list size.
 */
export function VirtualizedEntryList({
  entries,
  tracker,
  onDelete,
  onEdit,
  height = 'calc(100vh - 400px)',
  estimatedItemSize = 180,
  className = '',
}: Readonly<VirtualizedEntryListProps>) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Memoize callbacks to prevent unnecessary re-renders
  const handleDelete = useCallback((id: string) => {
    onDelete(id)
  }, [onDelete])

  const handleEdit = useCallback((entry: PainEntry) => {
    onEdit(entry)
  }, [onEdit])

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemSize,
    overscan: 5, // Render 5 items outside viewport for smoother scrolling
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Empty state - no entries to display
  if (entries.length === 0) {
    return null
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      role="list"
      aria-label={`${entries.length} entries`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const entry = entries[virtualItem.index]
          return (
            <div
              key={entry.id}
              role="listitem"
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="pb-4">
                <PainEntryCard
                  entry={entry}
                  tracker={tracker}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Non-virtualized entry list for small datasets or contexts where virtualization
 * isn't needed (e.g., dialogs showing a handful of entries).
 *
 * Use this when entries.length < 50 for simplicity.
 */
export function SimpleEntryList({
  entries,
  tracker,
  onDelete,
  onEdit,
  className = '',
}: Readonly<Omit<VirtualizedEntryListProps, 'height' | 'estimatedItemSize'>>) {
  if (entries.length === 0) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`} role="list" aria-label={`${entries.length} entries`}>
      {entries.map((entry) => (
        <div key={entry.id} role="listitem">
          <PainEntryCard
            entry={entry}
            tracker={tracker}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </div>
      ))}
    </div>
  )
}
