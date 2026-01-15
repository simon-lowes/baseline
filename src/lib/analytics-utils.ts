/**
 * Analytics Utilities
 *
 * Data aggregation and transformation functions for the Visual Analytics Dashboard.
 * Provides trend analysis, distribution calculations, and pattern detection.
 */

import type { PainEntry } from '@/types/pain-entry'
import {
  getLocalDateString,
  generateLocalDateRange,
  formatDateShort,
  formatTime24,
} from '@/lib/date-utils'

// ============================================================================
// Types
// ============================================================================

export interface DailyAggregate {
  date: string // YYYY-MM-DD format
  timestamp: number
  avgIntensity: number
  maxIntensity: number
  minIntensity: number
  entryCount: number
  entries: PainEntry[]
}

export interface TrendPoint {
  date: string
  value: number
  label?: string
}

export interface CategoryCount {
  name: string
  count: number
  percentage: number
  color?: string
}

export interface HeatmapDay {
  date: string
  count: number
  avgIntensity: number
  level: 0 | 1 | 2 | 3 | 4 // GitHub-style intensity levels
}

export interface InsightPattern {
  type: 'trend' | 'streak' | 'correlation' | 'anomaly' | 'peak' | 'info'
  title: string
  description: string
  severity: 'info' | 'warning' | 'success'
  data?: Record<string, unknown>
}

export interface TimeRange {
  label: string
  days: number | null // null = all time
}

export const TIME_RANGES: TimeRange[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'All time', days: null },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date string in YYYY-MM-DD format from timestamp
 * Uses local timezone (not UTC) to avoid day-boundary bugs
 */
export function getDateString(timestamp: number): string {
  return getLocalDateString(timestamp)
}

/**
 * Get start of day timestamp
 */
export function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Filter entries by date range
 */
export function filterByDateRange(
  entries: PainEntry[],
  days: number | null
): PainEntry[] {
  if (days === null) return entries
  
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return entries.filter(e => e.timestamp >= cutoff)
}

/**
 * Generate date range array between two dates
 * Uses local timezone (not UTC) to avoid day-boundary bugs
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  return generateLocalDateRange(startDate, endDate)
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Aggregate entries by day
 */
