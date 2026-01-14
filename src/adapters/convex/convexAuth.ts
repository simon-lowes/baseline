/**
 * Convex Authentication Adapter
 *
 * Implements AuthPort using Convex Auth.
 * Note: Convex Auth primarily works via React hooks.
 * This adapter provides imperative API calls where possible.
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
} from "@/ports/AuthPort";
import { convexClient } from "./convexClient";
import { api } from "../../../convex/_generated/api";

// Store current user state
let currentUser: AuthUser | null = null;
let authStateCallbacks: Set<AuthStateChangeCallback> = new Set();
let isInitialized = false;
let initializationPromise: Promise<AuthUser | null> | null = null;

/**
 * Convex Auth doesn't expose a direct signUp API - it uses React hooks.
 * For email/password, the signIn flow with Password provider handles both.
 *
 * This adapter provides a compatibility layer that works with the existing
 * AuthPort interface, but actual authentication flows should use the
 * Convex Auth React components/hooks for full functionality.
 */
export const convexAuth: AuthPort = {
  async signUp(params: SignUpParams) {
    try {
      // Convex Auth Password provider handles signup through the signIn mutation
      // with flow: "signUp" parameter
      // For now, we'll use the Convex Auth hooks in React components
      // This is a placeholder that indicates the limitation

      // The actual implementation would use:
      // await signIn("password", { email, password, flow: "signUp" })
      // But this requires React context, so we'll throw an informative error
      throw new Error(
        "Convex Auth signUp requires React hooks. Use the ConvexAuthProvider and useAuthActions hook."
      );
    } catch (error) {
      return {
        user: null,
        error:
          error instanceof Error ? error : new Error("Sign up failed"),
      };
    }
  },

  async signIn(params: SignInParams) {
    try {
      // Similar to signUp, Convex Auth requires React hooks for signIn
      // The actual implementation would use:
      // await signIn("password", { email, password, flow: "signIn" })
      throw new Error(
        "Convex Auth signIn requires React hooks. Use the ConvexAuthProvider and useAuthActions hook."
      );
    } catch (error) {
      return {
        user: null,
        error:
          error instanceof Error ? error : new Error("Sign in failed"),
      };
    }
  },

  async signInWithMagicLink(params: MagicLinkParams) {
    try {
      // Magic link would use the Resend provider
      // await signIn("resend", { email })
      throw new Error(
        "Convex Auth magic link requires React hooks. Use the ConvexAuthProvider and useAuthActions hook."
      );
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error("Magic link failed"),
      };
    }
  },

  async resetPassword(params: ResetPasswordParams) {
    try {
      // Password reset uses the Password provider with reset flow
      // await signIn("password", { email, flow: "reset" })
      throw new Error(
        "Convex Auth password reset requires React hooks. Use the ConvexAuthProvider and useAuthActions hook."
      );
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Password reset failed"),
      };
    }
  },

  async updatePassword(params: UpdatePasswordParams) {
    try {
      // Update password after reset
      throw new Error(
        "Convex Auth updatePassword requires React hooks. Use the ConvexAuthProvider and useAuthActions hook."
      );
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Update password failed"),
      };
    }
  },

  async resend(_params: ResendParams) {
    // Resend verification email
    return {
      error: new Error(
        "Convex Auth resend requires React hooks. Use the ConvexAuthProvider."
      ),
    };
  },

  async signOut() {
    try {
      // SignOut can be called imperatively via the Convex mutation
      // But we still need to handle the React state
      throw new Error(
        "Convex Auth signOut requires React hooks. Use the ConvexAuthProvider and useAuthActions hook."
      );
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error("Sign out failed"),
      };
    }
  },

  async getSession(): Promise<AuthSession | null> {
    // Get current session from Convex Auth
    // This queries the current user
    if (!isInitialized) {
      await this.waitForInitialValidation();
    }

    if (!currentUser) {
      return null;
    }

    return {
      user: currentUser,
      // Convex Auth manages tokens internally
    };
  },

  async waitForInitialValidation(): Promise<AuthUser | null> {
    if (isInitialized) {
      return currentUser;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    // Query the current user from Convex
    initializationPromise = (async () => {
      try {
        const userId = await convexClient.query(api.users.currentUserId, {});
        if (userId) {
          currentUser = {
            id: userId,
            // Email would come from the profile
          };
        } else {
          currentUser = null;
        }
      } catch (error) {
        console.error("Failed to get current user:", error);
        currentUser = null;
      }
      isInitialized = true;
      return currentUser;
    })();

    return initializationPromise;
  },

  onAuthStateChange(callback: AuthStateChangeCallback) {
    authStateCallbacks.add(callback);

    // Return unsubscribe function
    return {
      unsubscribe: () => {
        authStateCallbacks.delete(callback);
      },
    };
  },

  getUser(): AuthUser | null {
    return currentUser;
  },

  async checkUserExists(_email: string) {
    // User enumeration is a security risk
    return {
      exists: false,
      error: new Error(
        "User enumeration check disabled for security reasons"
      ),
    };
  },
};

/**
 * Update the current user state from Convex Auth hooks.
 * Call this from React components that have access to auth state.
 */
export function setConvexAuthUser(user: AuthUser | null): void {
  const previousUser = currentUser;
  currentUser = user;
  isInitialized = true;

  // Notify callbacks
  if (user && !previousUser) {
    // Signed in
    authStateCallbacks.forEach((cb) =>
      cb("SIGNED_IN", { user })
    );
  } else if (!user && previousUser) {
    // Signed out
    authStateCallbacks.forEach((cb) => cb("SIGNED_OUT", null));
  }
}

/**
 * Reset auth state (for testing or cleanup)
 */
export function resetConvexAuthState(): void {
  currentUser = null;
  isInitialized = false;
  initializationPromise = null;
}
