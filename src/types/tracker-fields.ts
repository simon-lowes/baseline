export type FieldType = 'number_scale' | 'single_select' | 'multi_select' | 'text' | 'toggle'

export interface NumberScaleConfig {
  type: 'number_scale'
  min: number
  max: number
  step: number
  labels?: string[]
}

export interface SingleSelectConfig {
  type: 'single_select'
  options: string[]
}

export interface MultiSelectConfig {
  type: 'multi_select'
  options: string[]
}

export interface TextConfig {
  type: 'text'
  multiline: boolean
  placeholder?: string
}

export interface ToggleConfig {
  type: 'toggle'
  onLabel?: string
  offLabel?: string
}

export type FieldConfig = NumberScaleConfig | SingleSelectConfig | MultiSelectConfig | TextConfig | ToggleConfig

export interface TrackerField {
  id: string
  type: FieldType
  label: string
  required: boolean
  order: number
  config: FieldConfig
}

export type FieldValues = Record<string, number | string | string[] | boolean>
