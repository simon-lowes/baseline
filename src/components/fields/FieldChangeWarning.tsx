import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

interface FieldChangeWarningProps {
  open: boolean
  onCancel: () => void
  onContinue: () => void
}

export function FieldChangeWarning({ open, onCancel, onContinue }: FieldChangeWarningProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertDialogTitle>Edit Tracker Fields</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              Changing fields may affect your existing data. Fields you remove will no longer appear in new entries, but historical data will be preserved.
            </p>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full justify-between px-0 h-auto font-normal"
            >
              <span className="text-muted-foreground">Learn more</span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showDetails && (
              <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                <p className="font-medium">What happens when you:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Add fields:</strong> New entries will include the new field. Existing entries won't be affected.
                  </li>
                  <li>
                    <strong>Edit fields:</strong> Changes apply to new entries only. Past entries remain unchanged.
                  </li>
                  <li>
                    <strong>Remove fields:</strong> The field disappears from the form, but historical data is preserved in the database.
                  </li>
                  <li>
                    <strong>Reorder fields:</strong> Only affects the display order in the form.
                  </li>
                </ul>
                <p className="text-muted-foreground mt-2">
                  Your historical tracking data is always safe and never deleted.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>Continue Editing</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
