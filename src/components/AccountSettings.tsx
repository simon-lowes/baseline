/**
 * Account Settings Dialog
 *
 * Provides user account management following web standards and GDPR best practices:
 * - Profile (email display, optional display name)
 * - Data export (full account download for GDPR Article 20)
 * - Account deletion (with warnings for GDPR Article 17)
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { DataExportSection } from '@/components/settings/DataExportSection'
import { DangerZoneSection } from '@/components/settings/DangerZoneSection'
import type { AuthUser } from '@/ports/AuthPort'
import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'

interface AccountSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AuthUser | null
  entries: PainEntry[]
  trackers: Tracker[]
  onAccountDeleted: () => Promise<void>
}

export function AccountSettings({
  open,
  onOpenChange,
  user,
  entries,
  trackers,
  onAccountDeleted,
}: AccountSettingsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <ProfileSection user={user} />

          <Separator />

          <DataExportSection
            entries={entries}
            trackers={trackers}
            userEmail={user?.email}
          />

          <Separator />

          <DangerZoneSection
            entries={entries}
            trackers={trackers}
            userEmail={user?.email}
            onAccountDeleted={onAccountDeleted}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
