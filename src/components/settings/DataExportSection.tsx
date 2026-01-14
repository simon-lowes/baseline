/**
 * Data Export Section
 *
 * Allows users to export all their data for GDPR Article 20 (Right to Data Portability).
 * Supports CSV and JSON formats.
 */

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Download, FileSpreadsheet, FileJson, Loader2, ChevronDown, Database } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { generateEntriesCSV, downloadFile } from '@/lib/export/csv-export'
import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'

interface DataExportSectionProps {
  entries: PainEntry[]
  trackers: Tracker[]
  userEmail?: string
}

export function DataExportSection({ entries, trackers, userEmail }: DataExportSectionProps) {
  const [isExporting, setIsExporting] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const totalEntries = entries.length
    const totalTrackers = trackers.length

    // Find first entry date
    let firstEntryDate: Date | null = null
    if (entries.length > 0) {
      const timestamps = entries.map((e) => e.timestamp)
      firstEntryDate = new Date(Math.min(...timestamps))
    }

    return { totalEntries, totalTrackers, firstEntryDate }
  }, [entries, trackers])

  const handleExportCSV = async () => {
    if (entries.length === 0) {
      toast.error('No data to export')
      return
    }

    setIsExporting(true)
    try {
      const csv = generateEntriesCSV(entries, trackers)
      const filename = `baseline-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
      downloadFile(csv, filename, 'text/csv;charset=utf-8;')

      toast.success(`Downloaded ${stats.totalEntries} entries as CSV`)
    } catch (err) {
      console.error('CSV export failed:', err)
      toast.error('Could not export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportJSON = async () => {
    setIsExporting(true)
    try {
      // Create GDPR-compliant export with all user data
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0',
        user: {
          email: userEmail || null,
        },
        trackers: trackers.map((t) => ({
          id: t.id,
          name: t.name,
          icon: t.icon,
          color: t.color,
          type: t.type,
          presetId: t.preset_id,
          isDefault: t.is_default,
          config: t.generated_config,
          userDescription: t.user_description,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })),
        entries: entries.map((e) => ({
          id: e.id,
          trackerId: e.tracker_id,
          timestamp: e.timestamp,
          intensity: e.intensity,
          locations: e.locations,
          triggers: e.triggers,
          notes: e.notes,
          hashtags: e.hashtags,
          fieldValues: e.field_values,
        })),
        summary: {
          totalEntries: stats.totalEntries,
          totalTrackers: stats.totalTrackers,
          firstEntryDate: stats.firstEntryDate?.toISOString() || null,
        },
      }

      const json = JSON.stringify(exportData, null, 2)
      const filename = `baseline-full-export-${format(new Date(), 'yyyy-MM-dd')}.json`
      downloadFile(json, filename, 'application/json;charset=utf-8;')

      toast.success('Downloaded complete data archive')
    } catch (err) {
      console.error('JSON export failed:', err)
      toast.error('Could not export data')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Data & Privacy
      </h3>

      {/* Stats display */}
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
        <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm">
            <span className="font-medium">{stats.totalEntries}</span>{' '}
            {stats.totalEntries === 1 ? 'entry' : 'entries'} across{' '}
            <span className="font-medium">{stats.totalTrackers}</span>{' '}
            {stats.totalTrackers === 1 ? 'tracker' : 'trackers'}
          </p>
          {stats.firstEntryDate && (
            <p className="text-xs text-muted-foreground">
              First entry: {format(stats.firstEntryDate, 'PPP')}
            </p>
          )}
          {stats.totalEntries === 0 && (
            <p className="text-xs text-muted-foreground">
              No entries recorded yet
            </p>
          )}
        </div>
      </div>

      {/* Export button with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export All Data
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            <div>
              <div>CSV Spreadsheet</div>
              <p className="text-xs text-muted-foreground">
                For Excel, Google Sheets
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJSON}>
            <FileJson className="mr-2 h-4 w-4" />
            <div>
              <div>JSON Archive</div>
              <p className="text-xs text-muted-foreground">
                Full data with metadata
              </p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <p className="text-xs text-muted-foreground">
        Download all your data to keep a personal backup or transfer to another service.
      </p>
    </div>
  )
}
