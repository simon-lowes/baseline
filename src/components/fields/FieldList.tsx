import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TrackerField } from '@/types/tracker-fields'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'

interface FieldListProps {
  fields: TrackerField[]
  onReorder: (fields: TrackerField[]) => void
  onEdit: (field: TrackerField) => void
  onDelete: (fieldId: string) => void
}

export function FieldList({ fields, onReorder, onEdit, onDelete }: FieldListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)

      const reorderedFields = arrayMove(fields, oldIndex, newIndex)
      // Update order property
      const updatedFields = reorderedFields.map((field, index) => ({
        ...field,
        order: index,
      }))
      onReorder(updatedFields)
    }
  }

  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sortedFields.map((field) => (
            <SortableFieldItem
              key={field.id}
              field={field}
              onEdit={() => onEdit(field)}
              onDelete={() => onDelete(field.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

interface SortableFieldItemProps {
  field: TrackerField
  onEdit: () => void
  onDelete: () => void
}

function SortableFieldItem({ field, onEdit, onDelete }: SortableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      number_scale: 'Scale',
      single_select: 'Single',
      multi_select: 'Multiple',
      text: 'Text',
      toggle: 'Toggle',
    }
    return labels[type] || type
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-card border rounded-lg"
    >
      <button
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.label}</span>
          <Badge variant="secondary" className="text-xs">
            {getFieldTypeLabel(field.type)}
          </Badge>
          {field.required && (
            <Badge variant="outline" className="text-xs">
              Required
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
