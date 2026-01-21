/**
 * Auth Expired Dialog
 *
 * Shown when a user clicks an expired or already-used magic link.
 * Provides clear explanation and recovery options.
 *
 * Common causes:
 * - Email client pre-fetched the link (security scanners)
 * - User clicked the link twice
 * - Link expired (1 hour default)
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { auth } from '@/runtime/appRuntime'
import { EnvelopeSimple, ArrowRight, Warning } from '@phosphor-icons/react'

interface AuthExpiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillEmail?: string | null
  onSignInClick?: () => void
}

export function AuthExpiredDialog({
  open,
  onOpenChange,
  prefillEmail,
  onSignInClick,
}: AuthExpiredDialogProps) {
  const [email, setEmail] = useState(prefillEmail || '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleRequestNewLink = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setSending(true)
    try {
      const result = await auth.signInWithMagicLink({
        email: email.trim(),
        redirectTo: `${window.location.origin}/auth/confirm`,
      })

      if (result.error) {
        toast.error(result.error.message || 'Could not send magic link')
        return
      }

      setSent(true)
      toast.success('New magic link sent! Check your email.')
    } catch {
      toast.error('Could not send magic link. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleSignInClick = () => {
    onOpenChange(false)
    onSignInClick?.()
  }

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSent(false)
      setSending(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warning className="h-5 w-5 text-amber-500" weight="fill" />
            Link Expired
          </DialogTitle>
          <DialogDescription className="text-left">
            This sign-in link has already been used or has expired.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Explanation */}
          <p className="text-sm text-muted-foreground">
            This can happen if your email app previewed the link, or if you clicked it more than once.
            Magic links can only be used once for security.
          </p>

          {sent ? (
            /* Success state */
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                ✓ New link sent!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Check your email for the new sign-in link. It will expire in 1 hour.
              </p>
            </div>
          ) : (
            /* Request new link form */
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestNewLink()}
                />
              </div>
              <Button
                onClick={handleRequestNewLink}
                disabled={sending}
                className="w-full gap-2"
              >
                <EnvelopeSimple size={18} />
                {sending ? 'Sending...' : 'Send me a new link'}
              </Button>
            </div>
          )}

          {/* Alternative: sign in with password */}
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              onClick={handleSignInClick}
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
            >
              Sign in with password instead
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
