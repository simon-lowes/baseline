/**
 * Export Types
 *
 * Types for data export and PDF report generation
 */

export type ExportFormat = 'csv' | 'pdf'

export interface DateRange {
  start: Date
  end: Date
}

export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom'

export interface ExportOptions {
  format: ExportFormat
  dateRange: DateRange
  trackerIds: string[] // Empty array means all trackers
  includeCharts: boolean // PDF only
  includeInsights: boolean // PDF only
}

export interface ExportSummaryStats {
  totalEntries: number
  trackerCount: number
  dateRange: {
    start: string // ISO date string
    end: string
    daysSpanned: number
  }
  averageIntensity: number | null // null if no intensity data
  entryFrequency: string // e.g., "2.3 entries/day"
  peakDays: Array<{ date: string; count: number }>
  topTriggers: Array<{ name: string; count: number; percentage: number }>
  topLocations: Array<{ name: string; count: number; percentage: number }>
  topHashtags: Array<{ name: string; count: number }>
}

export interface PDFReportConfig {
  title?: string
  subtitle?: string
  includeCharts?: boolean
  includeInsights?: boolean
  showWatermark?: boolean
}

export interface ChartImage {
  type: 'trend' | 'heatmap' | 'distribution' | 'triggers'
  dataUrl: string
  width: number
  height: number
}

export interface ExportProgress {
  step: 'preparing' | 'filtering' | 'generating-charts' | 'building-pdf' | 'complete'
  progress: number // 0-100
  message: string
}
