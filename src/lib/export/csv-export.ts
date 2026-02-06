/**
 * CSV Export Utilities
 *
 * Handles CSV generation for both schema v1 (fixed fields) and v2 (custom fields)
 */

import { format } from 'date-fns'
import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'
import type { TrackerField, FieldValues } from '@/types/tracker-fields'
import type { DateRange, ExportSummaryStats } from '@/types/export'

interface EntryWithFieldValues extends PainEntry {
  field_values?: FieldValues
}

/**
 * Escape a value for CSV (handle quotes and commas)
 */
function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Formula injection protection: prefix dangerous characters with a single quote
  // Skip for numeric values (e.g., negative numbers like -3)
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`
  }
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Format an array for CSV output
 */
function formatArray(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return ''
  return arr.join('; ')
}

/**
 * Format a field value based on its type
 */
function formatFieldValue(
  value: number | string | string[] | boolean | undefined,
  field: TrackerField
): string {
  if (value === undefined || value === null) return ''

  switch (field.config.type) {
    case 'toggle':
      return value ? 'Yes' : 'No'
    case 'multi_select':
      return Array.isArray(value) ? value.join('; ') : String(value)
    case 'number_scale':
      return String(value)
    case 'time':
      return String(value)
    case 'duration':
      // Duration stored as minutes
      if (typeof value === 'number') {
        const hours = Math.floor(value / 60)
        const mins = value % 60
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
      }
      return String(value)
    case 'emoji':
      return String(value)
    default:
      return String(value)
  }
}

/**
 * Get custom fields from tracker's generated_config
 */
function getTrackerFields(tracker: Tracker): TrackerField[] {
  // Check if tracker has custom fields in generated_config
  const config = tracker.generated_config as { fields?: TrackerField[] } | null
  return config?.fields ?? []
}

/**
 * Generate CSV for schema v1 entries (fixed fields: intensity, locations, triggers, notes)
 */
export function generateSchemaV1CSV(entries: PainEntry[]): string {
  const headers = ['Date', 'Time', 'Intensity', 'Locations', 'Triggers', 'Hashtags', 'Notes']

  const rows = entries.map((entry) => {
    const date = new Date(entry.timestamp)
    return [
      format(date, 'yyyy-MM-dd'),
      format(date, 'HH:mm:ss'),
      escapeCSV(entry.intensity),
      escapeCSV(formatArray(entry.locations)),
      escapeCSV(formatArray(entry.triggers)),
      escapeCSV(formatArray(entry.hashtags)),
      escapeCSV(entry.notes),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Generate CSV for schema v2 entries (custom fields via field_values)
 */
export function generateSchemaV2CSV(
  entries: EntryWithFieldValues[],
  fields: TrackerField[]
): string {
  // Build headers: Date, Time, then each custom field
  const headers = ['Date', 'Time', ...fields.map((f) => f.label)]

  const rows = entries.map((entry) => {
    const date = new Date(entry.timestamp)
    const fieldValues = entry.field_values ?? {}

    const values = [
      format(date, 'yyyy-MM-dd'),
      format(date, 'HH:mm:ss'),
      ...fields.map((field) => escapeCSV(formatFieldValue(fieldValues[field.id], field))),
    ]

    return values.join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Generate CSV for entries, handling both schema versions
 * Groups entries by tracker if multiple trackers have different schemas
 */
export function generateEntriesCSV(
  entries: EntryWithFieldValues[],
  trackers: Tracker[]
): string {
  // Create a map of tracker_id to tracker
  const trackerMap = new Map(trackers.map((t) => [t.id, t]))

  // Group entries by tracker
  const entriesByTracker = new Map<string, EntryWithFieldValues[]>()
  for (const entry of entries) {
    const existing = entriesByTracker.get(entry.tracker_id) ?? []
    existing.push(entry)
    entriesByTracker.set(entry.tracker_id, existing)
  }

  // If single tracker, use appropriate schema
  if (entriesByTracker.size === 1) {
    const [trackerId, trackerEntries] = [...entriesByTracker.entries()][0]
    const tracker = trackerMap.get(trackerId)

    if (tracker) {
      const fields = getTrackerFields(tracker)
      if (fields.length > 0) {
        // Schema v2 with custom fields
        return generateSchemaV2CSV(trackerEntries, fields)
      }
    }

    // Fallback to schema v1
    return generateSchemaV1CSV(trackerEntries)
  }

  // Multiple trackers: generate combined CSV with tracker name column
  // Use schema v1 format for simplicity when combining
  const headers = ['Tracker', 'Date', 'Time', 'Intensity', 'Locations', 'Triggers', 'Hashtags', 'Notes']

  const rows = entries.map((entry) => {
    const tracker = trackerMap.get(entry.tracker_id)
    const trackerName = tracker?.name ?? 'Unknown'
    const date = new Date(entry.timestamp)

    return [
      escapeCSV(trackerName),
      format(date, 'yyyy-MM-dd'),
      format(date, 'HH:mm:ss'),
      escapeCSV(entry.intensity),
      escapeCSV(formatArray(entry.locations)),
      escapeCSV(formatArray(entry.triggers)),
      escapeCSV(formatArray(entry.hashtags)),
      escapeCSV(entry.notes),
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Generate a daily summary CSV
 */
export function generateDailySummaryCSV(
  entries: PainEntry[],
  trackers: Tracker[]
): string {
  // Group entries by date
  const byDate = new Map<string, PainEntry[]>()
  for (const entry of entries) {
    const dateKey = format(new Date(entry.timestamp), 'yyyy-MM-dd')
    const existing = byDate.get(dateKey) ?? []
    existing.push(entry)
    byDate.set(dateKey, existing)
  }

  const headers = ['Date', 'Entry Count', 'Avg Intensity', 'Min Intensity', 'Max Intensity', 'Unique Triggers', 'Unique Locations']

  const rows = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEntries]) => {
      const intensities = dayEntries.map((e) => e.intensity).filter((i) => i > 0)
      const avgIntensity = intensities.length > 0
        ? (intensities.reduce((a, b) => a + b, 0) / intensities.length).toFixed(1)
        : ''
      const minIntensity = intensities.length > 0 ? Math.min(...intensities) : ''
      const maxIntensity = intensities.length > 0 ? Math.max(...intensities) : ''

      const allTriggers = new Set(dayEntries.flatMap((e) => e.triggers ?? []))
      const allLocations = new Set(dayEntries.flatMap((e) => e.locations ?? []))

      return [
        date,
        dayEntries.length,
        avgIntensity,
        minIntensity,
        maxIntensity,
        allTriggers.size,
        allLocations.size,
      ].join(',')
    })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Filter entries by date range
 */
export function filterEntriesByDateRange(
  entries: PainEntry[],
  dateRange: DateRange
): PainEntry[] {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.timestamp)
    return entryDate >= dateRange.start && entryDate <= dateRange.end
  })
}

/**
 * Calculate export summary statistics
 */
export function calculateExportSummary(
  entries: PainEntry[],
  trackers: Tracker[],
  dateRange: DateRange
): ExportSummaryStats {
  const filteredEntries = filterEntriesByDateRange(entries, dateRange)

  // Calculate date span
  const daysSpanned = Math.max(
    1,
    Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Average intensity
  const intensities = filteredEntries.map((e) => e.intensity).filter((i) => i > 0)
  const averageIntensity = intensities.length > 0
    ? intensities.reduce((a, b) => a + b, 0) / intensities.length
    : null

  // Entry frequency
  const entryFrequency = daysSpanned > 0
    ? `${(filteredEntries.length / daysSpanned).toFixed(1)} entries/day`
    : '0 entries/day'

  // Peak days (top 5 by entry count)
  const byDate = new Map<string, number>()
  for (const entry of filteredEntries) {
    const dateKey = format(new Date(entry.timestamp), 'yyyy-MM-dd')
    byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + 1)
  }
  const peakDays = [...byDate.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([date, count]) => ({ date, count }))

  // Top triggers
  const triggerCounts = new Map<string, number>()
  for (const entry of filteredEntries) {
    for (const trigger of entry.triggers ?? []) {
      triggerCounts.set(trigger, (triggerCounts.get(trigger) ?? 0) + 1)
    }
  }
  const totalTriggers = [...triggerCounts.values()].reduce((a, b) => a + b, 0)
  const topTriggers = [...triggerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalTriggers > 0 ? Math.round((count / totalTriggers) * 100) : 0,
    }))

  // Top locations
  const locationCounts = new Map<string, number>()
  for (const entry of filteredEntries) {
    for (const location of entry.locations ?? []) {
      locationCounts.set(location, (locationCounts.get(location) ?? 0) + 1)
    }
  }
  const totalLocations = [...locationCounts.values()].reduce((a, b) => a + b, 0)
  const topLocations = [...locationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalLocations > 0 ? Math.round((count / totalLocations) * 100) : 0,
    }))

  // Top hashtags
  const hashtagCounts = new Map<string, number>()
  for (const entry of filteredEntries) {
    for (const tag of entry.hashtags ?? []) {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1)
    }
  }
  const topHashtags = [...hashtagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  // Unique tracker count
  const uniqueTrackers = new Set(filteredEntries.map((e) => e.tracker_id))

  return {
    totalEntries: filteredEntries.length,
    trackerCount: uniqueTrackers.size,
    dateRange: {
      start: format(dateRange.start, 'yyyy-MM-dd'),
      end: format(dateRange.end, 'yyyy-MM-dd'),
      daysSpanned,
    },
    averageIntensity,
    entryFrequency,
    peakDays,
    topTriggers,
    topLocations,
    topHashtags,
  }
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download a Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
