/**
 * Interlink Utilities
 *
 * Cross-tracker correlation analysis with lag effect detection.
 * Helps users discover how their trackers are interlinked.
 */

import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'
import type { TrackerField, FieldValues, NumberScaleConfig, DurationConfig } from '@/types/tracker-fields'
import { getLocalDateString } from '@/lib/date-utils'

// ============================================================================
// Types
// ============================================================================

export interface InterlinkMetric {
  trackerId: string
  trackerName: string
  date: string
  value: number  // Normalized 0-1
  rawValue: number
  fieldId: string
  fieldLabel: string
}

export interface InterlinkCorrelation {
  tracker1: { id: string; name: string; trackerName: string; fieldId: string; fieldLabel: string }
  tracker2: { id: string; name: string; trackerName: string; fieldId: string; fieldLabel: string }
  correlation: number  // -1 to 1
  lagDays: number      // 0 = same day, 1 = next day, etc.
  strength: 'strong' | 'moderate' | 'weak'
  direction: 'positive' | 'negative'
  sampleSize: number
  confidence: number   // 0-1 based on sample size
}

export interface InterlinkInsight {
  id: string
  type: 'lag_effect' | 'same_day' | 'pattern'
  title: string
  description: string
  correlation: InterlinkCorrelation
  actionable?: string
}

export interface TrackerPair {
  tracker1Id: string
  field1Id: string
  tracker2Id: string
  field2Id: string
}

export interface InterlinkDataStatus {
  hasEnoughData: boolean
  daysOfData: number
  requiredDays: number
  trackerDataCounts: Map<string, number>
}

export interface TrackerFieldInfo {
  trackerId: string
  trackerName: string
  fieldId: string
  fieldLabel: string
  fieldType: 'intensity' | 'number_scale' | 'duration'
  min: number
  max: number
}

// ============================================================================
// Constants
// ============================================================================

export const MIN_DAYS_FOR_INSIGHTS = 30
export const MIN_DATA_POINTS = 20
export const MAX_LAG_DAYS = 3

// Correlation thresholds
const STRONG_THRESHOLD = 0.7
const MODERATE_THRESHOLD = 0.4
const WEAK_THRESHOLD = 0.2

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date string in YYYY-MM-DD format from timestamp
 * Uses local timezone (not UTC) to avoid day-boundary bugs
 */
function getDateString(timestamp: number): string {
  return getLocalDateString(timestamp)
}

/**
 * Get numeric fields from a tracker's field definitions
 */
export function getNumericFields(
  tracker: Tracker,
  fields: TrackerField[]
): TrackerFieldInfo[] {
  const result: TrackerFieldInfo[] = []

  // Always include the built-in intensity field
  result.push({
    trackerId: tracker.id,
    trackerName: tracker.name,
    fieldId: 'intensity',
    fieldLabel: 'Intensity',
    fieldType: 'intensity',
    min: 1,
    max: 10,
  })

  // Add custom numeric fields
  for (const field of fields) {
    if (field.type === 'number_scale') {
      const config = field.config as NumberScaleConfig
      result.push({
        trackerId: tracker.id,
        trackerName: tracker.name,
        fieldId: field.id,
        fieldLabel: field.label,
        fieldType: 'number_scale',
        min: config.min,
        max: config.max,
      })
    } else if (field.type === 'duration') {
      result.push({
        trackerId: tracker.id,
        trackerName: tracker.name,
        fieldId: field.id,
        fieldLabel: field.label,
        fieldType: 'duration',
        min: 0,
        max: 86400, // 24 hours in seconds
      })
    }
  }

  return result
}

/**
 * Extract numeric value from entry for a given field
 */
function extractFieldValue(
  entry: PainEntry & { field_values?: FieldValues },
  fieldInfo: TrackerFieldInfo
): number | null {
  if (fieldInfo.fieldId === 'intensity') {
    return entry.intensity
  }

  const fieldValues = entry.field_values
  if (!fieldValues) return null

  const value = fieldValues[fieldInfo.fieldId]
  if (typeof value === 'number') return value

  return null
}

/**
 * Normalize a value to 0-1 range
 */
function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  )

  if (denominator === 0) return 0
  return numerator / denominator
}

/**
 * Aggregate entries by date and extract field values
 */
