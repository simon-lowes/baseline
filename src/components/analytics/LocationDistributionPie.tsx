/**
 * Location Distribution Pie Chart
 * 
 * Shows distribution of entries by body location.
 * Supports interactive tooltips and click filtering.
 */

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { getLocationDistribution, type CategoryCount } from '@/lib/analytics-utils'
import type { PainEntry } from '@/types/pain-entry'

interface LocationDistributionPieProps {
  entries: PainEntry[]
  onSliceClick?: (location: string) => void
  maxSlices?: number
  height?: number
}

/**
 * Get theme-aware color palette for pie slices
 * Uses getComputedStyle to read resolved oklch values at runtime
 */
function getPieColors(): { colors: string[]; background: string } {
  const styles = getComputedStyle(document.documentElement)
  return {
    colors: [
      styles.getPropertyValue('--primary').trim(),
      styles.getPropertyValue('--chart-2').trim(),
      styles.getPropertyValue('--chart-3').trim(),
      styles.getPropertyValue('--chart-4').trim(),
      styles.getPropertyValue('--chart-5').trim(),
      styles.getPropertyValue('--chart-1').trim(),
      styles.getPropertyValue('--accent').trim(),
      styles.getPropertyValue('--muted-foreground').trim(),
    ],
    background: styles.getPropertyValue('--background').trim(),
  }
}

export function LocationDistributionPie({
  entries,
  onSliceClick,
  maxSlices = 8,
  height = 300,
}: LocationDistributionPieProps) {
  const { distribution, chartConfig, colors, backgroundColor } = useMemo(() => {
    const dist = getLocationDistribution(entries)
    const pieColorData = getPieColors()
    const pieColors = pieColorData.colors
    
    // Limit slices and group remainder as "Other"
    let processedDist: CategoryCount[]
    if (dist.length > maxSlices) {
      const top = dist.slice(0, maxSlices - 1)
      const others = dist.slice(maxSlices - 1)
      const otherCount = others.reduce((sum, item) => sum + item.count, 0)
      const totalCount = dist.reduce((sum, item) => sum + item.count, 0)
      
      processedDist = [
        ...top,
        {
          name: 'Other',
          count: otherCount,
          percentage: Math.round((otherCount / totalCount) * 100),
        },
      ]
    } else {
      processedDist = dist
    }
    
    // Build chart config dynamically
    const config: ChartConfig = {}
    processedDist.forEach((item, idx) => {
      const key = item.name.toLowerCase().replace(/\s+/g, '-')
      config[key] = {
        label: item.name,
        color: pieColors[idx % pieColors.length],
      }
    })
    
    return { 
      distribution: processedDist, 
      chartConfig: config, 
      colors: pieColors,
      backgroundColor: pieColorData.background,
    }
  }, [entries, maxSlices])

  if (distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No location data to display
      </div>
    )
  }

  const chartData = distribution.map((item, idx) => ({
    name: item.name,
    value: item.count,
    percentage: item.percentage,
    fill: colors[idx % colors.length],
  }))

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, item) => {
                const data = item.payload
                return [
                  `${value} entries (${data.percentage}%)`,
                  data.name,
                ]
              }}
              hideIndicator={false}
            />
          }
        />
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          onClick={(data) => {
            if (onSliceClick && data.name !== 'Other') {
              onSliceClick(data.name.toLowerCase().replace(/\s+/g, '-'))
            }
          }}
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill}
              stroke={backgroundColor}
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          iconSize={8}
          formatter={(value, entry) => (
            <span className="text-sm text-foreground ml-1">{value}</span>
          )}
        />
      </PieChart>
    </ChartContainer>
  )
}
