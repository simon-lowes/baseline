/**
 * Intensity Trend Line Chart
 * 
 * Displays intensity trends over time with optional moving average.
 * Supports interactive tooltips and click-through to specific entries.
 */

import { useMemo, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { getIntensityTrend, getMovingAverage } from '@/lib/analytics-utils'
import { getLocalDateString, formatChartDate, formatDateFull } from '@/lib/date-utils'
import type { PainEntry } from '@/types/pain-entry'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface IntensityTrendLineProps {
  entries: PainEntry[]
  days?: number | null
  onPointClick?: (date: string, entries: PainEntry[]) => void
  showMovingAverage?: boolean
  height?: number
}

/**
 * Get theme-aware chart colors using getComputedStyle
 */
function getChartColors() {
  const styles = getComputedStyle(document.documentElement)
  return {
    primary: styles.getPropertyValue('--primary').trim() || 'oklch(0.65 0.12 200)',
    mutedForeground: styles.getPropertyValue('--muted-foreground').trim() || 'oklch(0.50 0.01 260)',
    background: styles.getPropertyValue('--background').trim() || 'oklch(0.97 0.01 80)',
  }
}

export function IntensityTrendLine({
  entries,
  days = 30,
  onPointClick,
  showMovingAverage: initialShowMA = true,
  height = 300,
}: IntensityTrendLineProps) {
  const [showMA, setShowMA] = useState(initialShowMA)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Get resolved theme colors - recompute when theme changes
  const chartColors = useMemo(() => {
    if (!mounted) return getChartColors()
    return getChartColors()
  }, [resolvedTheme, mounted])
  
  const chartConfig = useMemo(() => ({
    intensity: {
      label: 'Avg Intensity',
      color: chartColors.primary,
    },
    movingAvg: {
      label: '7-day Average',
      color: chartColors.mutedForeground,
    },
  } satisfies ChartConfig), [chartColors])

  const { trendData, movingAvgData, avgIntensity } = useMemo(() => {
    const trend = getIntensityTrend(entries, days)
    const ma = getMovingAverage(trend, 7)
    const avg = trend.length > 0 
      ? trend.reduce((sum, p) => sum + p.value, 0) / trend.length 
      : 0
    
    return {
      trendData: trend,
      movingAvgData: ma,
      avgIntensity: Math.round(avg * 10) / 10,
    }
  }, [entries, days])

  // Merge data for dual line display
  const chartData = useMemo(() => {
    return trendData.map((point, idx) => ({
      date: point.date,
      intensity: point.value,
      movingAvg: movingAvgData[idx]?.value ?? point.value,
      label: point.label,
      displayDate: formatDateLabel(point.date),
    }))
  }, [trendData, movingAvgData])

  if (trendData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data to display
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Overall average: <span className="font-medium text-foreground">{avgIntensity}/10</span>
        </div>
        {trendData.length >= 7 && (
          <div className="flex items-center gap-2">
            <Switch
              id="show-ma"
              checked={showMA}
              onCheckedChange={setShowMA}
              className="scale-90"
            />
            <Label htmlFor="show-ma" className="text-sm cursor-pointer">
              Show trend line
            </Label>
          </div>
        )}
      </div>
      
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          onClick={(data: any) => {
            if (data?.activePayload?.[0]?.payload && onPointClick) {
              const date = data.activePayload[0].payload.date
              const dayEntries = entries.filter(
                e => getLocalDateString(e.timestamp) === date
              )
              onPointClick(date, dayEntries)
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="displayDate"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={30}
            className="text-xs fill-muted-foreground"
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs fill-muted-foreground"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  if (name === 'intensity') return [`${value}/10`, 'Daily Avg']
                  if (name === 'movingAvg') return [`${value}/10`, '7-day Avg']
                  return [value, name]
                }}
                labelFormatter={(label) => {
                  const point = chartData.find(d => d.displayDate === label)
                  return point?.date ? formatFullDate(point.date) : label
                }}
              />
            }
          />
          <ReferenceLine
            y={avgIntensity}
            stroke={chartColors.mutedForeground}
            strokeDasharray="5 5"
            strokeOpacity={0.5}
          />
          {showMA && trendData.length >= 7 && (
            <Line
              type="monotone"
              dataKey="movingAvg"
              stroke="var(--color-movingAvg)"
              strokeWidth={2}
              dot={false}
              strokeOpacity={0.6}
            />
          )}
          <Line
            type="monotone"
            dataKey="intensity"
            stroke="var(--color-intensity)"
            strokeWidth={2}
            dot={{ fill: 'var(--color-intensity)', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: chartColors.background }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}

function formatDateLabel(dateStr: string): string {
  return formatChartDate(dateStr)
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr)
  return formatDateFull(date.getTime())
}
