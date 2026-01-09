import { TrackerField, DurationConfig } from '@/types/tracker-fields'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface DurationFieldProps {
  field: TrackerField
  value: number
  onChange: (value: number) => void
}

export function DurationField({ field, value, onChange }: DurationFieldProps) {
  const config = field.config as DurationConfig
  const showSeconds = config.showSeconds ?? false

  // Convert total seconds to hours, minutes, seconds
  const totalSeconds = value || 0
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const handleChange = (newHours: number, newMinutes: number, newSeconds: number) => {
    const total = newHours * 3600 + newMinutes * 60 + newSeconds
    onChange(total)
  }

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={99}
            value={hours || ''}
            onChange={(e) => handleChange(parseInt(e.target.value) || 0, minutes, seconds)}
            className="w-16"
            placeholder="0"
          />
          <span className="text-sm text-muted-foreground">h</span>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={59}
            value={minutes || ''}
            onChange={(e) => handleChange(hours, parseInt(e.target.value) || 0, seconds)}
            className="w-16"
            placeholder="0"
          />
          <span className="text-sm text-muted-foreground">m</span>
        </div>
        {showSeconds && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={59}
              value={seconds || ''}
              onChange={(e) => handleChange(hours, minutes, parseInt(e.target.value) || 0)}
              className="w-16"
              placeholder="0"
            />
            <span className="text-sm text-muted-foreground">s</span>
          </div>
        )}
      </div>
      {(hours > 0 || minutes > 0 || seconds > 0) && (
        <p className="text-xs text-muted-foreground">
          Total: {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m ` : ''}{showSeconds && seconds > 0 ? `${seconds}s` : ''}
        </p>
      )}
    </div>
  )
}
