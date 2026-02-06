import { useState, useMemo } from 'react'
import { subDays, endOfDay, startOfDay } from 'date-fns'
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { DateRangePicker } from './DateRangePicker'
import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'
import type { DateRange, ExportFormat, ExportProgress } from '@/types/export'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: PainEntry[]
  trackers: Tracker[]
  currentTracker?: Tracker | null
  onExport: (options: {
    format: ExportFormat
    dateRange: DateRange
    trackerIds: string[]
    includeCharts: boolean
    includeInsights: boolean
  }) => Promise<void>
}

export function ExportDialog({
  open,
  onOpenChange,
  entries,
  trackers,
  currentTracker,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  }))
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includeInsights, setIncludeInsights] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)

  // Calculate min date from entries
  const minDate = useMemo(() => {
    if (entries.length === 0) return undefined
    const timestamps = entries.map((e) => e.timestamp)
    return new Date(Math.min(...timestamps))
  }, [entries])

  // Filter entries by date range for preview count
  const filteredEntriesCount = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp)
      return entryDate >= dateRange.start && entryDate <= dateRange.end
    }).length
  }, [entries, dateRange])

  const handleExport = async () => {
    setIsExporting(true)
    setProgress({ step: 'preparing', progress: 0, message: 'Preparing export...' })

    try {
      await onExport({
        format,
        dateRange,
        trackerIds: currentTracker ? [currentTracker.id] : [],
        includeCharts,
        includeInsights,
      })
      setIsExporting(false)
      setProgress(null)
      onOpenChange(false)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed. Please try again.')
      setIsExporting(false)
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            {currentTracker
              ? `Export "${currentTracker.name}" tracker data`
              : 'Export your tracking data'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range Section */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              minDate={minDate}
              maxDate={new Date()}
            />
            <p className="text-xs text-muted-foreground">
              {filteredEntriesCount} entries in selected range
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="grid gap-3"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label
                  htmlFor="format-csv"
                  className="flex items-center gap-2 font-normal cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div>CSV Spreadsheet</div>
                    <p className="text-xs text-muted-foreground">
                      Raw data for analysis in Excel, Google Sheets
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="pdf" id="format-pdf" />
                <Label
                  htmlFor="format-pdf"
                  className="flex items-center gap-2 font-normal cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div>PDF Report</div>
                    <p className="text-xs text-muted-foreground">
                      Visual report with charts for healthcare providers
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* PDF Options */}
          {format === 'pdf' && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <Label className="text-sm font-medium">Report Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-charts"
                    checked={includeCharts}
                    onCheckedChange={(checked) =>
                      setIncludeCharts(checked === true)
                    }
                  />
                  <Label
                    htmlFor="include-charts"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include trend chart and activity calendar
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-insights"
                    checked={includeInsights}
                    onCheckedChange={(checked) =>
                      setIncludeInsights(checked === true)
                    }
                  />
                  <Label
                    htmlFor="include-insights"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include key insights and patterns
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          {isExporting && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progress.message}</span>
                <span className="font-medium">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || filteredEntriesCount === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
