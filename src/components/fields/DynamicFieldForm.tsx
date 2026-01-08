import { useState } from 'react'
import { TrackerField, FieldValues, NumberScaleConfig, MultiSelectConfig, TextConfig } from '@/types/tracker-fields'
import { ToggleField } from './ToggleField'
import { SingleSelectField } from './SingleSelectField'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

interface DynamicFieldFormProps {
  fields: TrackerField[]
  values: FieldValues
  onChange: (values: FieldValues) => void
}

export function DynamicFieldForm({ fields, values, onChange }: DynamicFieldFormProps) {
  const handleFieldChange = (fieldId: string, value: any) => {
    onChange({
      ...values,
      [fieldId]: value,
    })
  }

  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {sortedFields.map((field) => (
        <div key={field.id}>
          {field.type === 'number_scale' && (
            <NumberScaleField
              field={field}
              value={values[field.id] as number}
              onChange={(value) => handleFieldChange(field.id, value)}
            />
          )}
          {field.type === 'single_select' && (
            <SingleSelectField
              field={field}
              value={(values[field.id] as string) || ''}
              onChange={(value) => handleFieldChange(field.id, value)}
            />
          )}
          {field.type === 'multi_select' && (
            <MultiSelectField
              field={field}
              value={(values[field.id] as string[]) || []}
              onChange={(value) => handleFieldChange(field.id, value)}
            />
          )}
          {field.type === 'text' && (
            <TextField
              field={field}
              value={(values[field.id] as string) || ''}
              onChange={(value) => handleFieldChange(field.id, value)}
            />
          )}
          {field.type === 'toggle' && (
            <ToggleField
              field={field}
              value={(values[field.id] as boolean) || false}
              onChange={(value) => handleFieldChange(field.id, value)}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Number Scale Field Component
function NumberScaleField({
  field,
  value,
  onChange,
}: {
  field: TrackerField
  value: number
  onChange: (value: number) => void
}) {
  const config = field.config as NumberScaleConfig
  const currentValue = value || config.min

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <span className="text-sm font-medium">{currentValue}</span>
      </div>
      <Slider
        min={config.min}
        max={config.max}
        step={config.step}
        value={[currentValue]}
        onValueChange={(vals) => onChange(vals[0])}
      />
      {config.labels && config.labels.length > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {config.labels.map((label, idx) => (
            <span key={idx}>{label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// Multi Select Field Component
function MultiSelectField({
  field,
  value,
  onChange,
}: {
  field: TrackerField
  value: string[]
  onChange: (value: string[]) => void
}) {
  const config = field.config as MultiSelectConfig

  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <div className="space-y-3">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="space-y-2">
        {config.options.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <Checkbox
              id={`${field.id}-${option}`}
              checked={value.includes(option)}
              onCheckedChange={() => handleToggle(option)}
            />
            <Label
              htmlFor={`${field.id}-${option}`}
              className="font-normal cursor-pointer"
            >
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}

// Text Field Component
function TextField({
  field,
  value,
  onChange,
}: {
  field: TrackerField
  value: string
  onChange: (value: string) => void
}) {
  const config = field.config as TextConfig

  return (
    <div className="space-y-3">
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {config.multiline ? (
        <Textarea
          id={field.id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          rows={4}
        />
      ) : (
        <Input
          id={field.id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
        />
      )}
    </div>
  )
}
