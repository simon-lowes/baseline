/**
 * Date Formatting Utilities
 *
 * Centralized, timezone-aware date and time formatting.
 * All timestamps are stored as UTC milliseconds; this module handles
 * conversion to the user's local timezone for display.
 *
 * Key features:
 * - 24-hour time format (e.g., "14:30")
 * - Local timezone handling (no location request needed)
 * - Fixes UTC date grouping bug in analytics
 */

/**
 * Get the user's browser timezone (no location permission required)
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Get local date string (YYYY-MM-DD) for date grouping
 * CRITICAL: Uses local timezone, not UTC
 *
 * This fixes the bug where entries at 11pm local time could appear
 * on the wrong day when using toISOString().split('T')[0]
 */
export function getLocalDateString(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format time in 24-hour format (e.g., "14:30")
 */
export function formatTime24(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Format time in 24-hour format with seconds (e.g., "14:30:45")
 */
export function formatTime24WithSeconds(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Format date for display (e.g., "14 Jan 2025")
 */
export function formatDateShort(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format date with day of week (e.g., "Monday, 14 January 2025")
 */
export function formatDateFull(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format datetime for display (e.g., "14 Jan 2025, 14:30")
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Format datetime with full details (e.g., "Monday, 14 January 2025 at 14:30")
 */
export function formatDateTimeFull(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Format relative date with time for entry cards
 * Returns "Today at 14:30", "Yesterday at 09:15", "Monday at 16:00", etc.
 */
export function formatRelativeDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()

  // Calculate days difference using local dates
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffInDays = Math.floor(
    (todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)
  )

  const timeStr = formatTime24(timestamp)

  if (diffInDays === 0) {
    return `Today at ${timeStr}`
  }
  if (diffInDays === 1) {
    return `Yesterday at ${timeStr}`
  }
  if (diffInDays < 7 && diffInDays > 0) {
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
    return `${dayName} at ${timeStr}`
  }

  const dateStr = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  return `${dateStr} at ${timeStr}`
}

/**
 * Format short date for charts (e.g., "14 Jan")
 */
export function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Format date for tooltips (e.g., "Mon, 14 Jan")
 */
export function formatTooltipDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Generate local date range array between two dates (YYYY-MM-DD format)
 * Uses local timezone for date boundaries
 */
export function generateLocalDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  while (current <= end) {
    dates.push(getLocalDateString(current.getTime()))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Get start of day in local timezone
 */
export function getStartOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Get end of day in local timezone
 */
export function getEndOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}
