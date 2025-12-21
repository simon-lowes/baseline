/**
 * No-op Authentication Adapter
 * Returns signed-out state for all operations
 */

import type { AuthPort, AuthUser, SignUpParams, SignInParams, AuthStateChangeCallback } from '@/ports/AuthPort';

export const noopAuth: AuthPort = {
  async signUp(_params: SignUpParams) {
    return {
      user: null,
      error: new Error('Authentication not configured'),
    };
  },

  async signIn(_params: SignInParams) {
    return {
      user: null,
      error: new Error('Authentication not configured'),
    };
  },

  async signOut() {
    return { error: null };
  },

  async getSession() {
    return null;
  },

  onAuthStateChange(_callback: AuthStateChangeCallback) {
    // No-op: never fires events
    return {
      unsubscribe: () => {},
    };
  },

  getUser(): AuthUser | null {
    return null;
  },
};
