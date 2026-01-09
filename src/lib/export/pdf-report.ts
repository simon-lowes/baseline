/**
 * PDF Report Generator
 *
 * Creates professional PDF reports for healthcare providers using jsPDF
 */

import jsPDF from 'jspdf'
import { format } from 'date-fns'
import type { ExportSummaryStats, PDFReportConfig, ChartImage } from '@/types/export'
import type { Tracker } from '@/types/tracker'

// PDF dimensions (A4 in mm)
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

// Colors
const PRIMARY_COLOR = '#3b82f6' // blue-500
const TEXT_COLOR = '#1f2937' // gray-800
const MUTED_COLOR = '#6b7280' // gray-500

interface ReportData {
  stats: ExportSummaryStats
  trackers: Tracker[]
  chartImages: Record<string, ChartImage | null>
  insights: string[]
}

/**
 * Add the report header
 */
function addHeader(
  doc: jsPDF,
  config: PDFReportConfig,
  stats: ExportSummaryStats
): number {
  let y = MARGIN

  // Title
  doc.setFontSize(24)
  doc.setTextColor(TEXT_COLOR)
  doc.text(config.title || 'Baseline Health Report', MARGIN, y)
  y += 10

  // Subtitle / Date range
  doc.setFontSize(11)
  doc.setTextColor(MUTED_COLOR)
  const dateRangeText = `${format(new Date(stats.dateRange.start), 'MMMM d, yyyy')} - ${format(new Date(stats.dateRange.end), 'MMMM d, yyyy')}`
  doc.text(dateRangeText, MARGIN, y)
  y += 6

  // Generated date
  doc.setFontSize(9)
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy, h:mm a')}`, MARGIN, y)
  y += 10

  // Horizontal line
  doc.setDrawColor(200, 200, 200)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 10

  return y
}

/**
 * Add the summary statistics section
 */
function addSummarySection(
  doc: jsPDF,
  stats: ExportSummaryStats,
  y: number
): number {
  // Section title
  doc.setFontSize(14)
  doc.setTextColor(PRIMARY_COLOR)
  doc.text('Summary', MARGIN, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(TEXT_COLOR)

  const summaryItems = [
    `Total Entries: ${stats.totalEntries}`,
    `Period: ${stats.dateRange.daysSpanned} days`,
    `Entry Frequency: ${stats.entryFrequency}`,
  ]

  if (stats.averageIntensity !== null) {
    summaryItems.push(`Average Intensity: ${stats.averageIntensity.toFixed(1)}/10`)
  }

  if (stats.trackerCount > 1) {
    summaryItems.push(`Trackers: ${stats.trackerCount}`)
  }

  // Draw summary items in a grid
  const colWidth = CONTENT_WIDTH / 2
  summaryItems.forEach((item, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    doc.text(`• ${item}`, MARGIN + col * colWidth, y + row * 6)
  })

  y += Math.ceil(summaryItems.length / 2) * 6 + 10

  // Top triggers if available
  if (stats.topTriggers.length > 0) {
    doc.setFontSize(11)
    doc.setTextColor(MUTED_COLOR)
    doc.text('Top Triggers:', MARGIN, y)
    y += 6

    doc.setFontSize(10)
    doc.setTextColor(TEXT_COLOR)
    stats.topTriggers.slice(0, 3).forEach((trigger) => {
      doc.text(`• ${trigger.name} (${trigger.count} times, ${trigger.percentage}%)`, MARGIN + 5, y)
      y += 5
    })
    y += 5
  }

  // Top locations if available
  if (stats.topLocations.length > 0) {
    doc.setFontSize(11)
    doc.setTextColor(MUTED_COLOR)
    doc.text('Top Locations:', MARGIN, y)
    y += 6

    doc.setFontSize(10)
    doc.setTextColor(TEXT_COLOR)
    stats.topLocations.slice(0, 3).forEach((location) => {
      doc.text(`• ${location.name} (${location.count} times, ${location.percentage}%)`, MARGIN + 5, y)
      y += 5
    })
    y += 5
  }

  return y
}

/**
 * Add a chart image to the PDF
 */
function addChartImage(
  doc: jsPDF,
  image: ChartImage,
  title: string,
  y: number,
  maxHeight = 60
): number {
  // Check if we need a new page
  if (y + maxHeight + 20 > PAGE_HEIGHT - MARGIN) {
    doc.addPage()
    y = MARGIN
  }

  // Section title
  doc.setFontSize(12)
  doc.setTextColor(PRIMARY_COLOR)
  doc.text(title, MARGIN, y)
  y += 6

  // Calculate image dimensions to fit
  const aspectRatio = image.width / image.height
  let imgWidth = CONTENT_WIDTH
  let imgHeight = imgWidth / aspectRatio

  if (imgHeight > maxHeight) {
    imgHeight = maxHeight
    imgWidth = imgHeight * aspectRatio
  }

  // Add image
  doc.addImage(image.dataUrl, 'PNG', MARGIN, y, imgWidth, imgHeight)
  y += imgHeight + 10

  return y
}

/**
 * Add insights section
 */
function addInsightsSection(
  doc: jsPDF,
  insights: string[],
  y: number
): number {
  if (insights.length === 0) return y

  // Check if we need a new page
  if (y + 40 > PAGE_HEIGHT - MARGIN) {
    doc.addPage()
    y = MARGIN
  }

  // Section title
  doc.setFontSize(14)
  doc.setTextColor(PRIMARY_COLOR)
  doc.text('Key Insights', MARGIN, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(TEXT_COLOR)

  insights.forEach((insight) => {
    // Check for page break
    if (y + 6 > PAGE_HEIGHT - MARGIN) {
      doc.addPage()
      y = MARGIN
    }

    doc.text(`• ${insight}`, MARGIN, y)
    y += 6
  })

  return y + 5
}

/**
 * Add footer to all pages
 */
function addFooter(doc: jsPDF, showWatermark: boolean): void {
  const pageCount = doc.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(200, 200, 200)
    doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15)

    // Watermark
    if (showWatermark) {
      doc.setFontSize(8)
      doc.setTextColor(MUTED_COLOR)
      doc.text('Generated by Baseline Health Tracker', MARGIN, PAGE_HEIGHT - 10)
    }

    // Page number
    doc.setFontSize(8)
    doc.setTextColor(MUTED_COLOR)
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN - 20, PAGE_HEIGHT - 10)
  }
}

