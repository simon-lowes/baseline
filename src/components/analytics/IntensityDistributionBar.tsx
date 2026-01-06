/**
 * Intensity Distribution Chart
 * 
 * Shows histogram of intensity values (1-10).
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { getIntensityDistribution, getIntensityColor } from '@/lib/analytics-utils'
import type { PainEntry } from '@/types/pain-entry'

interface IntensityDistributionBarProps {
  entries: PainEntry[]
  height?: number
}

/**
 * Get theme-aware chart colors using getComputedStyle
 */
function getChartColors() {
  const styles = getComputedStyle(document.documentElement)
  return {
    primary: styles.getPropertyValue('--primary').trim() || 'oklch(0.65 0.12 200)',
  }
}

export function IntensityDistributionBar({
  entries,
  height = 200,
}: IntensityDistributionBarProps) {
  // Get resolved theme colors
  const chartColors = useMemo(() => getChartColors(), [])
  
  const chartConfig = useMemo(() => ({
    count: {
      label: 'Count',
      color: chartColors.primary,
    },
  } satisfies ChartConfig), [chartColors])

  const distribution = useMemo(() => {
    return getIntensityDistribution(entries)
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[150px] text-muted-foreground">
        No data to display
      </div>
    )
  }

  const chartData = distribution.map(item => ({
    intensity: item.name,
    count: item.count,
    percentage: item.percentage,
    fill: getIntensityColor(parseInt(item.name)),
  }))

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis
          dataKey="intensity"
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs fill-muted-foreground"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => {
                const data = item.payload
                return [`${value} entries (${data.percentage}%)`, `Intensity ${data.intensity}`]
              }}
            />
          }
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
