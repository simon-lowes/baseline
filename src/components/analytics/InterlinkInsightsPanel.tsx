/**
 * Interlink Insights Panel
 *
 * Displays discovered interlink patterns between trackers.
 * Shows correlations, lag effects, and actionable insights.
 */

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Link2,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Loader2,
} from 'lucide-react'
import type { InterlinkInsight, InterlinkDataStatus } from '@/lib/interlink-utils'

interface InterlinkInsightsPanelProps {
  insights: InterlinkInsight[]
  dataStatus: InterlinkDataStatus
  isLoading?: boolean
  onInsightClick?: (insight: InterlinkInsight) => void
}

export function InterlinkInsightsPanel({
  insights,
  dataStatus,
  isLoading = false,
  onInsightClick,
}: InterlinkInsightsPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[150px] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Analyzing interlinks...</span>
      </div>
    )
  }

  // Not enough data state
  if (!dataStatus.hasEnoughData) {
    const progress = Math.min(
      (dataStatus.daysOfData / dataStatus.requiredDays) * 100,
      100
    )

    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h4 className="font-medium mb-2">Need More Data</h4>
          <p className="text-sm text-muted-foreground mb-4">
            {dataStatus.daysOfData < dataStatus.requiredDays
              ? `Track for ${dataStatus.requiredDays - dataStatus.daysOfData} more days to unlock interlink insights.`
              : 'Add another tracker to discover how they are interlinked.'}
          </p>
          <div className="max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{dataStatus.daysOfData} days collected</span>
              <span>{dataStatus.requiredDays} days needed</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // No correlations found
  if (insights.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h4 className="font-medium mb-2">No Strong Interlinks Detected</h4>
          <p className="text-sm text-muted-foreground">
            Keep tracking! Patterns may emerge as you collect more data.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show insights
  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InterlinkInsightCard
          key={insight.id}
          insight={insight}
          onClick={() => onInsightClick?.(insight)}
        />
      ))}
    </div>
  )
}

interface InterlinkInsightCardProps {
  insight: InterlinkInsight
  onClick?: () => void
}

function InterlinkInsightCard({ insight, onClick }: InterlinkInsightCardProps) {
  const { correlation } = insight
  const isPositive = correlation.direction === 'positive'
  const hasLag = correlation.lagDays > 0

  // Determine card style based on strength
  const strengthStyles = {
    strong: 'bg-primary/10 border-primary/30',
    moderate: 'bg-blue-500/10 border-blue-500/20',
    weak: 'bg-muted/50 border-muted-foreground/20',
  }

  const Icon = hasLag ? Clock : isPositive ? TrendingUp : TrendingDown

  return (
    <Card
      className={cn(
        'border transition-all cursor-pointer hover:shadow-md',
        strengthStyles[correlation.strength],
        onClick && 'hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              'p-2 rounded-full shrink-0',
              correlation.strength === 'strong' && 'bg-primary/20',
              correlation.strength === 'moderate' && 'bg-blue-500/20',
              correlation.strength === 'weak' && 'bg-muted'
            )}
          >
            <Icon
              className={cn(
                'w-4 h-4',
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
              )}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">{insight.title}</h4>
              <div className="flex gap-1.5">
                {/* Lag badge */}
                {hasLag && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {correlation.lagDays === 1
                      ? 'Next day'
                      : `${correlation.lagDays}-day delay`}
                  </Badge>
                )}
                {/* Strength badge */}
                <Badge
                  variant={correlation.strength === 'strong' ? 'default' : 'secondary'}
                  className="text-xs px-1.5 py-0"
                >
                  {Math.round(Math.abs(correlation.correlation) * 100)}%
                </Badge>
              </div>
            </div>

            <p className="text-xs mt-1.5 text-muted-foreground">
              {insight.description}
            </p>

            {insight.actionable && (
              <p className="text-xs mt-2 text-primary/80 font-medium">
                {insight.actionable}
              </p>
            )}

            {/* Tracker info */}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{correlation.tracker1.trackerName}</span>
              <Link2 className="h-3 w-3" />
              <span>{correlation.tracker2.trackerName}</span>
              <span className="ml-auto">
                {correlation.sampleSize} data points
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
