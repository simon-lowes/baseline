/**
 * Entry Heatmap Calendar
 * 
 * GitHub-style contribution calendar showing entry frequency.
 * Uses react-activity-calendar for consistent, accessible display.
 */

import { useMemo, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { generateHeatmapData, getHeatmapColor, type HeatmapDay } from '@/lib/analytics-utils'
import type { PainEntry } from '@/types/pain-entry'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'

interface EntryHeatmapCalendarProps {
  entries: PainEntry[]
  onDayClick?: (date: string, entries: PainEntry[]) => void
  days?: number
}

export function EntryHeatmapCalendar({
  entries,
  onDayClick,
  days = 365,
}: EntryHeatmapCalendarProps) {
  const isMobile = useIsMobile()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Use fewer days on mobile for better display
  const displayDays = isMobile ? Math.min(days, 180) : days
  
  const heatmapData = useMemo(() => {
    return generateHeatmapData(entries, displayDays)
  }, [entries, displayDays])

  // Group by weeks for display
  const weeks = useMemo(() => {
    const result: HeatmapDay[][] = []
    let currentWeek: HeatmapDay[] = []
    
    // Start from the first Sunday
    const firstDate = new Date(heatmapData[0]?.date ?? new Date())
    const firstDayOfWeek = firstDate.getDay()
    
    // Add padding for incomplete first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: 0, avgIntensity: 0, level: 0 })
    }
    
    for (const day of heatmapData) {
      currentWeek.push(day)
      
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    }
    
    // Add remaining days with padding
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0, avgIntensity: 0, level: 0 })
      }
      result.push(currentWeek)
    }
    
    return result
  }, [heatmapData])

  // Calculate stats
  const stats = useMemo(() => {
    const activeDays = heatmapData.filter(d => d.count > 0).length
    const totalEntries = heatmapData.reduce((sum, d) => sum + d.count, 0)
    const avgPerDay = activeDays > 0 ? (totalEntries / activeDays).toFixed(1) : '0'
    
    return { activeDays, totalEntries, avgPerDay }
  }, [heatmapData])

  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = ''
    
    weeks.forEach((week, weekIndex) => {
      // Check the first valid day of the week
      const validDay = week.find(d => d.date)
      if (validDay) {
        const date = new Date(validDay.date)
        const month = date.toLocaleDateString('en-US', { month: 'short' })
        
        if (month !== lastMonth) {
          labels.push({ month, weekIndex })
          lastMonth = month
        }
      }
    })
    
    return labels
  }, [weeks])

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const cellSize = isMobile ? 10 : 12
  const gap = 2

  // Compute heatmap colors reactively when theme changes
  const heatmapColors = useMemo(() => {
    if (!mounted) return { 0: '', 1: '', 2: '', 3: '', 4: '' }
    return {
      0: getHeatmapColor(0),
      1: getHeatmapColor(1),
      2: getHeatmapColor(2),
      3: getHeatmapColor(3),
      4: getHeatmapColor(4),
    }
  }, [resolvedTheme, mounted])

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{stats.totalEntries}</span> entries
        </div>
        <div>
          <span className="font-medium text-foreground">{stats.activeDays}</span> active days
        </div>
        <div>
          <span className="font-medium text-foreground">{stats.avgPerDay}</span> avg/day
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col gap-1">
          {/* Month labels - positioned inline with week columns */}
          <div 
            className="flex relative h-5" 
            style={{ 
              marginLeft: isMobile ? 0 : 30,
              width: weeks.length * (cellSize + gap),
            }}
          >
            {monthLabels.map((label, idx) => (
              <div
                key={`${label.month}-${idx}`}
                className="text-xs text-muted-foreground absolute"
                style={{
                  left: label.weekIndex * (cellSize + gap),
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          {/* Calendar body */}
          <div className="flex gap-[2px] mt-4">
            {/* Day labels */}
            {!isMobile && (
              <div className="flex flex-col justify-between mr-1" style={{ height: 7 * (cellSize + gap) - gap }}>
                {dayLabels.filter((_, i) => i % 2 === 1).map(day => (
                  <div key={day} className="text-[10px] text-muted-foreground h-[12px] flex items-center">
                    {day}
                  </div>
                ))}
              </div>
            )}

            {/* Week columns */}
            <TooltipProvider delayDuration={100}>
              <div className="flex gap-[2px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[2px]">
                    {week.map((day, dayIndex) => (
                      <DayCell
                        key={`${weekIndex}-${dayIndex}`}
                        day={day}
                        size={cellSize}
                        color={heatmapColors[day.level]}
                        onClick={() => {
                          if (day.date && onDayClick) {
                            const dayEntries = entries.filter(
                              e => new Date(e.timestamp).toISOString().split('T')[0] === day.date
                            )
                            onDayClick(day.date, dayEntries)
                          }
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-[2px]">
              {([0, 1, 2, 3, 4] as const).map(level => (
                <div
                  key={level}
                  className="rounded-sm"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: heatmapColors[level],
                  }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DayCellProps {
  day: HeatmapDay
  size: number
  color: string
  onClick: () => void
}

function DayCell({ day, size, color, onClick }: DayCellProps) {
  if (!day.date) {
    return (
      <div
        className="rounded-sm"
        style={{
          width: size,
          height: size,
          backgroundColor: 'transparent',
        }}
      />
    )
  }

  const formattedDate = new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'rounded-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary',
            day.count > 0 && 'cursor-pointer'
          )}
          style={{
            width: size,
            height: size,
            backgroundColor: color,
          }}
          onClick={onClick}
          disabled={day.count === 0}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="font-medium">{formattedDate}</div>
        {day.count > 0 ? (
          <>
            <div>{day.count} {day.count === 1 ? 'entry' : 'entries'}</div>
            <div>Avg intensity: {day.avgIntensity.toFixed(1)}/10</div>
          </>
        ) : (
          <div className="text-muted-foreground">No entries</div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
