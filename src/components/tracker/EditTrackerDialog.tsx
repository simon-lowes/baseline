import { useState, useEffect } from 'react'
import { Tracker } from '@/types/tracker'
import { TrackerField } from '@/types/tracker-fields'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldList } from '@/components/fields/FieldList'
import { FieldConfigPanel } from '@/components/fields/FieldConfigPanel'
import { FieldChangeWarning } from '@/components/fields/FieldChangeWarning'
import { Plus } from 'lucide-react'

interface EditTrackerDialogProps {
  tracker: Tracker | null
  open: boolean
  onClose: () => void
  onSave: (fields: TrackerField[]) => void
}

export function EditTrackerDialog({ tracker, open, onClose, onSave }: EditTrackerDialogProps) {
  const [fields, setFields] = useState<TrackerField[]>([])
  const [showWarning, setShowWarning] = useState(false)
  const [warningShown, setWarningShown] = useState(false)
  const [editingField, setEditingField] = useState<TrackerField | null>(null)
  const [showFieldPanel, setShowFieldPanel] = useState(false)

  useEffect(() => {
    if (tracker && open) {
      // Load fields from tracker.generated_config.fields
      const existingFields = (tracker.generated_config as any)?.fields || []
      setFields(existingFields)

      // Show warning on first open
      if (!warningShown) {
        setShowWarning(true)
      }
    }
  }, [tracker, open])

  const handleWarningContinue = () => {
    setShowWarning(false)
    setWarningShown(true)
  }

  const handleWarningCancel = () => {
    setShowWarning(false)
    onClose()
  }

  const handleAddField = () => {
    setEditingField(null)
    setShowFieldPanel(true)
  }

  const handleEditField = (field: TrackerField) => {
    setEditingField(field)
    setShowFieldPanel(true)
  }

  const handleSaveField = (field: TrackerField) => {
    if (editingField) {
      // Update existing field
      setFields((prev) =>
        prev.map((f) => (f.id === field.id ? field : f))
      )
    } else {
      // Add new field
      const newField = {
        ...field,
        order: fields.length,
      }
      setFields((prev) => [...prev, newField])
    }
    setShowFieldPanel(false)
  }

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId))
  }

  const handleReorderFields = (reorderedFields: TrackerField[]) => {
    setFields(reorderedFields)
  }

  const handleSave = () => {
    onSave(fields)
    onClose()
  }

  if (!tracker) return null

  return (
    <>
      <FieldChangeWarning
        open={showWarning}
        onCancel={handleWarningCancel}
        onContinue={handleWarningContinue}
      />

      <Dialog open={open && !showWarning} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Fields: {tracker.name}</DialogTitle>
            <DialogDescription>
              Customize the fields that appear when tracking {tracker.name.toLowerCase()}.
              Drag to reorder fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {fields.length > 0 ? (
              <FieldList
                fields={fields}
                onReorder={handleReorderFields}
                onEdit={handleEditField}
                onDelete={handleDeleteField}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No fields yet. Add your first field to get started.
              </div>
            )}

            <Button onClick={handleAddField} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <FieldConfigPanel
        field={editingField}
        open={showFieldPanel}
        onClose={() => setShowFieldPanel(false)}
        onSave={handleSaveField}
      />
    </>
  )
}
