import { useState, useMemo, useEffect, KeyboardEvent, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { X, Check, Hash } from '@phosphor-icons/react'
import type { Tracker, TrackerPresetId } from '@/types/tracker'
import type { PainEntry } from '@/types/pain-entry'
import { getTrackerConfig } from '@/types/tracker-config'
import { DynamicFieldForm } from '@/components/fields/DynamicFieldForm'
import type { FieldValues, TrackerField } from '@/types/tracker-fields'
import { useFormDraft } from '@/hooks/useFormDraft'

/** Draft data structure for form persistence */
interface EntryDraft {
  intensity: number
  fieldValues: FieldValues
  locations: string[]
  notes: string
  triggers: string[]
  hashtags: string[]
}

interface PainEntryFormProps {
  tracker: Tracker | null
  editEntry?: PainEntry | null // If provided, we're editing
  onSubmit: (data: {
    intensity: number
    locations: string[]
    notes: string
    triggers: string[]
    hashtags: string[]
    field_values?: FieldValues
  }) => void
  onCancel: () => void
}

export function PainEntryForm({ tracker, editEntry, onSubmit, onCancel }: Readonly<PainEntryFormProps>) {
  const config = getTrackerConfig(tracker?.preset_id as TrackerPresetId | null, tracker?.generated_config)
  const isEditing = !!editEntry
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Check schema version - v2 uses custom fields
  const schemaVersion = (tracker as any)?.schema_version || 1
  const isCustomFieldsTracker = schemaVersion === 2
  const customFields: TrackerField[] = isCustomFieldsTracker
    ? ((tracker?.generated_config as any)?.fields || [])
    : []

  // Draft persistence - only for new entries (not when editing existing)
  const draftKey = tracker?.id ? `baseline-draft-entry-${tracker.id}` : null
  const defaultDraft: EntryDraft = {
    intensity: editEntry?.intensity ?? 5,
    fieldValues: (editEntry as any)?.field_values || {},
    locations: editEntry?.locations ?? [],
    notes: editEntry?.notes ?? '',
    triggers: editEntry?.triggers ?? [],
    hashtags: editEntry?.hashtags ?? [],
  }

  const { saveDraft, clearDraft, getInitialData, hadDraft } = useFormDraft<EntryDraft>(
    draftKey || 'baseline-draft-entry-temp',
    defaultDraft
  )

  // Get initial form values (from draft if exists, otherwise from editEntry or defaults)
  const initialValues = isEditing ? defaultDraft : getInitialData()

  useEffect(() => {
    setMounted(true)
  }, [])

  const [intensity, setIntensity] = useState([initialValues.intensity])

  // Custom fields state
  const [fieldValues, setFieldValues] = useState<FieldValues>(initialValues.fieldValues)

  // Compute intensity color reactively when theme changes
  const intensityColor = useMemo(() => {
    if (!mounted) return config.getIntensityColor(intensity[0])
    return config.getIntensityColor(intensity[0])
  }, [config, intensity, resolvedTheme, mounted])
  const [selectedLocations, setSelectedLocations] = useState<string[]>(initialValues.locations)
  const [notes, setNotes] = useState(initialValues.notes)
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(initialValues.triggers)
  const [hashtags, setHashtags] = useState<string[]>(initialValues.hashtags)
  const [hashtagInput, setHashtagInput] = useState('')

  // Save draft whenever form values change (for new entries only)
  useEffect(() => {
    if (!isEditing && draftKey) {
      saveDraft({
        intensity: intensity[0],
        fieldValues,
        locations: selectedLocations,
        notes,
        triggers: selectedTriggers,
        hashtags,
      })
    }
  }, [intensity, fieldValues, selectedLocations, notes, selectedTriggers, hashtags, isEditing, draftKey, saveDraft])

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    )
  }

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev =>
      prev.includes(trigger)
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    )
  }

  const addHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').trim().toLowerCase()
    if (cleanTag && !hashtags.includes(cleanTag)) {
      setHashtags(prev => [...prev, cleanTag])
    }
    setHashtagInput('')
  }

  const removeHashtag = (tag: string) => {
    setHashtags(prev => prev.filter(t => t !== tag))
  }

  const handleHashtagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addHashtag(hashtagInput)
    } else if (e.key === 'Backspace' && !hashtagInput && hashtags.length > 0) {
      // Remove last hashtag when backspace is pressed on empty input
      setHashtags(prev => prev.slice(0, -1))
    }
  }

  const handleCancel = useCallback(() => {
    // Clear draft when user explicitly cancels
    clearDraft()
    onCancel()
  }, [clearDraft, onCancel])

  const handleSubmit = () => {
    // For schema v1, require locations
    if (!isCustomFieldsTracker && selectedLocations.length === 0) {
      return
    }

    // Clear draft on successful submission
    clearDraft()

    onSubmit({
      intensity: intensity[0],
      locations: selectedLocations,
      notes,
      triggers: selectedTriggers,
      hashtags,
      field_values: isCustomFieldsTracker ? fieldValues : undefined,
    })
  }

  // Render schema v2 (custom fields) form
  if (isCustomFieldsTracker) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            {isEditing ? `Edit ${tracker?.name} Entry` : `Log ${tracker?.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DynamicFieldForm
            fields={customFields}
            values={fieldValues}
            onChange={setFieldValues}
          />

          <div className="space-y-3">
            <Label className="text-base font-medium">
              <Hash size={16} className="inline mr-1" />
              Hashtags (Optional)
            </Label>
            <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-background min-h-[42px]">
              {hashtags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pl-2 pr-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeHashtag(tag)}
                    className="hover:bg-muted rounded-full p-0.5"
                    aria-label={`Remove hashtag ${tag}`}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </Badge>
              ))}
              <Input
                type="text"
                placeholder={hashtags.length === 0 ? "Type hashtag and press Enter..." : "Add more..."}
                value={hashtagInput}
                onChange={e => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKeyDown}
                onBlur={() => hashtagInput && addHashtag(hashtagInput)}
                className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
                aria-label="Add hashtag"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter or comma to add a hashtag. Use hashtags to categorize and find entries quickly.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isEditing ? 'Save Changes' : 'Save Entry'}
            </Button>
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render schema v1 (legacy fixed fields) form
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          {isEditing ? `Edit ${config.formTitle.replace('Log ', '')}` : config.formTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">
            {config.intensityLabel}: {intensity[0]} - {config.getIntensityLabel(intensity[0])}
          </Label>
          <div className="px-2">
            <Slider
              value={intensity}
              onValueChange={setIntensity}
              min={1}
              max={10}
              step={1}
              className="w-full"
              style={{
                ['--slider-color' as string]: intensityColor,
              }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground px-2">
            <span>{config.intensityMinLabel}</span>
            <span>{config.intensityMaxLabel}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">
            {config.locationLabel} {selectedLocations.length === 0 && <span className="text-accent">*</span>}
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {config.locations.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                variant={selectedLocations.includes(value) ? 'default' : 'outline'}
                className={`w-full justify-start text-left whitespace-normal break-words h-auto min-h-9 py-2 leading-snug ${
                  selectedLocations.includes(value)
                    ? 'bg-primary text-primary-foreground'
                    : ''
                }`}
                onClick={() => toggleLocation(value)}
              >
                {selectedLocations.includes(value) && <Check className="mr-2" size={16} />}
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">{config.triggersLabel} (Optional)</Label>
          <div className="flex flex-wrap gap-2">
            {config.triggers.map(trigger => (
              <Badge
                key={trigger}
                variant={selectedTriggers.includes(trigger) ? 'default' : 'outline'}
                className={`cursor-pointer transition-all ${
                  selectedTriggers.includes(trigger)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => toggleTrigger(trigger)}
              >
                {trigger}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="notes" className="text-base font-medium">
            {config.notesLabel} (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder={config.notesPlaceholder}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            className="resize-none"
            spellCheck={true}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">
            <Hash size={16} className="inline mr-1" />
            Hashtags (Optional)
          </Label>
          <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-background min-h-[42px]">
            {hashtags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 pl-2 pr-1"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeHashtag(tag)}
                  className="hover:bg-muted rounded-full p-0.5"
                  aria-label={`Remove hashtag ${tag}`}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </Badge>
            ))}
            <Input
              type="text"
              placeholder={hashtags.length === 0 ? "Type hashtag and press Enter..." : "Add more..."}
              value={hashtagInput}
              onChange={e => setHashtagInput(e.target.value)}
              onKeyDown={handleHashtagKeyDown}
              onBlur={() => hashtagInput && addHashtag(hashtagInput)}
              className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
              aria-label="Add hashtag"
            />
          </div>

          {/* Suggested hashtags from AI-generated config */}
          {config.suggestedHashtags && config.suggestedHashtags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Suggested:</p>
              <div className="flex flex-wrap gap-2">
                {config.suggestedHashtags
                  .filter(tag => !hashtags.includes(tag))
                  .map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => addHashtag(tag)}
                    >
                      #{tag}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Press Enter or comma to add a hashtag. Use hashtags to categorize and find entries quickly.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={selectedLocations.length === 0}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isEditing ? 'Save Changes' : 'Save Entry'}
          </Button>
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
