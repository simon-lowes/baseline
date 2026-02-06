/**
 * Interlink Data Hook
 *
 * Fetches and analyzes cross-tracker correlation data.
 * Provides insights about how different trackers are interlinked.
 */

import { useMemo } from 'react'
import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'
import type { TrackerField, FieldValues } from '@/types/tracker-fields'
import {
  detectInterlinkPatterns,
  generateInterlinkInsights,
  getInterlinkDataStatus,
  generateTimelineData,
  getNumericFields,
  type InterlinkCorrelation,
  type InterlinkInsight,
  type InterlinkDataStatus,
  type TrackerPair,
  type TrackerFieldInfo,
  type TimelineDataPoint,
} from '@/lib/interlink-utils'

// Extended PainEntry type with field_values
type EntryWithFields = PainEntry & { field_values?: FieldValues }

export interface UseInterlinkDataOptions {
  /** Enable auto-detection of correlations */
  autoDetect?: boolean
  /** Manual tracker pairs to analyze */
  manualPairs?: TrackerPair[]
  /** Date range for analysis */
  dateRange?: { start: Date; end: Date }
}

export interface UseInterlinkDataResult {
  /** Detected correlations between trackers */
  correlations: InterlinkCorrelation[]
  /** Human-readable insights from correlations */
  insights: InterlinkInsight[]
  /** Data status (enough data, days collected, etc.) */
  dataStatus: InterlinkDataStatus
  /** All available numeric fields across trackers */
  availableFields: TrackerFieldInfo[]
  /** Timeline data for overlay chart */
  timelineData: TimelineDataPoint[]
  /** Whether there's enough data for analysis */
  hasEnoughData: boolean
  /** Error message if analysis failed */
  error: string | null
}

/**
 * Extract TrackerField[] from a tracker's generated_config
 */
function getTrackerFields(tracker: Tracker): TrackerField[] {
  const config = tracker.generated_config as { fields?: TrackerField[] } | null
  return config?.fields ?? []
}

/**
 * Build a map of tracker ID to fields
 */
function buildFieldsMap(trackers: Tracker[]): Map<string, TrackerField[]> {
  const map = new Map<string, TrackerField[]>()
  for (const tracker of trackers) {
    map.set(tracker.id, getTrackerFields(tracker))
  }
  return map
}

/**
 * Hook for analyzing interlink patterns between trackers
 */
export function useInterlinkData(
  entries: EntryWithFields[],
  trackers: Tracker[],
  options: UseInterlinkDataOptions = {}
): UseInterlinkDataResult {
  const {
    autoDetect = true,
    manualPairs = [],
    dateRange,
  } = options

  // Build fields map from tracker configs
  const fieldsMap = useMemo(() => buildFieldsMap(trackers), [trackers])

  // Get data status
  const dataStatus = useMemo(
    () => getInterlinkDataStatus(entries, trackers),
    [entries, trackers]
  )

  // Get all available numeric fields
  const availableFields = useMemo(() => {
    const allFields: TrackerFieldInfo[] = []
    for (const tracker of trackers) {
      const trackerFields = fieldsMap.get(tracker.id) ?? []
      allFields.push(...getNumericFields(tracker, trackerFields))
    }
    return allFields
  }, [trackers, fieldsMap])

  // Detect correlations
  const correlations = useMemo(() => {
    // Need at least 2 trackers
    if (trackers.length < 2) return []

    // Need enough data
    if (!dataStatus.hasEnoughData && manualPairs.length === 0) return []

    // Don't analyze if neither auto nor manual mode
    if (!autoDetect && manualPairs.length === 0) return []

    try {
      return detectInterlinkPatterns(
        entries,
        trackers,
        fieldsMap,
        { manualPairs: manualPairs.length > 0 ? manualPairs : undefined }
      )
    } catch (err) {
      console.error('Interlink analysis failed for', trackers.length, 'trackers with', entries.length, 'entries:', err)
      return []
    }
  }, [entries, trackers, fieldsMap, dataStatus.hasEnoughData, autoDetect, manualPairs])

  // Generate insights from correlations
  const insights = useMemo(
    () => generateInterlinkInsights(correlations),
    [correlations]
  )

  // Generate timeline data for selected pairs
  const timelineData = useMemo(() => {
    // Use manual pairs if specified, otherwise use top correlations
    const fieldsToShow: TrackerFieldInfo[] = []

    if (manualPairs.length > 0) {
      // Get fields for manual pairs
      for (const pair of manualPairs.slice(0, 4)) {
        const field1 = availableFields.find(
          f => f.trackerId === pair.tracker1Id && f.fieldId === pair.field1Id
        )
        const field2 = availableFields.find(
          f => f.trackerId === pair.tracker2Id && f.fieldId === pair.field2Id
        )
        if (field1 && !fieldsToShow.includes(field1)) fieldsToShow.push(field1)
        if (field2 && !fieldsToShow.includes(field2)) fieldsToShow.push(field2)
      }
    } else if (correlations.length > 0) {
      // Use top correlation's fields
      const topCorr = correlations[0]
      const field1 = availableFields.find(
        f => f.trackerId === topCorr.tracker1.id && f.fieldId === topCorr.tracker1.fieldId
      )
      const field2 = availableFields.find(
        f => f.trackerId === topCorr.tracker2.id && f.fieldId === topCorr.tracker2.fieldId
      )
      if (field1) fieldsToShow.push(field1)
      if (field2) fieldsToShow.push(field2)
    }

    if (fieldsToShow.length === 0) return []

    return generateTimelineData(entries, fieldsToShow, dateRange)
  }, [entries, correlations, availableFields, manualPairs, dateRange])

  return {
    correlations,
    insights,
    dataStatus,
    availableFields,
    timelineData,
    hasEnoughData: dataStatus.hasEnoughData,
    error: null,
  }
}

/**
 * Get suggested tracker pairs based on available data
 */
export function getSuggestedPairs(
  correlations: InterlinkCorrelation[],
  limit: number = 3
): TrackerPair[] {
  return correlations.slice(0, limit).map(corr => ({
    tracker1Id: corr.tracker1.id,
    field1Id: corr.tracker1.fieldId,
    tracker2Id: corr.tracker2.id,
    field2Id: corr.tracker2.fieldId,
  }))
}
