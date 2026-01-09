import { TrackerField, TimeConfig } from '@/types/tracker-fields'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimeFieldProps {
  field: TrackerField
  value: string
  onChange: (value: string) => void
}

export function TimeField({ field, value, onChange }: TimeFieldProps) {
  const config = field.config as TimeConfig
  const use24Hour = config.use24Hour ?? false

  // Parse the stored "HH:MM" value
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '', minute: '', period: 'AM' }
    const [h, m] = timeStr.split(':')
    const hour24 = parseInt(h, 10)
    const minute = m || '00'

    if (use24Hour) {
      return { hour: h, minute, period: 'AM' }
    }

    // Convert to 12-hour format
    const period = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    return { hour: String(hour12), minute, period }
  }

  const { hour, minute, period } = parseTime(value)

  const handleChange = (newHour: string, newMinute: string, newPeriod: string) => {
    if (!newHour || !newMinute) {
      onChange('')
      return
    }

    let hour24 = parseInt(newHour, 10)

    if (!use24Hour) {
      // Convert from 12-hour to 24-hour
      if (newPeriod === 'AM' && hour24 === 12) {
        hour24 = 0
      } else if (newPeriod === 'PM' && hour24 !== 12) {
        hour24 += 12
      }
    }

    const formattedHour = String(hour24).padStart(2, '0')
    const formattedMinute = newMinute.padStart(2, '0')
    onChange(`${formattedHour}:${formattedMinute}`)
  }

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={use24Hour ? 0 : 1}
          max={use24Hour ? 23 : 12}
          placeholder={use24Hour ? 'HH' : 'H'}
          value={hour}
          onChange={(e) => handleChange(e.target.value, minute, period)}
          className="w-20"
        />
        <span className="text-muted-foreground">:</span>
        <Input
          type="number"
          min={0}
          max={59}
          placeholder="MM"
          value={minute}
          onChange={(e) => handleChange(hour, e.target.value, period)}
          className="w-20"
        />
        {!use24Hour && (
          <Select value={period} onValueChange={(p) => handleChange(hour, minute, p)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
