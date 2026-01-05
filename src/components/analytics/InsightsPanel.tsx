/**
 * Insights Panel
 * 
 * Displays AI-generated insights about user's tracking patterns.
 * Shows trends, streaks, correlations, and anomalies.
 */

import { useMemo } from 'react'
import { generateInsights, type InsightPattern } from '@/lib/analytics-utils'
import type { PainEntry } from '@/types/pain-entry'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Flame,
  AlertTriangle,
  Lightbulb,
  Calendar,
  Target,
} from 'lucide-react'

interface InsightsPanelProps {
  entries: PainEntry[]
  onInsightClick?: (insight: InsightPattern) => void
}

export function InsightsPanel({
  entries,
  onInsightClick,
}: InsightsPanelProps) {
  const insights = useMemo(() => {
    return generateInsights(entries)
  }, [entries])

  if (insights.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100px] text-muted-foreground">
        No insights available yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <InsightCard
          key={`${insight.type}-${index}`}
          insight={insight}
          onClick={() => onInsightClick?.(insight)}
        />
      ))}
    </div>
  )
}

interface InsightCardProps {
  insight: InsightPattern
  onClick?: () => void
}

function InsightCard({ insight, onClick }: InsightCardProps) {
  const Icon = getInsightIcon(insight.type, insight.severity)
  
  const severityStyles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
    success: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
  }

  return (
    <Card
      className={cn(
        'border transition-colors cursor-pointer hover:shadow-md',
        severityStyles[insight.severity],
        onClick && 'hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-full shrink-0',
            insight.severity === 'info' && 'bg-blue-500/20',
            insight.severity === 'warning' && 'bg-amber-500/20',
            insight.severity === 'success' && 'bg-green-500/20',
          )}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            <p className="text-xs mt-1 opacity-80">{insight.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getInsightIcon(type: InsightPattern['type'], severity: InsightPattern['severity']) {
  switch (type) {
    case 'trend':
      return severity === 'success' ? TrendingDown : TrendingUp
    case 'streak':
      return Flame
    case 'correlation':
      return Target
    case 'anomaly':
      return AlertTriangle
    case 'peak':
      return Calendar
    default:
      return Lightbulb
  }
}
