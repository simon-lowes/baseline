/**
 * Analytics Dashboard Component
 * 
 * Cross-tracker analytics view with responsive accordion layout.
 * Shows all visualizations with time range filtering and export options.
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  ChevronLeft,
  Download,
  FileSpreadsheet,
  Image,
  FileText,
  Calendar,
  TrendingUp,
  MapPin,
  Zap,
  Hash,
  BarChart3,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'
import {
  TIME_RANGES,
  filterByDateRange,
  exportToCSV,
  exportAnalyticsSummary,
  downloadFile,
} from '@/lib/analytics-utils'
import {
  IntensityTrendLine,
  LocationDistributionPie,
  TriggerFrequencyBar,
  HashtagCloud,
  EntryHeatmapCalendar,
  IntensityDistributionBar,
  InsightsPanel,
} from '@/components/analytics'
import { PainEntryCard } from '@/components/PainEntryCard'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface AnalyticsDashboardProps {
  entries: PainEntry[]
  trackers: Tracker[]
  onBack: () => void
  onEntryEdit?: (entry: PainEntry) => void
  onEntryDelete?: (id: string) => void
  /** When provided, shows single-tracker analytics (hides tracker selector) */
  currentTracker?: Tracker | null
  /** Callback to view all trackers analytics */
  onViewAllTrackers?: () => void
  /** When true, hides the header and back button (for embedding in tabs) */
  embedded?: boolean
}

type ChartSection = 
  | 'insights'
  | 'trend'
  | 'heatmap'
  | 'distribution'
  | 'locations'
  | 'triggers'
  | 'hashtags'

