/**
 * Profile Section
 *
 * Displays and allows editing of user profile information.
 * - Email (read-only)
 * - Display name (optional, editable)
 * - Change password (triggers email)
 */

import { useState, useEffect } from 'react'
import { Check, Loader2, Pencil, X, Mail, User } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabaseClient } from '@/adapters/supabase/supabaseClient'
import type { AuthUser } from '@/ports/AuthPort'

interface ProfileSectionProps {
  user: AuthUser | null
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [currentDisplayName, setCurrentDisplayName] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Load profile data on mount
  useEffect(() => {
    if (!user || currentDisplayName !== null) return

    const loadProfile = async () => {
      setIsLoadingProfile(true)
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          setCurrentDisplayName(data.display_name || '')
          setDisplayName(data.display_name || '')
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfile()
  }, [user, currentDisplayName])

  const handleSaveDisplayName = async () => {
    if (!user) return

    setIsSavingName(true)
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ display_name: displayName.trim() || null })
        .eq('id', user.id)

      if (error) throw error

      setCurrentDisplayName(displayName.trim() || '')
      setIsEditingName(false)
      toast.success('Display name saved')
    } catch (err) {
      console.error('Failed to update display name:', err)
      toast.error('Could not save display name')
    } finally {
      setIsSavingName(false)
    }
  }

  const handleCancelEdit = () => {
    setDisplayName(currentDisplayName || '')
    setIsEditingName(false)
  }

  const handleResetPassword = async () => {
    if (!user?.email) return

    setIsResettingPassword(true)
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      toast.success('Password reset email sent')
    } catch (err) {
      console.error('Failed to send reset email:', err)
      toast.error('Could not send password reset email')
    } finally {
      setIsResettingPassword(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center text-muted-foreground py-4">
        Not signed in
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Profile
      </h3>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4" />
          Email
        </Label>
        <div className="flex items-center gap-2">
          <Input
            value={user.email || ''}
            disabled
            className="bg-muted/50"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Email cannot be changed
        </p>
      </div>

      {/* Display Name (optional, editable) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          Display Name
          <span className="text-xs font-normal">(optional)</span>
        </Label>

        {isLoadingProfile ? (
          <div className="flex items-center gap-2 h-10 px-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveDisplayName()
                if (e.key === 'Escape') handleCancelEdit()
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveDisplayName}
              disabled={isSavingName}
            >
              {isSavingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={isSavingName}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-sm border rounded-md bg-background min-h-10 flex items-center">
              {currentDisplayName || (
                <span className="text-muted-foreground">Not set</span>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditingName(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="pt-2">
        <Button
          variant="outline"
          onClick={handleResetPassword}
          disabled={isResettingPassword}
          className="w-full sm:w-auto"
        >
          {isResettingPassword ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Change Password'
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          A password reset link will be sent to your email
        </p>
      </div>
    </div>
  )
}
