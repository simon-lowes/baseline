import { PainEntry } from '@/types/pain-entry'
import { formatRelativeDateTime } from '@/lib/date-utils'

export const getPainColor = (intensity: number): string => {
  if (intensity <= 3) return 'oklch(0.75 0.12 145)'
  if (intensity <= 6) return 'oklch(0.80 0.15 85)'
  return 'oklch(0.65 0.18 25)'
}

export const getPainLabel = (intensity: number): string => {
  if (intensity <= 2) return 'Minimal'
  if (intensity <= 4) return 'Mild'
  if (intensity <= 6) return 'Moderate'
  if (intensity <= 8) return 'Severe'
  return 'Extreme'
}

/**
 * Format timestamp for entry card display
 * Uses 24-hour format: "Today at 14:30", "Yesterday at 09:15", etc.
 */
export const formatDate = (timestamp: number): string => {
  return formatRelativeDateTime(timestamp)
}

export const filterEntriesByDateRange = (
  entries: PainEntry[],
  days: number | null
): PainEntry[] => {
  if (!days) return entries
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return entries.filter(entry => entry.timestamp >= cutoffDate.getTime())
}

export const filterEntriesByLocation = (
  entries: PainEntry[],
  location: string | null
): PainEntry[] => {
  if (!location) return entries
  
  return entries.filter(entry => entry.locations.includes(location))
}
