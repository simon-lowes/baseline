/**
 * Convex Auth State Hook
 *
 * Uses Convex Auth hooks to provide auth state.
 * IMPORTANT: This hook can ONLY be used when inside ConvexAuthProvider.
 */

import { useCallback } from 'react';
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { setConvexAuthUser } from '@/adapters/convex';
import type { AuthUser } from '@/ports/AuthPort';
import type { UseAuthResult } from './useAuth';

/**
 * Convex auth hook - uses Convex Auth React hooks
 * Must be called within ConvexAuthProvider context
 */
export function useConvexAuthState(): UseAuthResult {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut: convexSignOut } = useAuthActions();

  // Create user object based on auth state
  const user: AuthUser | null = isAuthenticated
    ? { id: 'convex-user', email: '' }
    : null;

  // Sync to adapter for other parts of the app
  if (isAuthenticated) {
    setConvexAuthUser(user);
  } else if (!isLoading) {
    setConvexAuthUser(null);
  }

  const signOut = useCallback(async () => {
    await convexSignOut();
    setConvexAuthUser(null);
    // Clear session persistence flags
    localStorage.removeItem('baseline-remember-session');
    sessionStorage.removeItem('baseline-active-session');
  }, [convexSignOut]);

  return {
    user,
    isLoading,
    isAuthenticated,
    signOut,
  };
}
