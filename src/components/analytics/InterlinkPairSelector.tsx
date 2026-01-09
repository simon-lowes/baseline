/**
 * Interlink Pair Selector
 *
 * Allows users to manually select tracker pairs to analyze.
 * Shows auto-detected pairs as suggestions.
 */

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X, Sparkles, Link2 } from 'lucide-react'
import type { TrackerPair, TrackerFieldInfo, InterlinkCorrelation } from '@/lib/interlink-utils'
import { getSuggestedPairs } from '@/hooks/use-interlink-data'

interface InterlinkPairSelectorProps {
  availableFields: TrackerFieldInfo[]
  selectedPairs: TrackerPair[]
  suggestedCorrelations?: InterlinkCorrelation[]
  onPairsChange: (pairs: TrackerPair[]) => void
  maxPairs?: number
}

export function InterlinkPairSelector({
  availableFields,
  selectedPairs,
  suggestedCorrelations = [],
  onPairsChange,
  maxPairs = 5,
}: InterlinkPairSelectorProps) {
  const [newPair, setNewPair] = useState<Partial<TrackerPair>>({})

  // Get suggested pairs from correlations
  const suggestedPairs = useMemo(
    () => getSuggestedPairs(suggestedCorrelations, 3),
    [suggestedCorrelations]
  )

  // Group fields by tracker for easier selection
  const fieldsByTracker = useMemo(() => {
    const map = new Map<string, TrackerFieldInfo[]>()
    for (const field of availableFields) {
      const existing = map.get(field.trackerId) ?? []
      existing.push(field)
      map.set(field.trackerId, existing)
    }
    return map
  }, [availableFields])

  // Get unique trackers
  const trackers = useMemo(() => {
    const seen = new Map<string, string>()
    for (const field of availableFields) {
      if (!seen.has(field.trackerId)) {
        seen.set(field.trackerId, field.trackerName)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [availableFields])

  // Check if a pair is already selected
  const isPairSelected = (pair: TrackerPair) => {
    return selectedPairs.some(
      (p) =>
        (p.tracker1Id === pair.tracker1Id &&
          p.field1Id === pair.field1Id &&
          p.tracker2Id === pair.tracker2Id &&
          p.field2Id === pair.field2Id) ||
        (p.tracker1Id === pair.tracker2Id &&
          p.field1Id === pair.field2Id &&
          p.tracker2Id === pair.tracker1Id &&
          p.field2Id === pair.field1Id)
    )
  }

  // Add a new pair
  const handleAddPair = () => {
    if (
      newPair.tracker1Id &&
      newPair.field1Id &&
      newPair.tracker2Id &&
      newPair.field2Id
    ) {
      const pair = newPair as TrackerPair
      if (!isPairSelected(pair)) {
        onPairsChange([...selectedPairs, pair])
      }
      setNewPair({})
    }
  }

  // Add a suggested pair
  const handleAddSuggested = (pair: TrackerPair) => {
    if (!isPairSelected(pair) && selectedPairs.length < maxPairs) {
      onPairsChange([...selectedPairs, pair])
    }
  }

  // Remove a pair
  const handleRemovePair = (index: number) => {
    onPairsChange(selectedPairs.filter((_, i) => i !== index))
  }

  // Get available fields for tracker 2 (exclude same tracker as tracker 1)
  const tracker2Options = useMemo(() => {
    return trackers.filter((t) => t.id !== newPair.tracker1Id)
  }, [trackers, newPair.tracker1Id])

  // Get field label helper
  const getFieldLabel = (trackerId: string, fieldId: string) => {
    const field = availableFields.find(
      (f) => f.trackerId === trackerId && f.fieldId === fieldId
    )
    return field?.fieldLabel ?? fieldId
  }

  const getTrackerName = (trackerId: string) => {
    return trackers.find((t) => t.id === trackerId)?.name ?? trackerId
  }

  return (
    <div className="space-y-4">
      {/* Suggested pairs */}
      {suggestedPairs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggested Pairs
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedPairs.map((pair, idx) => {
              const isSelected = isPairSelected(pair)
              return (
                <Badge
                  key={idx}
                  variant={isSelected ? 'secondary' : 'outline'}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => !isSelected && handleAddSuggested(pair)}
                >
                  {getTrackerName(pair.tracker1Id)} ({getFieldLabel(pair.tracker1Id, pair.field1Id)})
                  <Link2 className="h-3 w-3 mx-1" />
                  {getTrackerName(pair.tracker2Id)} ({getFieldLabel(pair.tracker2Id, pair.field2Id)})
                  {!isSelected && <Plus className="h-3 w-3 ml-1" />}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected pairs */}
      {selectedPairs.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Selected Pairs</div>
          <div className="space-y-2">
            {selectedPairs.map((pair, idx) => (
              <Card key={idx} className="bg-muted/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {getTrackerName(pair.tracker1Id)}
                    </span>
                    <span className="text-muted-foreground">
                      ({getFieldLabel(pair.tracker1Id, pair.field1Id)})
                    </span>
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {getTrackerName(pair.tracker2Id)}
                    </span>
                    <span className="text-muted-foreground">
                      ({getFieldLabel(pair.tracker2Id, pair.field2Id)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemovePair(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add new pair */}
      {selectedPairs.length < maxPairs && trackers.length >= 2 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-3">Add Custom Pair</div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Tracker 1 */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Tracker 1
                </label>
                <Select
                  value={newPair.tracker1Id ?? ''}
                  onValueChange={(value) =>
                    setNewPair({ ...newPair, tracker1Id: value, field1Id: undefined })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trackers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 1 */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Field 1
                </label>
                <Select
                  value={newPair.field1Id ?? ''}
                  onValueChange={(value) =>
                    setNewPair({ ...newPair, field1Id: value })
                  }
                  disabled={!newPair.tracker1Id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(fieldsByTracker.get(newPair.tracker1Id ?? '') ?? []).map(
                      (f) => (
                        <SelectItem key={f.fieldId} value={f.fieldId}>
                          {f.fieldLabel}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tracker 2 */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Tracker 2
                </label>
                <Select
                  value={newPair.tracker2Id ?? ''}
                  onValueChange={(value) =>
                    setNewPair({ ...newPair, tracker2Id: value, field2Id: undefined })
                  }
                  disabled={!newPair.tracker1Id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tracker2Options.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 2 */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Field 2
                </label>
                <Select
                  value={newPair.field2Id ?? ''}
                  onValueChange={(value) =>
                    setNewPair({ ...newPair, field2Id: value })
                  }
                  disabled={!newPair.tracker2Id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(fieldsByTracker.get(newPair.tracker2Id ?? '') ?? []).map(
                      (f) => (
                        <SelectItem key={f.fieldId} value={f.fieldId}>
                          {f.fieldLabel}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="mt-4 w-full sm:w-auto"
              size="sm"
              onClick={handleAddPair}
              disabled={
                !newPair.tracker1Id ||
                !newPair.field1Id ||
                !newPair.tracker2Id ||
                !newPair.field2Id
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Pair
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Limit message */}
      {selectedPairs.length >= maxPairs && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum {maxPairs} pairs. Remove a pair to add more.
        </p>
      )}

      {/* Not enough trackers */}
      {trackers.length < 2 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Link2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Create at least 2 trackers with numeric fields to compare them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
