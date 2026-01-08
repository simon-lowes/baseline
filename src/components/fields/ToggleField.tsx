import { TrackerField, ToggleConfig } from '@/types/tracker-fields'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface ToggleFieldProps {
  field: TrackerField
  value: boolean
  onChange: (value: boolean) => void
}

export function ToggleField({ field, value, onChange }: ToggleFieldProps) {
  const config = field.config as ToggleConfig
  const displayLabel = value
    ? (config.onLabel || 'Yes')
    : (config.offLabel || 'No')

  return (
    <div className="flex items-center justify-between space-x-2">
      <Label htmlFor={field.id} className="flex-1">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">{displayLabel}</span>
        <Switch
          id={field.id}
          checked={value}
          onCheckedChange={onChange}
        />
      </div>
    </div>
  )
}
