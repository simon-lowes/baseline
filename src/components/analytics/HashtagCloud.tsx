/**
 * Hashtag Cloud Component
 * 
 * Displays hashtags as a weighted tag cloud.
 * Size and opacity scale based on frequency.
 */

import { useMemo } from 'react'
import { getHashtagFrequency } from '@/lib/analytics-utils'
import type { PainEntry } from '@/types/pain-entry'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface HashtagCloudProps {
  entries: PainEntry[]
  onTagClick?: (hashtag: string) => void
  maxTags?: number
}

export function HashtagCloud({
  entries,
  onTagClick,
  maxTags = 20,
}: HashtagCloudProps) {
  const hashtags = useMemo(() => {
    const freq = getHashtagFrequency(entries)
    return freq.slice(0, maxTags)
  }, [entries, maxTags])

  if (hashtags.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100px] text-muted-foreground">
        No hashtags recorded yet
      </div>
    )
  }

  // Calculate size scale based on count
  const maxCount = Math.max(...hashtags.map(h => h.count))
  const minCount = Math.min(...hashtags.map(h => h.count))
  const range = maxCount - minCount || 1

  return (
    <div className="flex flex-wrap gap-2 justify-center p-4">
      {hashtags.map((tag, index) => {
        // Scale from 0-1 based on frequency
        const scale = (tag.count - minCount) / range
        // Map to size classes: sm, default, lg
        const sizeClass = scale < 0.33 ? 'text-xs' : scale < 0.66 ? 'text-sm' : 'text-base'
        // Map to opacity
        const opacity = 0.6 + (scale * 0.4)
        
        return (
          <Badge
            key={tag.name}
            variant="secondary"
            className={cn(
              sizeClass,
              'cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors',
              onTagClick && 'hover:scale-105'
            )}
            style={{ opacity }}
            onClick={() => onTagClick?.(tag.name.replace('#', ''))}
          >
            {tag.name}
            <span className="ml-1 opacity-60">({tag.count})</span>
          </Badge>
        )
      })}
    </div>
  )
}
