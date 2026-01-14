/**
 * Delete Account Dialog
 *
 * Multi-step confirmation flow for account deletion (GDPR Article 17 compliant).
 * Steps:
 * 1. Warning - Show consequences of deletion
 * 2. Export offer - Give user chance to download data first
 * 3. Confirm - Type "DELETE" to confirm
 * 4. Processing - Show deletion progress
 * 5. Complete - Confirm deletion and redirect
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Download,
  FileJson,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { auth } from '@/runtime/appRuntime'
import { downloadFile } from '@/lib/export/csv-export'
import type { PainEntry } from '@/types/pain-entry'
import type { Tracker } from '@/types/tracker'

type Step = 'warning' | 'export' | 'confirm' | 'processing' | 'complete' | 'error'

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: PainEntry[]
  trackers: Tracker[]
  userEmail?: string
  onAccountDeleted: () => Promise<void>
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  entries,
  trackers,
  userEmail,
  onAccountDeleted,
}: DeleteAccountDialogProps) {
  const [step, setStep] = useState<Step>('warning')
  const [confirmText, setConfirmText] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('warning')
      setConfirmText('')
      setProgress(0)
      setErrorMessage('')
    }
  }, [open])

  const handleExportData = () => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0',
        user: { email: userEmail || null },
        trackers: trackers.map((t) => ({
          id: t.id,
          name: t.name,
          icon: t.icon,
          color: t.color,
          type: t.type,
          presetId: t.preset_id,
          isDefault: t.is_default,
          config: t.generated_config,
          userDescription: t.user_description,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })),
        entries: entries.map((e) => ({
          id: e.id,
          trackerId: e.tracker_id,
          timestamp: e.timestamp,
          intensity: e.intensity,
          locations: e.locations,
          triggers: e.triggers,
          notes: e.notes,
          hashtags: e.hashtags,
          fieldValues: e.field_values,
        })),
      }

      const json = JSON.stringify(exportData, null, 2)
      const filename = `baseline-final-export-${format(new Date(), 'yyyy-MM-dd')}.json`
      downloadFile(json, filename, 'application/json;charset=utf-8;')

      toast.success('Data exported')

      // Move to confirm step
      setStep('confirm')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Could not export data')
    }
  }

  const handleDeleteAccount = async () => {
    setStep('processing')
    setProgress(10)

    try {
      // Simulate progress for UX
      setProgress(30)
      await new Promise((r) => setTimeout(r, 500))

      setProgress(50)
      const { error } = await auth.deleteAccount()

      if (error) {
        throw error
      }

      setProgress(80)
      await new Promise((r) => setTimeout(r, 300))

      setProgress(100)
      setStep('complete')

      // Wait a moment then trigger the callback
      await new Promise((r) => setTimeout(r, 1500))
      onOpenChange(false)
      await onAccountDeleted()
    } catch (err) {
      console.error('Account deletion failed:', err)
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      setStep('error')
    }
  }

  const isConfirmValid = confirmText.toUpperCase() === 'DELETE'

  return (
    <Dialog open={open} onOpenChange={step === 'processing' ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Step 1: Warning */}
        {step === 'warning' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <DialogTitle>Delete Your Account?</DialogTitle>
              </div>
              <DialogDescription>
                This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Deleting your account will permanently remove:
              </p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Trash2 className="h-4 w-4 mt-0.5 text-destructive" />
                  <span>
                    <strong className="text-foreground">{trackers.length}</strong>{' '}
                    {trackers.length === 1 ? 'tracker' : 'trackers'} and all their settings
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Trash2 className="h-4 w-4 mt-0.5 text-destructive" />
                  <span>
                    <strong className="text-foreground">{entries.length}</strong>{' '}
                    {entries.length === 1 ? 'entry' : 'entries'} and all recorded data
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Trash2 className="h-4 w-4 mt-0.5 text-destructive" />
                  <span>Your profile and account credentials</span>
                </li>
              </ul>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => setStep('export')}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Export offer */}
        {step === 'export' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                <DialogTitle>Download Your Data First?</DialogTitle>
              </div>
              <DialogDescription>
                You can export all your data before deleting your account.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                We recommend downloading a copy of your data. Once your account is
                deleted, this data cannot be recovered.
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleExportData}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Download All Data (JSON)
              </Button>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('warning')}>
                Back
              </Button>
              <Button variant="destructive" onClick={() => setStep('confirm')}>
                Skip & Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <DialogTitle>Confirm Deletion</DialogTitle>
              </div>
              <DialogDescription>
                This is your final confirmation.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Type <strong>DELETE</strong> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('export')}>
                Back
              </Button>
              <Button
                variant="destructive"
                disabled={!isConfirmValid}
                onClick={handleDeleteAccount}
              >
                Delete My Account
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Processing */}
        {step === 'processing' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <DialogTitle>Deleting Account...</DialogTitle>
              </div>
              <DialogDescription>
                Please wait while we delete your data.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress < 50
                  ? 'Preparing deletion...'
                  : progress < 80
                  ? 'Removing your data...'
                  : 'Finalizing...'}
              </p>
            </div>
          </>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <DialogTitle>Account Deleted</DialogTitle>
              </div>
            </DialogHeader>

            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Your account and all associated data have been permanently deleted.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Thank you for using Baseline.
              </p>
            </div>
          </>
        )}

        {/* Error state */}
        {step === 'error' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <DialogTitle>Deletion Failed</DialogTitle>
              </div>
              <DialogDescription>
                We couldn't delete your account.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Please try again. If the problem persists, contact support.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={() => setStep('confirm')}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