export function aggregateByDay(entries: PainEntry[]): DailyAggregate[] {
  const byDay = new Map<string, PainEntry[]>()
  
  for (const entry of entries) {
    const dateStr = getDateString(entry.timestamp)
    const existing = byDay.get(dateStr) ?? []
    existing.push(entry)
    byDay.set(dateStr, existing)
  }
  
  const aggregates: DailyAggregate[] = []
  
  for (const [date, dayEntries] of byDay) {
    const intensities = dayEntries.map(e => e.intensity)
    const sum = intensities.reduce((a, b) => a + b, 0)
    
    aggregates.push({
      date,
      timestamp: getStartOfDay(dayEntries[0].timestamp),
      avgIntensity: Math.round((sum / intensities.length) * 10) / 10,
      maxIntensity: Math.max(...intensities),
      minIntensity: Math.min(...intensities),
      entryCount: dayEntries.length,
      entries: dayEntries,
    })
  }
  
  // Sort by date ascending
  return aggregates.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Get intensity trend data for line chart
 */
export function getIntensityTrend(
  entries: PainEntry[],
  days: number | null = 30
): TrendPoint[] {
  const filtered = filterByDateRange(entries, days)
  const aggregated = aggregateByDay(filtered)
  
  return aggregated.map(day => ({
    date: day.date,
    value: day.avgIntensity,
    label: `${day.avgIntensity.toFixed(1)} avg (${day.entryCount} ${day.entryCount === 1 ? 'entry' : 'entries'})`,
  }))
}

/**
 * Get moving average for smoother trend visualization
 */
export function getMovingAverage(
  data: TrendPoint[],
  windowSize: number = 7
): TrendPoint[] {
  if (data.length < windowSize) return data
  
  return data.map((point, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const window = data.slice(start, index + 1)
    const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length
    
    return {
      ...point,
      value: Math.round(avg * 10) / 10,
    }
  })
}

// ============================================================================
// Distribution Functions
// ============================================================================

/**
 * Get location distribution for pie/bar chart
 */
export function getLocationDistribution(entries: PainEntry[]): CategoryCount[] {
  const counts = new Map<string, number>()
  let total = 0
  
  for (const entry of entries) {
    for (const location of entry.locations ?? []) {
      counts.set(location, (counts.get(location) ?? 0) + 1)
      total++
    }
  }
  
  const distribution: CategoryCount[] = []
  
  for (const [name, count] of counts) {
    distribution.push({
      name: formatLocationName(name),
      count,
      percentage: Math.round((count / total) * 100),
    })
  }
  
  // Sort by count descending
  return distribution.sort((a, b) => b.count - a.count)
}

/**
 * Get trigger frequency for bar chart
 */
export function getTriggerFrequency(entries: PainEntry[]): CategoryCount[] {
  const counts = new Map<string, number>()
  let total = 0
  
  for (const entry of entries) {
    for (const trigger of entry.triggers ?? []) {
      counts.set(trigger, (counts.get(trigger) ?? 0) + 1)
      total++
    }
  }
  
  const distribution: CategoryCount[] = []
  
  for (const [name, count] of counts) {
    distribution.push({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    })
  }
  
  return distribution.sort((a, b) => b.count - a.count)
}

/**
 * Get hashtag frequency for tag cloud
 */
export function getHashtagFrequency(entries: PainEntry[]): CategoryCount[] {
  const counts = new Map<string, number>()
  let total = 0
  
  for (const entry of entries) {
    for (const tag of entry.hashtags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
      total++
    }
  }
  
  const distribution: CategoryCount[] = []
  
  for (const [name, count] of counts) {
    distribution.push({
      name: `#${name}`,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    })
  }
  
  return distribution.sort((a, b) => b.count - a.count)
}

/**
 * Get intensity distribution (histogram data)
 */
export function getIntensityDistribution(entries: PainEntry[]): CategoryCount[] {
  const counts = new Array(10).fill(0)
  
  for (const entry of entries) {
    const bucket = Math.min(Math.max(Math.floor(entry.intensity) - 1, 0), 9)
    counts[bucket]++
  }
  
  const total = entries.length
  
  return counts.map((count, index) => ({
    name: `${index + 1}`,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }))
}

// ============================================================================
// Heatmap Functions
// ============================================================================

/**
 * Generate heatmap data for GitHub-style calendar
 */
export function generateHeatmapData(
  entries: PainEntry[],
  days: number = 365
): HeatmapDay[] {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const dateRange = generateDateRange(startDate, endDate)
  const aggregated = aggregateByDay(entries)
  const aggregatedMap = new Map(aggregated.map(a => [a.date, a]))
  
  // Find max entry count for scaling
  const maxCount = Math.max(...aggregated.map(a => a.entryCount), 1)
  
  return dateRange.map(date => {
    const dayData = aggregatedMap.get(date)
    
    if (!dayData) {
      return { date, count: 0, avgIntensity: 0, level: 0 as const }
    }
    
    // Calculate level (0-4) based on entry count
    const level = Math.min(
      Math.ceil((dayData.entryCount / maxCount) * 4),
      4
    ) as 0 | 1 | 2 | 3 | 4
    
    return {
      date,
      count: dayData.entryCount,
      avgIntensity: dayData.avgIntensity,
      level: level || (1 as const), // At least level 1 if there are entries
    }
  })
}

/**
 * Group heatmap data by week for display
 */
export function groupHeatmapByWeek(data: HeatmapDay[]): HeatmapDay[][] {
  const weeks: HeatmapDay[][] = []
  let currentWeek: HeatmapDay[] = []
  
  // Start from the first Sunday
  const firstDate = new Date(data[0]?.date ?? new Date())
  const firstDayOfWeek = firstDate.getDay()
  
  // Add padding for incomplete first week
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', count: 0, avgIntensity: 0, level: 0 })
  }
  
  for (const day of data) {
    currentWeek.push(day)
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  
  // Add remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }
  
  return weeks
}

// ============================================================================
// Insights Functions
// ============================================================================

/**
 * Detect patterns and generate insights
 */
export function generateInsights(entries: PainEntry[]): InsightPattern[] {
  const insights: InsightPattern[] = []
  
  if (entries.length < 3) {
    return [{
      type: 'info',
      title: 'Keep tracking!',
      description: 'Add more entries to unlock insights and pattern detection.',
      severity: 'info',
    }]
  }
  
  // Check for intensity trends
  const trendInsight = detectIntensityTrend(entries)
  if (trendInsight) insights.push(trendInsight)
  
  // Check for streaks
  const streakInsight = detectStreak(entries)
  if (streakInsight) insights.push(streakInsight)
  
  // Check for peak days
  const peakInsight = detectPeakDays(entries)
  if (peakInsight) insights.push(peakInsight)
  
  // Check for trigger correlations
  const correlationInsight = detectTriggerCorrelation(entries)
  if (correlationInsight) insights.push(correlationInsight)
  
  // Check for anomalies
  const anomalyInsight = detectAnomalies(entries)
  if (anomalyInsight) insights.push(anomalyInsight)
  
  return insights
}

/**
 * Detect intensity trends over last 2 weeks
 */
function detectIntensityTrend(entries: PainEntry[]): InsightPattern | null {
  const recent = filterByDateRange(entries, 14)
  const older = entries.filter(e => {
    const age = Date.now() - e.timestamp
    return age >= 14 * 24 * 60 * 60 * 1000 && age < 28 * 24 * 60 * 60 * 1000
  })
  
  if (recent.length < 3 || older.length < 3) return null
  
  const recentAvg = recent.reduce((sum, e) => sum + e.intensity, 0) / recent.length
  const olderAvg = older.reduce((sum, e) => sum + e.intensity, 0) / older.length
  const diff = recentAvg - olderAvg
  
  if (Math.abs(diff) < 0.5) return null
  
  if (diff < -1) {
    return {
      type: 'trend',
      title: 'Improving trend! 📈',
      description: `Your average intensity decreased by ${Math.abs(diff).toFixed(1)} points over the last 2 weeks.`,
      severity: 'success',
      data: { recentAvg, olderAvg, diff },
    }
  }
  
  if (diff > 1) {
    return {
      type: 'trend',
      title: 'Intensity increasing',
      description: `Your average intensity increased by ${diff.toFixed(1)} points over the last 2 weeks.`,
      severity: 'warning',
      data: { recentAvg, olderAvg, diff },
    }
  }
  
  return null
}

/**
 * Detect tracking streaks
 */
function detectStreak(entries: PainEntry[]): InsightPattern | null {
  if (entries.length === 0) return null
  
  const aggregated = aggregateByDay(entries)
  const today = getDateString(Date.now())
  const yesterday = getDateString(Date.now() - 24 * 60 * 60 * 1000)
  
  // Check if user has tracked today or yesterday
  const recentDates = new Set(aggregated.slice(-7).map(a => a.date))
  if (!recentDates.has(today) && !recentDates.has(yesterday)) {
    return null
  }
  
  // Calculate current streak
  let streak = 0
  let checkDate = new Date()
  
  // If no entry today, start from yesterday
  if (!recentDates.has(today)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }
  
  const dateSet = new Set(aggregated.map(a => a.date))
  
  while (dateSet.has(getDateString(checkDate.getTime()))) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }
  
  if (streak >= 7) {
    return {
      type: 'streak',
      title: `${streak}-day streak! 🔥`,
      description: `You've been tracking consistently for ${streak} days. Keep it up!`,
      severity: 'success',
      data: { streak },
    }
  }
  
  if (streak >= 3) {
    return {
      type: 'streak',
      title: `${streak}-day streak`,
      description: `You're building a habit! ${7 - streak} more days to reach a week.`,
      severity: 'info',
      data: { streak },
    }
  }
  
  return null
}

