/**
 * Auth Confirm Component
 *
 * Landing page for PKCE-based magic link authentication.
 * This page receives the token_hash from the email link and exchanges it for a session.
 *
 * Why PKCE?
 * - Traditional magic links embed a one-time token directly in the URL
 * - Email security scanners "click" links to check for malware, consuming the token
 * - PKCE uses a token_hash that requires JavaScript to exchange via verifyOtp()
 * - Pre-fetchers load the page but don't execute JS → token stays valid for the real user
 *
 * URL format: /auth/confirm?token_hash=xxx&type=magiclink
 */

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/adapters/supabase/supabaseClient'
import { auth } from '@/runtime/appRuntime'
import { Spinner, CheckCircle, XCircle, EnvelopeSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

type AuthConfirmStatus = 'loading' | 'success' | 'error'
type OtpType = 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'email'

interface AuthConfirmProps {
  /** Called when user wants to request a new link */
  onRequestNewLink?: () => void
  /** Called when user wants to return to the main app */
  onReturnToApp?: () => void
}

export function AuthConfirm({ onRequestNewLink, onReturnToApp }: AuthConfirmProps) {
  const [status, setStatus] = useState<AuthConfirmStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const verifyToken = async () => {
      // Extract params from URL
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const type = params.get('type') as OtpType | null

      // Also check hash params (some Supabase versions use hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hashTokenHash = hashParams.get('token_hash')
      const hashType = hashParams.get('type') as OtpType | null

      const finalTokenHash = tokenHash || hashTokenHash
      const finalType = type || hashType

      if (!finalTokenHash) {
        setStatus('error')
        setErrorMessage('Invalid link - missing verification code')
        return
      }

      // Default to magiclink if type not specified
      const otpType: OtpType = finalType || 'magiclink'

      try {
        // Exchange token_hash for session
        const { data, error } = await supabaseClient.auth.verifyOtp({
          token_hash: finalTokenHash,
          type: otpType,
        })

        if (error) {
          setStatus('error')
          // Provide user-friendly error messages
          if (error.message.includes('expired') || error.message.includes('invalid')) {
            setErrorMessage('This link has expired or was already used. Please request a new one.')
          } else {
            setErrorMessage(error.message)
          }
          return
        }

        if (data.session) {
          setStatus('success')

          // Ensure default tracker exists for new users
          const accessToken = data.session.access_token
          if (accessToken) {
            void auth.ensureDefaultTracker?.(accessToken)
          }

          // Brief success message, then redirect
          setTimeout(() => {
            // Clean the URL and redirect to main app
            window.location.href = '/'
          }, 1500)
        } else {
          // No session returned - unusual case
          setStatus('error')
          setErrorMessage('Verification succeeded but no session was created. Please try signing in.')
        }
      } catch (err) {
        setStatus('error')
        setErrorMessage('An unexpected error occurred. Please try again.')
        console.error('[AuthConfirm] Verification error:', err)
      }
    }

    verifyToken()
  }, [])

  const handleReturnToApp = () => {
    if (onReturnToApp) {
      onReturnToApp()
    } else {
      window.location.href = '/'
    }
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
          {status === 'loading' && (
            <>
              <Spinner className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Signing you in...</p>
                <p className="text-sm text-muted-foreground">Just a moment</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" weight="fill" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">You&apos;re signed in!</p>
                <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" weight="fill" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Unable to sign in</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>

              <div className="space-y-2 pt-4">
                {onRequestNewLink && (
                  <Button onClick={onRequestNewLink} className="w-full gap-2">
                    <EnvelopeSimple size={18} />
                    Request a new link
                  </Button>
                )}
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
            Having trouble? Try requesting a new sign-in link from the app.
          </p>
        )}
      </div>
    </div>
  )
}
