/* Supabase Auth Adapter - ensureDefaultTracker invocation committed via migration/Edge Function
   (This file was updated to call a server Edge Function post sign-in/sign-up that creates default tracker.) */

/**
 * Supabase Authentication Adapter
 * Implements AuthPort using Supabase Auth
 */

import type {
  AuthPort,
  AuthUser,
  AuthSession,
  SignUpParams,
  SignInParams,
  MagicLinkParams,
  ResetPasswordParams,
  UpdatePasswordParams,
  ResendParams,
  AuthStateChangeCallback,
} from '@/ports/AuthPort';
import { supabaseClient } from './supabaseClient';

// Store current user in memory - ONLY set after server validation
let currentUser: AuthUser | null = null;

// Track if we've completed initial server validation
let initialValidationComplete = false;
let initialValidationPromise: Promise<AuthUser | null> | null = null;
let lastValidatedUserId: string | null = null;

/**
 * Get session from local cache (fast, no network request).
 * Use this for initial render, then validate in background.
 */
async function getSessionFromCache(): Promise<AuthUser | null> {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session?.user) {
      currentUser = null;
      return null;
    }
    
    currentUser = {
      id: session.user.id,
      email: session.user.email ?? undefined,
    };
    
    return currentUser;
  } catch (error) {
    console.error('Get session from cache failed:', error);
    currentUser = null;
    return null;
  }
}

/**
 * Validate session against Supabase server (slow, makes network request).
 * This is the ONLY way to know if a user is truly authenticated.
 * Call this in background after initial render.
 */
async function validateSessionWithServer(): Promise<AuthUser | null> {
  try {
    // getUser() makes a server request to validate the JWT
    // This will fail if user was deleted, token expired, etc.
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (error || !user) {
      // Invalid session - clear everything
      currentUser = null;
      lastValidatedUserId = null;
      // Also clear Supabase's local storage to prevent stale state
      await supabaseClient.auth.signOut();
      return null;
    }
    
    currentUser = {
      id: user.id,
      email: user.email ?? undefined,
    };
    lastValidatedUserId = user.id;
    
    return currentUser;
  } catch (error) {
    console.error('Session validation failed:', error);
    currentUser = null;
    lastValidatedUserId = null;
    await supabaseClient.auth.signOut();
    return null;
  }
}

function startServerValidation(): void {
  initialValidationComplete = false;
  initialValidationPromise = validateSessionWithServer().finally(() => {
    initialValidationComplete = true;
  });
}

// Start with cached session immediately (fast, no network)
// Then kick off server validation and expose the promise so callers can await it
// Using IIFE with top-level await pattern for ES2022 compliance
void (async () => {
  try {
    // Fast path: populate cached session synchronously
    await getSessionFromCache();

    // Start server-side validation and keep the promise for anyone who wants to await it
    startServerValidation();

    // Wait for server validation to complete in the background (don't block module load)
    await initialValidationPromise;
  } finally {
    initialValidationComplete = true;
  }
})();

// Keep user in sync with auth state changes
supabaseClient.auth.onAuthStateChange((_event, session) => {
  // For SIGNED_OUT events, always clear immediately
  if (!session) {
    currentUser = null;
    lastValidatedUserId = null;
    initialValidationPromise = null;
    initialValidationComplete = false;
    return;
  }
  
  // For SIGNED_IN or TOKEN_REFRESHED, update from session directly (fast)
  if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
    currentUser = {
      id: session.user.id,
      email: session.user.email ?? undefined,
    };
    if (currentUser.id !== lastValidatedUserId) {
      startServerValidation();
    }
  }
});

