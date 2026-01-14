/**
 * Danger Zone Section
 *
 * Warning section for destructive actions like account deletion.
 * Following UX best practices: clear warnings, distinct visual styling, confirmation required.
 */

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'

interface DangerZoneSectionProps {
  entries: PainEntry[]
  trackers: Tracker[]
  userEmail?: string
  onAccountDeleted: () => Promise<void>
}

export function DangerZoneSection({
  entries,
  trackers,
  userEmail,
  onAccountDeleted,
}: DangerZoneSectionProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-destructive">
        Danger Zone
      </h3>

      {/* Warning box */}
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-medium text-destructive">
                Permanently delete your account
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                This will delete all your trackers, entries, and personal data.
                This action cannot be undone.
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        entries={entries}
        trackers={trackers}
        userEmail={userEmail}
        onAccountDeleted={onAccountDeleted}
      />
    </div>
  )
}
