# Phase 3 Implementation: Custom Tracker Builder

## Context
I'm building a tracking app called "Baseline" (like a pain/mood diary). Phase 3 needs completion - adding custom field support to trackers.

## Current State
- Trackers currently use a FIXED schema: intensity (1-10), locations[], triggers[], notes, hashtags
- AI generates config with options but NOT custom fields
- Need to add flexible field system where AI suggests fields and users can accept/customize/skip

## Implementation Plan (18 tasks)

### Task 1: Create field type system
Create `src/types/tracker-fields.ts`:
```typescript
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
```

### Task 2: Database migration for schema_version
Create `supabase/migrations/20260108_001_add_schema_version.sql`:
- Add `schema_version INTEGER DEFAULT 1` to `trackers` table
- Version 1 = legacy fixed schema, Version 2 = new fields[] array

### Task 3: Database migration for field_values
Create `supabase/migrations/20260108_002_add_field_values.sql`:
- Add `field_values JSONB DEFAULT '{}'` to `tracker_entries` table
- Update RLS policies to include new column

### Task 4: Create ToggleField component
Create `src/components/fields/ToggleField.tsx`:
- Yes/No switch using shadcn Switch component
- Props: field (TrackerField), value (boolean), onChange
- Support custom on/off labels from config

### Task 5: Create SingleSelectField component
Create `src/components/fields/SingleSelectField.tsx`:
- Radio button group using shadcn RadioGroup
- Props: field (TrackerField), value (string), onChange
- Render options from field.config.options

### Task 6: Create DynamicFieldForm component
Create `src/components/fields/DynamicFieldForm.tsx`:
- Takes `fields: TrackerField[]` and `values: FieldValues`
- Maps over fields and renders appropriate component per type
- Handles onChange for all field types
- Use existing components where possible (Slider for number_scale, etc.)

### Task 7: Install @dnd-kit and create FieldList
Run: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
Create `src/components/fields/FieldList.tsx`:
- Sortable list of TrackerField items
- Drag handle on each item
- Shows field label, type badge, required indicator
- Edit and Delete buttons per field

### Task 8: Create FieldConfigPanel component
Create `src/components/fields/FieldConfigPanel.tsx`:
- Dialog/sheet for editing a single field
- Dynamic form based on field type
- For selects: add/remove/reorder options
- For number_scale: min/max/step inputs
- Label, required toggle for all types

### Task 9: Create FieldSuggestionCard component
Create `src/components/fields/FieldSuggestionCard.tsx`:
- Shows AI-suggested field with preview
- Three buttons: Accept (checkmark), Customize (pencil), Skip (X)
- Shows field type, label, and reasoning from AI

### Task 10: Create generate-tracker-fields edge function
Create `supabase/functions/generate-tracker-fields/index.ts`:
- Input: tracker_name, context, previous_suggestions (to avoid repeats)
- Output: Array of 3-5 TrackerField suggestions
- Use Gemini to generate contextually appropriate fields
- Include "reasoning" for each suggestion

### Task 11: Create validate-tracker-fields edge function
Create `supabase/functions/validate-tracker-fields/index.ts`:
- Input: fields[] array
- Validates types, sanitizes input, enforces max 20 fields
- Returns validated fields or error

### Task 12: Create use-field-suggestions hook
Create `src/hooks/use-field-suggestions.ts`:
- Manages AI suggestion state machine
- Tracks: current suggestion, accepted fields, skipped suggestions
- Methods: acceptField, customizeField, skipField, addCustomField
- Calls edge function for new suggestions

### Task 13: Create FieldChangeWarning component
Create `src/components/fields/FieldChangeWarning.tsx`:
- Warning dialog shown when editing existing tracker fields
- Plain language: "Changing fields may affect your data..."
- Expandable "Learn more" with details
- Cancel and Continue buttons

### Task 14: Create EditTrackerDialog component
Create `src/components/tracker/EditTrackerDialog.tsx`:
- Opens from tracker settings menu
- Shows FieldList with drag-to-reorder
- Shows FieldChangeWarning on open
- Add Field button opens FieldConfigPanel
- Save applies changes to tracker.generated_config.fields

### Task 15: Integrate field builder into TrackerCreationWizard
Update tracker creation flow (find existing wizard component):
- After name/disambiguation step, add field suggestion step
- Use FieldSuggestionCard in a loop
- Show FieldList below with accepted fields
- Allow reordering before final save
- Set schema_version = 2 for new trackers

### Task 16: Update PainEntryForm for schema branching
Update `src/components/PainEntryForm.tsx`:
- Check tracker.schema_version
- If 1: render existing fixed form (backward compat)
- If 2: render DynamicFieldForm with tracker.generated_config.fields

### Task 17: Add Edit Fields to TrackerCard
Find TrackerCard component and add:
- Settings/gear icon menu
- "Edit Fields" option that opens EditTrackerDialog
- Only show for schema_version = 2 trackers

### Task 18: Build and test
- Run `npm run build` to check for errors
- Test creating new tracker with field suggestions
- Test editing existing v2 tracker
- Verify v1 legacy trackers still work

## Important Notes
- Use existing shadcn/ui components where possible
- Check existing code patterns in src/components/ for styling consistency
- Run build after each major component to catch errors early
- Backward compatibility is critical - don't break existing trackers

Start with Task 1. After each task, briefly confirm what you did and move to the next.