/**
 * Detect peak days of the week
 */
function detectPeakDays(entries: PainEntry[]): InsightPattern | null {
  if (entries.length < 14) return null
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayStats = new Array(7).fill(null).map(() => ({ total: 0, count: 0 }))
  
  for (const entry of entries) {
    const day = new Date(entry.timestamp).getDay()
    dayStats[day].total += entry.intensity
    dayStats[day].count++
  }
  
  const dayAvgs = dayStats.map((stat, idx) => ({
    day: dayNames[idx],
    avg: stat.count > 0 ? stat.total / stat.count : 0,
    count: stat.count,
  })).filter(d => d.count >= 2)
  
  if (dayAvgs.length < 3) return null
  
  const sorted = [...dayAvgs].sort((a, b) => b.avg - a.avg)
  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]
  
  if (highest.avg - lowest.avg < 1.5) return null
  
  return {
    type: 'peak',
    title: `${highest.day}s are toughest`,
    description: `Average intensity is ${highest.avg.toFixed(1)} on ${highest.day}s vs ${lowest.avg.toFixed(1)} on ${lowest.day}s.`,
    severity: 'info',
    data: { highest, lowest, dayAvgs },
  }
}

/**
 * Detect trigger correlations with high intensity
 */
function detectTriggerCorrelation(entries: PainEntry[]): InsightPattern | null {
  const triggerStats = new Map<string, { total: number; count: number }>()
  
  for (const entry of entries) {
    for (const trigger of entry.triggers ?? []) {
      const existing = triggerStats.get(trigger) ?? { total: 0, count: 0 }
      existing.total += entry.intensity
      existing.count++
      triggerStats.set(trigger, existing)
    }
  }
  
  // Find trigger with highest average intensity
  let highestTrigger: { name: string; avg: number; count: number } | null = null
  
  for (const [name, stats] of triggerStats) {
    if (stats.count < 3) continue
    const avg = stats.total / stats.count
    
    if (!highestTrigger || avg > highestTrigger.avg) {
      highestTrigger = { name, avg, count: stats.count }
    }
  }
  
  if (!highestTrigger || highestTrigger.avg < 6) return null
  
  const overallAvg = entries.reduce((sum, e) => sum + e.intensity, 0) / entries.length
  
  if (highestTrigger.avg - overallAvg < 1.5) return null
  
  return {
    type: 'correlation',
    title: `"${highestTrigger.name}" linked to higher intensity`,
    description: `When you report "${highestTrigger.name}", average intensity is ${highestTrigger.avg.toFixed(1)} (vs ${overallAvg.toFixed(1)} overall).`,
    severity: 'warning',
    data: { trigger: highestTrigger, overallAvg },
  }
}