export function aggregateEntriesByDate(
  entries: (PainEntry & { field_values?: FieldValues })[],
  fieldInfo: TrackerFieldInfo
): Map<string, { value: number; rawValue: number }> {
  const byDate = new Map<string, number[]>()

  for (const entry of entries) {
    if (entry.tracker_id !== fieldInfo.trackerId) continue

    const value = extractFieldValue(entry, fieldInfo)
    if (value === null) continue

    const dateStr = getDateString(entry.timestamp)
    const existing = byDate.get(dateStr) ?? []
    existing.push(value)
    byDate.set(dateStr, existing)
  }

  // Average values for each day
  const result = new Map<string, { value: number; rawValue: number }>()
  for (const [date, values] of byDate) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    result.set(date, {
      rawValue: avg,
      value: normalizeValue(avg, fieldInfo.min, fieldInfo.max),
    })
  }

  return result
}

/**
 * Calculate correlation with lag between two time series
 */
export function calculateLaggedCorrelation(
  series1: Map<string, { value: number }>,
  series2: Map<string, { value: number }>,
  lagDays: number
): { correlation: number; sampleSize: number } {
  const pairs: Array<[number, number]> = []

  // Get all dates from series1
  const dates1 = Array.from(series1.keys()).sort()

  for (const date1 of dates1) {
    // Calculate date2 = date1 + lagDays
    const d1 = new Date(date1)
    d1.setDate(d1.getDate() + lagDays)
    const date2 = getLocalDateString(d1.getTime())

    const val1 = series1.get(date1)
    const val2 = series2.get(date2)

    if (val1 !== undefined && val2 !== undefined) {
      pairs.push([val1.value, val2.value])
    }
  }

  if (pairs.length < MIN_DATA_POINTS) {
    return { correlation: 0, sampleSize: pairs.length }
  }

  const x = pairs.map(p => p[0])
  const y = pairs.map(p => p[1])

  return {
    correlation: calculatePearsonCorrelation(x, y),
    sampleSize: pairs.length,
  }
}

/**
 * Get correlation strength label
 */
function getCorrelationStrength(r: number): 'strong' | 'moderate' | 'weak' | null {
  const absR = Math.abs(r)
  if (absR >= STRONG_THRESHOLD) return 'strong'
  if (absR >= MODERATE_THRESHOLD) return 'moderate'
  if (absR >= WEAK_THRESHOLD) return 'weak'
  return null
}

/**
 * Calculate confidence based on sample size
 */
function calculateConfidence(sampleSize: number): number {
  // 30 entries = 50% (minimum threshold)
  // 60 entries = 75%
  // 90+ entries = 90%+
  const baseConfidence = Math.min(sampleSize / 100, 0.9)
  return Math.max(0.5, baseConfidence)
}

// ============================================================================
// Main Analysis Functions
// ============================================================================

/**
 * Detect interlink patterns between tracker pairs
 */
export function detectInterlinkPatterns(
  entries: (PainEntry & { field_values?: FieldValues })[],
  trackers: Tracker[],
  fieldsMap: Map<string, TrackerField[]>,
  options?: { manualPairs?: TrackerPair[] }
): InterlinkCorrelation[] {
  const results: InterlinkCorrelation[] = []

  // Get all numeric fields from all trackers
  const allFields: TrackerFieldInfo[] = []
  for (const tracker of trackers) {
    const trackerFields = fieldsMap.get(tracker.id) ?? []
    allFields.push(...getNumericFields(tracker, trackerFields))
  }

  // If manual pairs specified, only analyze those
  if (options?.manualPairs && options.manualPairs.length > 0) {
    for (const pair of options.manualPairs) {
      const field1 = allFields.find(
        f => f.trackerId === pair.tracker1Id && f.fieldId === pair.field1Id
      )
      const field2 = allFields.find(
        f => f.trackerId === pair.tracker2Id && f.fieldId === pair.field2Id
      )

      if (field1 && field2) {
        const correlation = analyzeFieldPair(entries, field1, field2)
        if (correlation) results.push(correlation)
      }
    }
    return results
  }

  // Auto-detect: analyze all cross-tracker pairs
  for (let i = 0; i < allFields.length; i++) {
    for (let j = i + 1; j < allFields.length; j++) {
      const field1 = allFields[i]
      const field2 = allFields[j]

      // Only analyze cross-tracker pairs
      if (field1.trackerId === field2.trackerId) continue

      const correlation = analyzeFieldPair(entries, field1, field2)
      if (correlation) results.push(correlation)
    }
  }

  // Sort by absolute correlation strength (descending)
  return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
}