export const supabaseAuth: AuthPort = {
  // Ensure a default tracker exists for the signed-in user by invoking the server-side edge function
  async ensureDefaultTracker(accessToken?: string) {
    if (!accessToken) return;
    try {
      const { error } = await supabaseClient.functions.invoke('create-default-tracker', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.warn('[ensureDefaultTracker] edge function error:', error);
      } else {
        console.log('[ensureDefaultTracker] default tracker created or already exists');
      }
    } catch (err) {
      console.error('[ensureDefaultTracker] invocation failed:', err);
    }
  },

  async signUp(params: SignUpParams) {
    const { data, error } = await supabaseClient.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: params.metadata,
        emailRedirectTo: globalThis.location.origin,
      },
    });

    if (error) {
      return { user: null, error: new Error(error.message) };
    }

    // Supabase returns a user even when email confirmation is required
    // Check email_confirmed_at to determine if confirmation is needed
    if (!data.user?.email_confirmed_at) {
      return { user: null, error: null }; // Email confirmation required
    }

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email ?? undefined,
    };

    // If we have an active session and access token, ensure default tracker exists
    const accessToken = (data.session as any)?.access_token;
    if (accessToken) {
      void supabaseAuth.ensureDefaultTracker(accessToken);
    }

    return { user, error: null };
  },

  async signIn(params: SignInParams) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) {
      return { user: null, error: new Error(error.message) };
    }

    if (!data.user) {
      return { user: null, error: new Error('Sign in failed') };
    }

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email ?? undefined,
    };

    // Ensure default tracker exists for this user (run in background)
    const accessToken = (data.session as any)?.access_token;
    if (accessToken) {
      void supabaseAuth.ensureDefaultTracker(accessToken);
    }

    return { user, error: null };
  },

  async signInWithMagicLink(params: MagicLinkParams) {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: params.email,
      options: {
        emailRedirectTo: params.redirectTo ?? globalThis.location.origin,
      },
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  },

  async resetPassword(params: ResetPasswordParams) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      params.email,
      {
        redirectTo: params.redirectTo ?? `${globalThis.location.origin}/reset-password`,
      }
    );

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  },

  async updatePassword(params: UpdatePasswordParams) {
    const { error } = await supabaseClient.auth.updateUser({
      password: params.password,
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  },

  async resend(params: ResendParams) {
    const { error } = await supabaseClient.auth.resend(params as any);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  },

  async signOut() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  },

  async getSession(): Promise<AuthSession | null> {
    // Use cached session for fast initial load
    // Server validation happens in background via onAuthStateChange
    const cachedUser = await getSessionFromCache();
    
    if (!cachedUser) {
      return null;
    }

    // Get session for tokens
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      currentUser = null;
      return null;
    }

    return {
      user: cachedUser,
      accessToken: session.access_token,
      expiresAt: session.expires_at,
    };
  },

  /**
   * Wait for initial session validation to complete.
   * Call this before rendering authenticated UI.
   */
  async waitForInitialValidation(): Promise<AuthUser | null> {
    // Ensure server-side validation is kicked off and return its result.
    if (initialValidationPromise === null || (currentUser && currentUser.id !== lastValidatedUserId)) {
      startServerValidation();
    }
    return await initialValidationPromise;
  },

  onAuthStateChange(callback: AuthStateChangeCallback) {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        let mappedEvent: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'PASSWORD_RECOVERY';

        switch (event) {
          case 'SIGNED_IN':
          case 'INITIAL_SESSION':
            mappedEvent = 'SIGNED_IN';
            break;
          case 'SIGNED_OUT':
            mappedEvent = 'SIGNED_OUT';
            break;
          case 'TOKEN_REFRESHED':
            mappedEvent = 'TOKEN_REFRESHED';
            break;
          case 'PASSWORD_RECOVERY':
            mappedEvent = 'PASSWORD_RECOVERY';
            break;
          default:
            // Ignore other events
            return;
        }

        const authSession: AuthSession | null = session
          ? {
              user: {
                id: session.user.id,
                email: session.user.email ?? undefined,
              },
              accessToken: session.access_token,
              expiresAt: session.expires_at,
            }
          : null;

        callback(mappedEvent, authSession);
      }
    );

    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  },

  getUser(): AuthUser | null {
    return currentUser;
  },

  async checkUserExists(email: string): Promise<{ exists: boolean; error: Error | null }> {
    // Security: This function has been disabled to prevent user enumeration attacks.
    // Revealing whether an email is registered allows attackers to:
    // 1. Enumerate valid user accounts
    // 2. Target specific users for phishing/social engineering
    // 3. Build lists of registered emails for spam
    //
    // Best practice: Always return a generic response that doesn't reveal user existence.
    // If you need to check user existence for legitimate purposes, use server-side
    // logic with proper authentication and rate limiting.
    return {
      exists: false,
      error: new Error('User enumeration check disabled for security reasons'),
    };
  },
};
