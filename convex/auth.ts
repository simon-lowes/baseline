import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Resend from "@auth/core/providers/resend";

/**
 * Convex Auth Configuration
 *
 * Provides email/password authentication with:
 * - Sign up with email/password
 * - Sign in with email/password
 * - Password reset via email (requires AUTH_RESEND_KEY env var)
 * - Magic link sign in option (requires AUTH_RESEND_KEY env var)
 *
 * To enable email features, set AUTH_RESEND_KEY in Convex dashboard:
 * npx convex env set AUTH_RESEND_KEY your_resend_api_key
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Email/password authentication with optional email verification
    Password({
      // Enable password reset via Resend email
      reset: Resend,
    }),
    // Magic link sign in via Resend (passwordless option)
    Resend,
  ],
});