/**
 * Analyze correlation between two fields
 */
function analyzeFieldPair(
  entries: (PainEntry & { field_values?: FieldValues })[],
  field1: TrackerFieldInfo,
  field2: TrackerFieldInfo
): InterlinkCorrelation | null {
  const series1 = aggregateEntriesByDate(entries, field1)
  const series2 = aggregateEntriesByDate(entries, field2)

  // Find best correlation across lags 0-3
  let bestResult = { correlation: 0, sampleSize: 0, lagDays: 0 }

  for (let lag = 0; lag <= MAX_LAG_DAYS; lag++) {
    // Test field1 leading field2
    const result1 = calculateLaggedCorrelation(series1, series2, lag)
    if (Math.abs(result1.correlation) > Math.abs(bestResult.correlation)) {
      bestResult = { ...result1, lagDays: lag }
    }

    // Test field2 leading field1 (for lag > 0)
    if (lag > 0) {
      const result2 = calculateLaggedCorrelation(series2, series1, lag)
      if (Math.abs(result2.correlation) > Math.abs(bestResult.correlation)) {
        // Swap fields for reporting
        bestResult = { ...result2, lagDays: -lag }
      }
    }
  }

  const strength = getCorrelationStrength(bestResult.correlation)
  if (!strength) return null

  // Handle negative lag (field2 leads field1)
  let tracker1Info = field1
  let tracker2Info = field2
  let lagDays = bestResult.lagDays

  if (lagDays < 0) {
    tracker1Info = field2
    tracker2Info = field1
    lagDays = Math.abs(lagDays)
  }

  return {
    tracker1: {
      id: tracker1Info.trackerId,
      name: tracker1Info.trackerName,
      trackerName: tracker1Info.trackerName,
      fieldId: tracker1Info.fieldId,
      fieldLabel: tracker1Info.fieldLabel,
    },
    tracker2: {
      id: tracker2Info.trackerId,
      name: tracker2Info.trackerName,
      trackerName: tracker2Info.trackerName,
      fieldId: tracker2Info.fieldId,
      fieldLabel: tracker2Info.fieldLabel,
    },
    correlation: bestResult.correlation,
    lagDays,
    strength,
    direction: bestResult.correlation >= 0 ? 'positive' : 'negative',
    sampleSize: bestResult.sampleSize,
    confidence: calculateConfidence(bestResult.sampleSize),
  }
}

// ============================================================================
// Insight Generation
// ============================================================================

/**
 * Generate human-readable insights from correlations
 */
export function generateInterlinkInsights(
  correlations: InterlinkCorrelation[]
): InterlinkInsight[] {
  return correlations.map((corr, index) => {
    const id = `insight-${index}`
    const type: InterlinkInsight['type'] = corr.lagDays > 0 ? 'lag_effect' : 'same_day'

    const { title, description, actionable } = generateInsightText(corr)

    return {
      id,
      type,
      title,
      description,
      correlation: corr,
      actionable,
    }
  })
}

/**
 * Generate insight text based on correlation data
 */
