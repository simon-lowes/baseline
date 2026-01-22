/**
 * Reset Password Component
 *
 * Landing page for password reset flow using PKCE tokens.
 * This page receives the token_hash from the email link, verifies it,
 * and presents a form to set a new password.
 *
 * URL format: /reset-password?token_hash=xxx&type=recovery
 */

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/adapters/supabase/supabaseClient'
import { Spinner, CheckCircle, XCircle, LockKey } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ResetStatus = 'verifying' | 'ready' | 'updating' | 'success' | 'error'

interface ResetPasswordProps {
  /** Called when user wants to return to the main app */
  onReturnToApp?: () => void
}

export function ResetPassword({ onReturnToApp }: ResetPasswordProps) {
  const [status, setStatus] = useState<ResetStatus>('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    const verifyToken = async () => {
      // Extract params from URL
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const type = params.get('type')

      // Also check hash params (some Supabase versions use hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hashTokenHash = hashParams.get('token_hash')
      const hashType = hashParams.get('type')

      const finalTokenHash = tokenHash || hashTokenHash
      const finalType = type || hashType

      if (!finalTokenHash) {
        setStatus('error')
        setErrorMessage('Invalid reset link - missing verification code')
        return
      }

      // Verify this is a recovery type
      if (finalType !== 'recovery') {
        setStatus('error')
        setErrorMessage('Invalid reset link - wrong link type')
        return
      }

      try {
        // Exchange token_hash for session (this establishes a recovery session)
        const { data, error } = await supabaseClient.auth.verifyOtp({
          token_hash: finalTokenHash,
          type: 'recovery',
        })

        if (error) {
          setStatus('error')
          if (error.message.includes('expired') || error.message.includes('invalid')) {
            setErrorMessage('This reset link has expired or was already used. Please request a new one.')
          } else {
            setErrorMessage(error.message)
          }
          return
        }

        if (data.session) {
          // Token verified, user has a recovery session - show password form
          setStatus('ready')
          // Clean the URL
          window.history.replaceState(null, '', '/reset-password')
        } else {
          setStatus('error')
          setErrorMessage('Verification succeeded but no session was created. Please try again.')
        }
      } catch (err) {
        setStatus('error')
        setErrorMessage('An unexpected error occurred. Please try again.')
        console.error('[ResetPassword] Verification error:', err)
      }
    }

    verifyToken()
  }, [])

  const handlePasswordUpdate = async () => {
    // Validate passwords
    setValidationError('')

    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }

    setStatus('updating')

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        setStatus('ready')
        setValidationError(error.message)
        return
      }

      setStatus('success')

      // Redirect to app after brief success message
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (err) {
      setStatus('ready')
      setValidationError('Failed to update password. Please try again.')
      console.error('[ResetPassword] Update error:', err)
    }
  }

  const handleReturnToApp = () => {
    if (onReturnToApp) {
      onReturnToApp()
    } else {
      window.location.href = '/'
    }
  }

  const handleRequestNewLink = () => {
    // Go to sign in page where they can request a new reset
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo/Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Baseline</h1>
          <p className="text-muted-foreground">Know your baseline, spot the changes</p>
        </div>

        {/* Status card */}
        <div className="bg-card border rounded-lg p-8 shadow-sm space-y-4">
          {status === 'verifying' && (
            <>
              <Spinner className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Verifying your link...</p>
                <p className="text-sm text-muted-foreground">Just a moment</p>
              </div>
            </>
          )}

          {status === 'ready' && (
            <>
              <LockKey className="h-12 w-12 text-primary mx-auto" weight="duotone" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Reset your password</p>
                <p className="text-sm text-muted-foreground">Enter your new password below</p>
              </div>

              <div className="space-y-4 pt-2 text-left">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordUpdate()}
                  />
                </div>

                {validationError && (
                  <p className="text-sm text-destructive">{validationError}</p>
                )}

                <Button onClick={handlePasswordUpdate} className="w-full">
                  Update password
                </Button>
              </div>
            </>
          )}

          {status === 'updating' && (
            <>
              <Spinner className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Updating your password...</p>
                <p className="text-sm text-muted-foreground">Almost there</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" weight="fill" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Password updated!</p>
                <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" weight="fill" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Unable to reset password</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>

              <div className="space-y-2 pt-4">
                <Button onClick={handleRequestNewLink} className="w-full">
                  Request a new reset link
                </Button>
                <Button variant="outline" onClick={handleReturnToApp} className="w-full">
                  Return to sign in
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Help text */}
        {status === 'error' && (
          <p className="text-xs text-muted-foreground">
            Having trouble? Go back to sign in and use "Forgot password" to request a new link.
          </p>
        )}
      </div>
    </div>
  )
}
