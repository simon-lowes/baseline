import { PainEntry } from '@/types/pain-entry'

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

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }
  if (diffInDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }
  if (diffInDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
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
