/**
 * Interlink Timeline Chart
 *
 * Multi-tracker overlay visualization showing normalized values over time.
 * Supports up to 4 trackers on a single chart with theme-aware colors.
 */

import { useMemo, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link2 } from 'lucide-react'
import type { TimelineDataPoint, TrackerFieldInfo, InterlinkCorrelation } from '@/lib/interlink-utils'
import { formatChartDate, formatDateFull } from '@/lib/date-utils'

interface InterlinkTimelineChartProps {
  data: TimelineDataPoint[]
  fields: TrackerFieldInfo[]
  correlation?: InterlinkCorrelation | null
  height?: number
}

/**
 * Chart colors for up to 4 lines
 */
const LINE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
]

/**
 * Get theme-aware chart colors using getComputedStyle
 */
function getChartColors() {
  const styles = getComputedStyle(document.documentElement)
  return {
    chart1: styles.getPropertyValue('--chart-1').trim() || 'oklch(0.65 0.15 250)',
    chart2: styles.getPropertyValue('--chart-2').trim() || 'oklch(0.65 0.15 200)',
    chart3: styles.getPropertyValue('--chart-3').trim() || 'oklch(0.65 0.15 150)',
    chart4: styles.getPropertyValue('--chart-4').trim() || 'oklch(0.65 0.15 100)',
    background: styles.getPropertyValue('--background').trim() || 'oklch(0.97 0.01 80)',
  }
}

export function InterlinkTimelineChart({
  data,
  fields,
  correlation,
  height = 300,
}: InterlinkTimelineChartProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get resolved theme colors
  const chartColors = useMemo(() => {
    if (!mounted) return getChartColors()
    return getChartColors()
  }, [resolvedTheme, mounted])

  // Build chart config from fields
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    fields.forEach((field, idx) => {
      const key = `${field.trackerId}:${field.fieldId}`
      config[key] = {
        label: `${field.trackerName} - ${field.fieldLabel}`,
        color: LINE_COLORS[idx % LINE_COLORS.length],
      }
    })
    return config
  }, [fields])

  // Format data for display
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      displayDate: formatDateLabel(point.date),
    }))
  }, [data])

  // No data state
  if (data.length === 0 || fields.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h4 className="font-medium mb-2">No Timeline Data</h4>
          <p className="text-sm text-muted-foreground">
            Select tracker pairs to visualize their interlinked patterns over time.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Correlation info */}
      {correlation && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <span className="font-medium text-foreground">
            {correlation.tracker1.trackerName} ({correlation.tracker1.fieldLabel})
          </span>
          <Link2 className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {correlation.tracker2.trackerName} ({correlation.tracker2.fieldLabel})
          </span>
          <Badge variant="outline" className="ml-2">
            {Math.round(Math.abs(correlation.correlation) * 100)}% {correlation.direction}
          </Badge>
          {correlation.lagDays > 0 && (
            <Badge variant="secondary">
              {correlation.lagDays === 1 ? 'Next day' : `${correlation.lagDays}-day lag`}
            </Badge>
          )}
        </div>
      )}

      {/* Chart */}
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
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
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `${value}%`}
            className="text-xs fill-muted-foreground"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  if (value === null) return ['No data', '']
                  const field = fields.find(
                    (f) => `${f.trackerId}:${f.fieldId}` === name
                  )
                  return [
                    `${value}%`,
                    field ? `${field.trackerName} - ${field.fieldLabel}` : String(name),
                  ]
                }}
                labelFormatter={(label) => {
                  const point = chartData.find((d) => d.displayDate === label)
                  return point?.date ? formatFullDate(point.date) : label
                }}
              />
            }
          />
          <Legend
            formatter={(value) => {
              const field = fields.find(
                (f) => `${f.trackerId}:${f.fieldId}` === value
              )
              return field
                ? `${field.trackerName} - ${field.fieldLabel}`
                : value
            }}
          />

          {/* Render a line for each field */}
          {fields.map((field, idx) => {
            const key = `${field.trackerId}:${field.fieldId}`
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ fill: LINE_COLORS[idx % LINE_COLORS.length], strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: chartColors.background }}
                connectNulls={false}
              />
            )
          })}
        </LineChart>
      </ChartContainer>

      {/* Legend note */}
      <p className="text-xs text-muted-foreground text-center">
        Values normalized to 0-100% scale for comparison across different metrics
      </p>
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