export function AnalyticsDashboard({
  entries,
  trackers,
  onBack,
  onEntryEdit,
  onEntryDelete,
  currentTracker,
  onViewAllTrackers,
  embedded = false,
}: AnalyticsDashboardProps) {
  // When viewing a specific tracker, lock to that tracker
  const isSingleTrackerMode = !!currentTracker
  const [selectedTracker, setSelectedTracker] = useState<string>(
    currentTracker?.id ?? 'all'
  )
  const [timeRange, setTimeRange] = useState<number | null>(30)
  const [expandedSections, setExpandedSections] = useState<string[]>(['insights', 'trend'])
  const [drillDownEntries, setDrillDownEntries] = useState<PainEntry[] | null>(null)
  const [drillDownTitle, setDrillDownTitle] = useState<string>('')
  
  const chartsRef = useRef<HTMLDivElement>(null)

  // Update selected tracker if currentTracker changes
  useEffect(() => {
    if (currentTracker) {
      setSelectedTracker(currentTracker.id)
    }
  }, [currentTracker])

  // Get tracker name for exports and titles
  const trackerDisplayName = useMemo(() => {
    if (isSingleTrackerMode && currentTracker) {
      return currentTracker.name
    }
    if (selectedTracker !== 'all') {
      const tracker = trackers.find(t => t.id === selectedTracker)
      return tracker?.name ?? null
    }
    return null
  }, [isSingleTrackerMode, currentTracker, selectedTracker, trackers])

  // Filter entries by tracker and time range
  const filteredEntries = useMemo(() => {
    let result = entries
    
    // Filter by tracker
    if (selectedTracker !== 'all') {
      result = result.filter(e => e.tracker_id === selectedTracker)
    }
    
    // Filter by time range
    result = filterByDateRange(result, timeRange)
    
    return result
  }, [entries, selectedTracker, timeRange])

  // Drill-down handlers
  const handleDayClick = useCallback((date: string, dayEntries: PainEntry[]) => {
    if (dayEntries.length === 0) return
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    setDrillDownTitle(`Entries for ${formattedDate}`)
    setDrillDownEntries(dayEntries)
  }, [])

  const handleTrendPointClick = useCallback((date: string, dayEntries: PainEntry[]) => {
    if (dayEntries.length === 0) return
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    setDrillDownTitle(`Entries for ${formattedDate}`)
    setDrillDownEntries(dayEntries)
  }, [])

  // Helper to generate filename with optional tracker name
  const getExportFilename = useCallback((type: string, extension: string) => {
    const date = new Date().toISOString().split('T')[0]
    if (trackerDisplayName) {
      const safeName = trackerDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return `baseline-${safeName}-${type}-${date}.${extension}`
    }
    return `baseline-${type}-${date}.${extension}`
  }, [trackerDisplayName])

  // Export handlers
  const handleExportCSV = useCallback(() => {
    const csv = exportToCSV(filteredEntries)
    const filename = getExportFilename('entries', 'csv')
    downloadFile(csv, filename, 'text/csv')
    toast.success('Entries exported to CSV')
  }, [filteredEntries, getExportFilename])

  const handleExportSummary = useCallback(() => {
    const csv = exportAnalyticsSummary(filteredEntries)
    const filename = getExportFilename('summary', 'csv')
    downloadFile(csv, filename, 'text/csv')
    toast.success('Summary exported to CSV')
  }, [filteredEntries, getExportFilename])

  const handleExportPNG = useCallback(async () => {
    if (!chartsRef.current) return
    
    try {
      toast.loading('Generating image...')
      const canvas = await html2canvas(chartsRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = getExportFilename('analytics', 'png')
      link.href = dataUrl
      link.click()
      toast.dismiss()
      toast.success('Analytics exported as PNG')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to export image')
      console.error('PNG export error:', error)
    }
  }, [getExportFilename])

  const handleExportPDF = useCallback(async () => {
    if (!chartsRef.current) return
    
    try {
      toast.loading('Generating PDF...')
      const canvas = await html2canvas(chartsRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(getExportFilename('analytics', 'pdf'))
      toast.dismiss()
      toast.success('Analytics exported as PDF')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to export PDF')
      console.error('PDF export error:', error)
    }
  }, [getExportFilename])

  const sections: { id: ChartSection; title: string; icon: typeof TrendingUp; description: string }[] = [
    { id: 'insights', title: 'Insights', icon: Lightbulb, description: 'AI-detected patterns and trends' },
    { id: 'trend', title: 'Intensity Trend', icon: TrendingUp, description: 'Track your intensity over time' },
    { id: 'heatmap', title: 'Activity Calendar', icon: Calendar, description: 'See your tracking consistency' },
    { id: 'distribution', title: 'Intensity Distribution', icon: BarChart3, description: 'How often each level occurs' },
    { id: 'locations', title: 'Location Breakdown', icon: MapPin, description: 'Where you feel it most' },
    { id: 'triggers', title: 'Top Triggers', icon: Zap, description: 'What affects you most' },
    { id: 'hashtags', title: 'Tags', icon: Hash, description: 'Your most used hashtags' },
  ]

  return (
    <div className={embedded ? "space-y-6" : "container max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6"}>
      {/* Header - hidden when embedded */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">
                {isSingleTrackerMode && currentTracker 
                  ? `${currentTracker.icon} ${currentTracker.name}` 
                  : 'Your Progress'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredEntries.length} entries analyzed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View All Trackers link (single tracker mode only) */}
            {isSingleTrackerMode && onViewAllTrackers && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={onViewAllTrackers}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">All Trackers</span>
              </Button>
            )}

            {/* Export dropdown */}
            <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export Data</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              All Entries (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSummary}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Daily Summary (CSV)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Export Charts</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportPNG}>
              <Image className="h-4 w-4 mr-2" />
              Screenshot (PNG)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Report (PDF)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
      )}

      {/* Embedded mode header with export only */}
      {embedded && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredEntries.length} entries analyzed
          </p>
          <div className="flex items-center gap-2">
            {onViewAllTrackers && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={onViewAllTrackers}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">All Trackers</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  All Entries (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSummary}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Daily Summary (CSV)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Export Charts</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPNG}>
                  <Image className="h-4 w-4 mr-2" />
                  Screenshot (PNG)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Report (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Tracker filter - hidden in single tracker mode */}
            {!isSingleTrackerMode && (
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Tracker</label>
                <Select value={selectedTracker} onValueChange={setSelectedTracker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tracker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trackers</SelectItem>
                    {trackers.map(tracker => (
                      <SelectItem key={tracker.id} value={tracker.id}>
                        {tracker.icon} {tracker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time range filter */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Time Range</label>
              <Select 
                value={timeRange?.toString() ?? 'all'} 
                onValueChange={(v) => setTimeRange(v === 'all' ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map(range => (
                    <SelectItem 
                      key={range.label} 
                      value={range.days?.toString() ?? 'all'}
                    >
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No data state */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              Start tracking to see your analytics and insights here.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Charts accordion */
        <div ref={chartsRef}>
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="space-y-4"
          >
            {sections.map(section => (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border rounded-lg bg-card overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 rounded-md bg-primary/10">
                      <section.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {section.description}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ChartContent
                    section={section.id}
                    entries={filteredEntries}
                    timeRange={timeRange}
                    onDayClick={handleDayClick}
                    onTrendPointClick={handleTrendPointClick}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Drill-down dialog */}
      <Dialog open={drillDownEntries !== null} onOpenChange={() => setDrillDownEntries(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drillDownTitle}</DialogTitle>
            <DialogDescription>
              {drillDownEntries?.length ?? 0} {(drillDownEntries?.length ?? 0) === 1 ? 'entry' : 'entries'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {drillDownEntries?.map(entry => (
              <PainEntryCard
                key={entry.id}
                entry={entry}
                onEdit={(e) => {
                  setDrillDownEntries(null)
                  onEntryEdit?.(e)
                }}
                onDelete={(id) => {
                  setDrillDownEntries(null)
                  onEntryDelete?.(id)
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ChartContentProps {
  section: ChartSection
  entries: PainEntry[]
  timeRange: number | null
  onDayClick: (date: string, entries: PainEntry[]) => void
  onTrendPointClick: (date: string, entries: PainEntry[]) => void
}

function ChartContent({
  section,
  entries,
  timeRange,
  onDayClick,
  onTrendPointClick,
}: ChartContentProps) {
  switch (section) {
    case 'insights':
      return <InsightsPanel entries={entries} />
    case 'trend':
      return (
        <IntensityTrendLine
          entries={entries}
          days={timeRange}
          onPointClick={onTrendPointClick}
        />
      )
    case 'heatmap':
      return (
        <EntryHeatmapCalendar
          entries={entries}
          days={timeRange ?? 365}
          onDayClick={onDayClick}
        />
      )
    case 'distribution':
      return <IntensityDistributionBar entries={entries} />
    case 'locations':
      return <LocationDistributionPie entries={entries} />
    case 'triggers':
      return <TriggerFrequencyBar entries={entries} />
    case 'hashtags':
      return <HashtagCloud entries={entries} />
    default:
      return null
  }
}