/**
 * Generate the PDF doctor report
 */
export async function generateDoctorReport(
  data: ReportData,
  config: PDFReportConfig = {}
): Promise<Blob> {
  const {
    title = 'Baseline Health Report',
    subtitle,
    includeCharts = true,
    includeInsights = true,
    showWatermark = true,
  } = config

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let y = MARGIN

  // Add header
  y = addHeader(doc, { ...config, title }, data.stats)

  // Add summary section
  y = addSummarySection(doc, data.stats, y)

  // Add charts
  if (includeCharts) {
    const { trend, heatmap } = data.chartImages

    if (trend) {
      y = addChartImage(doc, trend, 'Intensity Trend', y, 50)
    }

    if (heatmap) {
      y = addChartImage(doc, heatmap, 'Activity Calendar', y, 40)
    }
  }

  // Add insights
  if (includeInsights && data.insights.length > 0) {
    y = addInsightsSection(doc, data.insights, y)
  }

  // Add footer to all pages
  addFooter(doc, showWatermark)

  // Return as Blob
  return doc.output('blob')
}

/**
 * Generate a simple text-only report (no charts)
 */
export async function generateTextReport(
  stats: ExportSummaryStats,
  trackerName: string,
  insights: string[] = []
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let y = MARGIN

  // Title
  doc.setFontSize(24)
  doc.setTextColor(TEXT_COLOR)
  doc.text('Baseline Health Report', MARGIN, y)
  y += 12

  // Tracker name
  doc.setFontSize(14)
  doc.setTextColor(PRIMARY_COLOR)
  doc.text(trackerName, MARGIN, y)
  y += 8

  // Date range
  doc.setFontSize(11)
  doc.setTextColor(MUTED_COLOR)
  const dateRangeText = `${stats.dateRange.start} to ${stats.dateRange.end}`
  doc.text(dateRangeText, MARGIN, y)
  y += 12

  // Divider
  doc.setDrawColor(200, 200, 200)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 10

  // Summary
  y = addSummarySection(doc, stats, y)

  // Insights
  if (insights.length > 0) {
    y = addInsightsSection(doc, insights, y)
  }

  // Footer
  addFooter(doc, true)

  return doc.output('blob')
}