/**
 * Detect intensity anomalies (sudden spikes)
 */
function detectAnomalies(entries: PainEntry[]): InsightPattern | null {
  const recent = filterByDateRange(entries, 7)
  
  if (recent.length < 2) return null
  
  const recentMax = Math.max(...recent.map(e => e.intensity))
  const recentAvg = recent.reduce((sum, e) => sum + e.intensity, 0) / recent.length
  
  // Check if there's a significant spike
  if (recentMax >= 8 && recentMax - recentAvg >= 3) {
    const spikeEntry = recent.find(e => e.intensity === recentMax)
    const spikeDate = spikeEntry
      ? formatDateShort(spikeEntry.timestamp)
      : 'recently'
    
    return {
      type: 'anomaly',
      title: 'Intensity spike detected',
      description: `You recorded a ${recentMax}/10 on ${spikeDate}, which is ${(recentMax - recentAvg).toFixed(1)} points above your weekly average.`,
      severity: 'warning',
      data: { spikeEntry, recentAvg, recentMax },
    }
  }
  
  return null
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export entries to CSV format
 */
export function exportToCSV(entries: PainEntry[]): string {
  const headers = ['Date', 'Time', 'Intensity', 'Locations', 'Triggers', 'Hashtags', 'Notes']
  const rows = entries.map(entry => {
    return [
      formatDateShort(entry.timestamp),
      formatTime24(entry.timestamp),
      entry.intensity.toString(),
      (entry.locations ?? []).join('; '),
      (entry.triggers ?? []).join('; '),
      (entry.hashtags ?? []).join('; '),
      `"${(entry.notes ?? '').replace(/"/g, '""')}"`,
    ].join(',')
  })
  
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Export analytics summary to CSV
 */
export function exportAnalyticsSummary(entries: PainEntry[]): string {
  const aggregated = aggregateByDay(entries)
  const headers = ['Date', 'Entry Count', 'Avg Intensity', 'Min Intensity', 'Max Intensity']
  const rows = aggregated.map(day => [
    day.date,
    day.entryCount.toString(),
    day.avgIntensity.toFixed(1),
    day.minIntensity.toString(),
    day.maxIntensity.toString(),
  ].join(','))
  
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Trigger file download
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

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format location name for display
 */
function formatLocationName(location: string): string {
  return location
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get color for intensity value using CSS variables for theme awareness
 * Uses getComputedStyle to read resolved oklch values at runtime
 */
export function getIntensityColor(intensity: number): string {
  const styles = getComputedStyle(document.documentElement)
  if (intensity <= 3) return styles.getPropertyValue('--chart-intensity-low').trim() // Green
  if (intensity <= 6) return styles.getPropertyValue('--chart-intensity-medium').trim() // Yellow/Amber
  return styles.getPropertyValue('--chart-intensity-high').trim() // Red
}

/**
 * Get heatmap cell color based on level using CSS variables for theme awareness
 * Uses getComputedStyle to read resolved oklch values at runtime
 */
export function getHeatmapColor(level: 0 | 1 | 2 | 3 | 4): string {
  const styles = getComputedStyle(document.documentElement)
  const varNames = [
    '--chart-heatmap-0',   // 0 - Empty
    '--chart-heatmap-1',   // 1 - Light
    '--chart-heatmap-2',   // 2 - Medium-Light
    '--chart-heatmap-3',   // 3 - Medium
    '--chart-heatmap-4',   // 4 - Dark
  ]
  return styles.getPropertyValue(varNames[level]).trim()
}
