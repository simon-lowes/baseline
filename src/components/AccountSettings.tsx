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
import { FeedbackSection } from '@/components/settings/FeedbackSection'
import { DangerZoneSection } from '@/components/settings/DangerZoneSection'
import type { AuthUser } from '@/ports/AuthPort'
import type { Tracker } from '@/types/tracker'

interface AccountSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AuthUser | null
  trackers: Tracker[]
  onAccountDeleted: () => Promise<void>
}

export function AccountSettings({
  open,
  onOpenChange,
  user,
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
            trackers={trackers}
            userEmail={user?.email}
          />

          <Separator />

          <FeedbackSection />

          <Separator />

          <DangerZoneSection
            trackers={trackers}
            userEmail={user?.email}
            onAccountDeleted={onAccountDeleted}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
