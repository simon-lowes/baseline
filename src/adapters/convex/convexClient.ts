/**
 * Convex Client Setup
 *
 * Creates and exports the Convex client for use across the app.
 */

import { ConvexReactClient } from "convex/react";

// Get the Convex URL from environment variables
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL is not set. Convex functionality will not work."
  );
}

/**
 * Convex React client instance.
 * Use this with ConvexProvider to wrap your app.
 */
export const convexClient = new ConvexReactClient(convexUrl || "");

/**
 * Check if Convex is properly configured
 */
export function isConvexConfigured(): boolean {
  return !!convexUrl;
}
