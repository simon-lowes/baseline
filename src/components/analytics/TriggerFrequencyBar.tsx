/**
 * Trigger Frequency Bar Chart
 * 
 * Shows frequency distribution of triggers.
 * Supports horizontal and vertical layouts with interactive tooltips.
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
import { getTriggerFrequency } from '@/lib/analytics-utils'
import type { PainEntry } from '@/types/pain-entry'
import { useIsMobile } from '@/hooks/use-mobile'
import { useThemeAwareColors } from '@/hooks/use-theme-colors'

interface TriggerFrequencyBarProps {
  entries: PainEntry[]
  onBarClick?: (trigger: string) => void
  maxBars?: number
  height?: number
}

export function TriggerFrequencyBar({
  entries,
  onBarClick,
  maxBars = 10,
  height = 300,
}: TriggerFrequencyBarProps) {
  const isMobile = useIsMobile()
  // Get theme-aware colors that update reactively when theme changes
  const { chartColors } = useThemeAwareColors()
  
  // Chart config uses the reactive primary color from the hook
  // The color is read fresh on each render/remount
  const chartConfig = useMemo(() => ({
    count: {
      label: 'Count',
      color: chartColors.primary,
    },
  } satisfies ChartConfig), [chartColors.primary])
  
  const distribution = useMemo(() => {
    const dist = getTriggerFrequency(entries)
    return dist.slice(0, maxBars)
  }, [entries, maxBars])

  if (distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No trigger data to display
      </div>
    )
  }

  const chartData = distribution.map(item => ({
    name: item.name,
    count: item.count,
    percentage: item.percentage,
    shortName: truncateName(item.name, isMobile ? 10 : 15),
  }))

  // Use horizontal layout on mobile for better label visibility
  if (isMobile) {
    return (
      <ChartContainer config={chartConfig} className="w-full" style={{ height: Math.max(height, chartData.length * 40) }}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
          <XAxis 
            type="number"
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="shortName"
            tickLine={false}
            axisLine={false}
            width={100}
            className="text-xs fill-muted-foreground"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  const data = item.payload
                  return [`${value} entries (${data.percentage}%)`, data.name]
                }}
              />
            }
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            onClick={(data) => data.name && onBarClick?.(data.name)}
            className="cursor-pointer"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={chartColors.primary}
                fillOpacity={0.8 + (index * 0.02)}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -10, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis
          dataKey="shortName"
          tickLine={false}
          axisLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
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
                return [`${value} entries (${data.percentage}%)`, data.name]
              }}
            />
          }
        />
        <Bar
          dataKey="count"
          radius={[4, 4, 0, 0]}
          onClick={(data) => data.name && onBarClick?.(data.name)}
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={chartColors.primary}
              fillOpacity={0.8 + (index * 0.02)}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name
  return name.slice(0, maxLength - 1) + '…'
}
