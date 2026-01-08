import { useState, useEffect } from 'react'
import { TrackerField, FieldType, FieldConfig } from '@/types/tracker-fields'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus } from 'lucide-react'

interface FieldConfigPanelProps {
  field: TrackerField | null
  open: boolean
  onClose: () => void
  onSave: (field: TrackerField) => void
}

export function FieldConfigPanel({ field, open, onClose, onSave }: FieldConfigPanelProps) {
  const [label, setLabel] = useState('')
  const [required, setRequired] = useState(false)
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [config, setConfig] = useState<Partial<FieldConfig>>({})

  useEffect(() => {
    if (field) {
      setLabel(field.label)
      setRequired(field.required)
      setFieldType(field.type)
      setConfig(field.config)
    } else {
      // Reset for new field
      setLabel('')
      setRequired(false)
      setFieldType('text')
      setConfig({ type: 'text', multiline: false })
    }
  }, [field, open])

  const handleSave = () => {
    const savedField: TrackerField = {
      id: field?.id || `field-${Date.now()}`,
      label,
      required,
      type: fieldType,
      order: field?.order || 0,
      config: config as FieldConfig,
    }
    onSave(savedField)
    onClose()
  }

  const handleTypeChange = (newType: FieldType) => {
    setFieldType(newType)
    // Set default config for new type
    switch (newType) {
      case 'number_scale':
        setConfig({ type: 'number_scale', min: 1, max: 10, step: 1 })
        break
      case 'single_select':
        setConfig({ type: 'single_select', options: [] })
        break
      case 'multi_select':
        setConfig({ type: 'multi_select', options: [] })
        break
      case 'text':
        setConfig({ type: 'text', multiline: false })
        break
      case 'toggle':
        setConfig({ type: 'toggle' })
        break
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{field ? 'Edit Field' : 'Add Field'}</SheetTitle>
          <SheetDescription>
            Configure the field settings and options.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="field-label">Field Label</Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Severity, Location, Mood"
            />
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="field-required">Required Field</Label>
            <Switch
              id="field-required"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>

          {/* Field Type */}
          <div className="space-y-2">
            <Label htmlFor="field-type">Field Type</Label>
            <Select value={fieldType} onValueChange={handleTypeChange}>
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number_scale">Number Scale</SelectItem>
                <SelectItem value="single_select">Single Select</SelectItem>
                <SelectItem value="multi_select">Multiple Select</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="toggle">Toggle (Yes/No)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific config */}
          {fieldType === 'number_scale' && (
            <NumberScaleConfig config={config} setConfig={setConfig} />
          )}
          {(fieldType === 'single_select' || fieldType === 'multi_select') && (
            <SelectOptionsConfig config={config} setConfig={setConfig} />
          )}
          {fieldType === 'text' && <TextConfig config={config} setConfig={setConfig} />}
          {fieldType === 'toggle' && <ToggleConfig config={config} setConfig={setConfig} />}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!label.trim()}>
            Save Field
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Number Scale Configuration
function NumberScaleConfig({
  config,
  setConfig,
}: {
  config: Partial<FieldConfig>
  setConfig: (config: Partial<FieldConfig>) => void
}) {
  const cfg = config as { min: number; max: number; step: number; labels?: string[] }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-2">
          <Label>Min</Label>
          <Input
            type="number"
            value={cfg.min || 1}
            onChange={(e) => setConfig({ ...config, min: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max</Label>
          <Input
            type="number"
            value={cfg.max || 10}
            onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Step</Label>
          <Input
            type="number"
            value={cfg.step || 1}
            onChange={(e) => setConfig({ ...config, step: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  )
}

// Select Options Configuration
function SelectOptionsConfig({
  config,
  setConfig,
}: {
  config: Partial<FieldConfig>
  setConfig: (config: Partial<FieldConfig>) => void
}) {
  const cfg = config as { options: string[] }
  const [newOption, setNewOption] = useState('')

  const addOption = () => {
    if (newOption.trim()) {
      setConfig({ ...config, options: [...(cfg.options || []), newOption.trim()] })
      setNewOption('')
    }
  }

  const removeOption = (index: number) => {
    const updated = [...(cfg.options || [])]
    updated.splice(index, 1)
    setConfig({ ...config, options: updated })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Options</Label>
        <div className="flex gap-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
            placeholder="Add option"
          />
          <Button type="button" size="icon" onClick={addOption}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {(cfg.options || []).map((option, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
            <span className="flex-1">{option}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeOption(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Text Configuration
function TextConfig({
  config,
  setConfig,
}: {
  config: Partial<FieldConfig>
  setConfig: (config: Partial<FieldConfig>) => void
}) {
  const cfg = config as { multiline: boolean; placeholder?: string }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="multiline">Multiline Text</Label>
        <Switch
          id="multiline"
          checked={cfg.multiline || false}
          onCheckedChange={(checked) => setConfig({ ...config, multiline: checked })}
        />
      </div>
      <div className="space-y-2">
        <Label>Placeholder (optional)</Label>
        <Input
          value={cfg.placeholder || ''}
          onChange={(e) => setConfig({ ...config, placeholder: e.target.value })}
          placeholder="Enter placeholder text"
        />
      </div>
    </div>
  )
}

// Toggle Configuration
function ToggleConfig({
  config,
  setConfig,
}: {
  config: Partial<FieldConfig>
  setConfig: (config: Partial<FieldConfig>) => void
}) {
  const cfg = config as { onLabel?: string; offLabel?: string }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>On Label (optional)</Label>
        <Input
          value={cfg.onLabel || ''}
          onChange={(e) => setConfig({ ...config, onLabel: e.target.value })}
          placeholder="Yes"
        />
      </div>
      <div className="space-y-2">
        <Label>Off Label (optional)</Label>
        <Input
          value={cfg.offLabel || ''}
          onChange={(e) => setConfig({ ...config, offLabel: e.target.value })}
          placeholder="No"
        />
      </div>
    </div>
  )
}
