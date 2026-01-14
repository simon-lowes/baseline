/**
 * Universal Auth Hook
 *
 * Provides consistent auth state interface regardless of backend (Supabase or Convex).
 * Components should use this hook instead of directly accessing auth providers.
 *
 * This hook uses the active backend setting to determine which auth system to use.
 * For Convex mode, you must use useConvexAuthState hook instead (called from ConvexAuthBridge).
 */

import { useState, useEffect, useCallback } from 'react';
import { auth, activeBackend } from '@/runtime/appRuntime';
import type { AuthUser } from '@/ports/AuthPort';

export interface UseAuthResult {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

/**
 * Supabase auth hook - works with imperative API
 */
export function useSupabaseAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check "remember me" preference
        const rememberSession = localStorage.getItem('baseline-remember-session');
        const activeSession = sessionStorage.getItem('baseline-active-session');

        // If user didn't check "remember me" and browser was closed, sign them out
        // (sessionStorage gets cleared when browser closes)
        if (!rememberSession && !activeSession) {
          // For now, be permissive - don't force sign out legacy users
          console.log('[useAuth] No session preference flags found');
        }

        const session = await Promise.race([
          auth.getSession(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);

        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('[useAuth] Session check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void checkSession();

    // Subscribe to auth state changes
    const { unsubscribe } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    // Clear session persistence flags
    localStorage.removeItem('baseline-remember-session');
    sessionStorage.removeItem('baseline-active-session');
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
  };
}

/**
 * Get the active backend type
 */
export function getActiveBackend() {
  return activeBackend;
}
