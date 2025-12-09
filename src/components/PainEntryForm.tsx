import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { X, Check } from '@phosphor-icons/react'
import { BODY_LOCATIONS, COMMON_TRIGGERS, type BodyLocation } from '@/types/pain-entry'
import { getPainColor, getPainLabel } from '@/lib/pain-utils'

interface PainEntryFormProps {
  onSubmit: (data: {
    intensity: number
    locations: string[]
    notes: string
    triggers: string[]
  }) => void
  onCancel: () => void
}

export function PainEntryForm({ onSubmit, onCancel }: PainEntryFormProps) {
  const [intensity, setIntensity] = useState([5])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([])

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

  const handleSubmit = () => {
    if (selectedLocations.length === 0) {
      return
    }

    onSubmit({
      intensity: intensity[0],
      locations: selectedLocations,
      notes,
      triggers: selectedTriggers,
    })
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Log Pain Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Pain Intensity: {intensity[0]} - {getPainLabel(intensity[0])}
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
                ['--slider-color' as string]: getPainColor(intensity[0]),
              }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground px-2">
            <span>1 - Minimal</span>
            <span>10 - Extreme</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">
            Location(s) {selectedLocations.length === 0 && <span className="text-accent">*</span>}
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BODY_LOCATIONS.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                variant={selectedLocations.includes(value) ? 'default' : 'outline'}
                className={`justify-start ${
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
          <Label className="text-base font-medium">Possible Triggers (Optional)</Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_TRIGGERS.map(trigger => (
              <Badge
                key={trigger}
                variant={selectedTriggers.includes(trigger) ? 'default' : 'outline'}
                className={`cursor-pointer transition-all ${
                  selectedTriggers.includes(trigger)
                    ? 'bg-secondary text-secondary-foreground'
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
            Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Describe your pain, what you were doing, how you're feeling..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={selectedLocations.length === 0}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Save Entry
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
