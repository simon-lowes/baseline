import { lazy, Suspense } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AuthForm } from '@/components/AuthForm'
import { useSupabaseAuth } from '@/hooks/useAuth'

// Lazy load everything that isn't needed for the main auth form
const AppContent = lazy(() => import('./AppContent'))
const AuthConfirm = lazy(() =>
  import('@/components/AuthConfirm').then(m => ({ default: m.AuthConfirm }))
)
const ResetPassword = lazy(() =>
  import('@/components/ResetPassword').then(m => ({ default: m.ResetPassword }))
)

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-muted-foreground gap-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span>Loading...</span>
    </div>
  )
}

/**
 * Main App Component
 * Thin auth shell - loads heavy authenticated content lazily
 */
function App() {
  const authState = useSupabaseAuth();

  // Handle /auth/confirm route for PKCE magic link verification
  if (globalThis.location.pathname === '/auth/confirm') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Toaster />
        <AuthConfirm
          onReturnToApp={() => {
            globalThis.location.href = '/'
          }}
        />
      </Suspense>
    )
  }

  // Handle /reset-password route for password reset flow
  if (globalThis.location.pathname === '/reset-password') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Toaster />
        <ResetPassword
          onReturnToApp={() => {
            globalThis.location.href = '/'
          }}
        />
      </Suspense>
    )
  }

  // Show loading while validating auth
  if (authState.isLoading) {
    return <LoadingSpinner />
  }

  // Show auth form if not signed in - this is the critical path for Lighthouse
  if (!authState.user) {
    return (
      <>
        <Toaster />
        <AuthForm />
      </>
    )
  }

  // User is authenticated - lazy load the full app experience
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppContent authState={authState} />
    </Suspense>
  )
}

export default App
