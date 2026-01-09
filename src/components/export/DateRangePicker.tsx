import { useState } from 'react'
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { DateRange as DayPickerRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DateRange, DateRangePreset } from '@/types/export'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

function getPresetRange(preset: DateRangePreset, minDate?: Date): DateRange {
  const now = new Date()
  const end = endOfDay(now)

  switch (preset) {
    case '7d':
      return { start: startOfDay(subDays(now, 7)), end }
    case '30d':
      return { start: startOfDay(subDays(now, 30)), end }
    case '90d':
      return { start: startOfDay(subDays(now, 90)), end }
    case '1y':
      return { start: startOfDay(subYears(now, 1)), end }
    case 'all':
      return { start: minDate || startOfDay(subYears(now, 10)), end }
    case 'custom':
    default:
      return { start: startOfDay(subDays(now, 30)), end }
  }
}

function detectPreset(range: DateRange): DateRangePreset {
  const now = new Date()
  const diffDays = Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 8 && diffDays >= 6) return '7d'
  if (diffDays <= 31 && diffDays >= 29) return '30d'
  if (diffDays <= 91 && diffDays >= 89) return '90d'
  if (diffDays <= 366 && diffDays >= 364) return '1y'

  return 'custom'
}

export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(() =>
    detectPreset(value)
  )

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset)
    if (preset !== 'custom') {
      onChange(getPresetRange(preset, minDate))
    }
  }

  const handleCalendarSelect = (range: DayPickerRange | undefined) => {
    if (range?.from) {
      const newRange: DateRange = {
        start: startOfDay(range.from),
        end: range.to ? endOfDay(range.to) : endOfDay(range.from),
      }
      onChange(newRange)
      setSelectedPreset('custom')
    }
  }

  const formattedRange = `${format(value.start, 'MMM d, yyyy')} - ${format(value.end, 'MMM d, yyyy')}`

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPreset === 'custom' && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !value && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formattedRange}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={value.start}
              selected={{ from: value.start, to: value.end }}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              disabled={(date) => {
                if (maxDate && date > maxDate) return true
                if (minDate && date < minDate) return true
                return date > new Date()
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      {selectedPreset !== 'custom' && (
        <p className="text-sm text-muted-foreground">{formattedRange}</p>
      )}
    </div>
  )
}