function generateInsightText(corr: InterlinkCorrelation): {
  title: string
  description: string
  actionable?: string
} {
  const { tracker1, tracker2, correlation, lagDays, strength, direction } = corr
  const isPositive = direction === 'positive'
  const absCorr = Math.abs(correlation)

  // Same-day correlations
  if (lagDays === 0) {
    if (isPositive) {
      return {
        title: `${tracker1.fieldLabel} and ${tracker2.fieldLabel} rise together`,
        description: `When your ${tracker1.trackerName} ${tracker1.fieldLabel.toLowerCase()} is higher, your ${tracker2.trackerName} ${tracker2.fieldLabel.toLowerCase()} tends to be higher too (${strength} correlation: ${(absCorr * 100).toFixed(0)}%).`,
        actionable: strength === 'strong'
          ? `These metrics appear closely interlinked. Managing one may help manage the other.`
          : undefined,
      }
    } else {
      return {
        title: `${tracker1.fieldLabel} and ${tracker2.fieldLabel} move inversely`,
        description: `When your ${tracker1.trackerName} ${tracker1.fieldLabel.toLowerCase()} is higher, your ${tracker2.trackerName} ${tracker2.fieldLabel.toLowerCase()} tends to be lower (${strength} inverse correlation: ${(absCorr * 100).toFixed(0)}%).`,
        actionable: strength === 'strong'
          ? `These metrics may balance each other out.`
          : undefined,
      }
    }
  }

  // Lag effect correlations
  const lagText = lagDays === 1 ? 'the next day' : `${lagDays} days later`

  if (isPositive) {
    return {
      title: `${tracker1.fieldLabel} affects ${tracker2.fieldLabel} ${lagText}`,
      description: `Higher ${tracker1.trackerName} ${tracker1.fieldLabel.toLowerCase()} is interlinked with higher ${tracker2.trackerName} ${tracker2.fieldLabel.toLowerCase()} ${lagText} (${strength} correlation: ${(absCorr * 100).toFixed(0)}%).`,
      actionable: strength === 'strong'
        ? `Consider how today's ${tracker1.fieldLabel.toLowerCase()} might impact tomorrow.`
        : undefined,
    }
  } else {
    return {
      title: `${tracker1.fieldLabel} reduces ${tracker2.fieldLabel} ${lagText}`,
      description: `Higher ${tracker1.trackerName} ${tracker1.fieldLabel.toLowerCase()} is interlinked with lower ${tracker2.trackerName} ${tracker2.fieldLabel.toLowerCase()} ${lagText} (${strength} inverse correlation: ${(absCorr * 100).toFixed(0)}%).`,
      actionable: strength === 'strong'
        ? `This suggests ${tracker1.fieldLabel.toLowerCase()} may help reduce ${tracker2.fieldLabel.toLowerCase()} over time.`
        : undefined,
    }
  }
}

// ============================================================================
// Data Status Functions
// ============================================================================

/**
 * Check if there's enough data for interlink analysis
 */
export function getInterlinkDataStatus(
  entries: PainEntry[],
  trackers: Tracker[]
): InterlinkDataStatus {
  // Count unique days per tracker
  const trackerDays = new Map<string, Set<string>>()

  for (const entry of entries) {
    const dateStr = getDateString(entry.timestamp)
    const existing = trackerDays.get(entry.tracker_id) ?? new Set()
    existing.add(dateStr)
    trackerDays.set(entry.tracker_id, existing)
  }

  // Get tracker data counts
  const trackerDataCounts = new Map<string, number>()
  for (const tracker of trackers) {
    trackerDataCounts.set(tracker.id, trackerDays.get(tracker.id)?.size ?? 0)
  }

  // Find max days across all trackers
  const maxDays = Math.max(...Array.from(trackerDataCounts.values()), 0)

  return {
    hasEnoughData: maxDays >= MIN_DAYS_FOR_INSIGHTS && trackers.length >= 2,
    daysOfData: maxDays,
    requiredDays: MIN_DAYS_FOR_INSIGHTS,
    trackerDataCounts,
  }
}

// ============================================================================
// Timeline Data Generation
// ============================================================================

export interface TimelineDataPoint {
  date: string
  [key: string]: number | string | null  // fieldId -> normalized value
}

/**
 * Generate timeline data for multi-tracker overlay chart
 */
export function generateTimelineData(
  entries: (PainEntry & { field_values?: FieldValues })[],
  fields: TrackerFieldInfo[],
  dateRange?: { start: Date; end: Date }
): TimelineDataPoint[] {
  // Aggregate data for each field
  const fieldData = new Map<string, Map<string, { value: number }>>()
  for (const field of fields) {
    const key = `${field.trackerId}:${field.fieldId}`
    fieldData.set(key, aggregateEntriesByDate(entries, field))
  }

  // Determine date range
  const allDates = new Set<string>()
  for (const data of fieldData.values()) {
    for (const date of data.keys()) {
      allDates.add(date)
    }
  }

  const sortedDates = Array.from(allDates).sort()
  if (sortedDates.length === 0) return []

  const start = dateRange?.start ?? new Date(sortedDates[0])
  const end = dateRange?.end ?? new Date(sortedDates[sortedDates.length - 1])

  // Generate data points for each date in range
  const result: TimelineDataPoint[] = []
  const current = new Date(start)

  while (current <= end) {
    const dateStr = getLocalDateString(current.getTime())
    const point: TimelineDataPoint = { date: dateStr }

    for (const field of fields) {
      const key = `${field.trackerId}:${field.fieldId}`
      const data = fieldData.get(key)
      const value = data?.get(dateStr)?.value ?? null
      point[key] = value !== null ? Math.round(value * 100) : null // Store as percentage
    }

    result.push(point)
    current.setDate(current.getDate() + 1)
  }

  return result
}
