import { TrackerField, EmojiConfig } from '@/types/tracker-fields'
import { Label } from '@/components/ui/label'

interface EmojiFieldProps {
  field: TrackerField
  value: string
  onChange: (value: string) => void
}

export function EmojiField({ field, value, onChange }: EmojiFieldProps) {
  const config = field.config as EmojiConfig
  const options = config.options || []

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex flex-wrap gap-2">
        {options.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(value === emoji ? '' : emoji)}
            className={`text-3xl p-2 rounded-lg transition-all ${
              value === emoji
                ? 'bg-primary/20 ring-2 ring-primary scale-110'
                : 'bg-muted hover:bg-muted/80 hover:scale-105'
            }`}
            aria-pressed={value === emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-sm text-muted-foreground">
          Selected: {value}
        </p>
      )}
    </div>
  )
}
