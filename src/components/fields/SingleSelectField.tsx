import { TrackerField, SingleSelectConfig } from '@/types/tracker-fields'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface SingleSelectFieldProps {
  field: TrackerField
  value: string
  onChange: (value: string) => void
}

export function SingleSelectField({ field, value, onChange }: SingleSelectFieldProps) {
  const config = field.config as SingleSelectConfig

  return (
    <div className="space-y-3">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <RadioGroup value={value} onValueChange={onChange}>
        {config.options.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <RadioGroupItem value={option} id={`${field.id}-${option}`} />
            <Label
              htmlFor={`${field.id}-${option}`}
              className="font-normal cursor-pointer"
            >
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
