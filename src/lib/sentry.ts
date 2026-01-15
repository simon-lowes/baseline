/**
 * Sentry Stub
 *
 * Placeholder module that maintains API compatibility but does nothing.
 * Error monitoring can be re-enabled later by installing @sentry/react
 * and implementing these functions.
 */

/** Initialize error monitoring (no-op) */
export function initSentry(): void {
  // Intentionally empty - no external error monitoring
}

/** Capture a custom error (no-op) */
export function captureError(
  _error: Error,
  _context?: Record<string, unknown>
): void {
  // Errors logged to console only
}

/** Set user context (no-op) */
export function setUser(_userId: string | null): void {
  // No user tracking
}

/** Add breadcrumb (no-op) */
export function addBreadcrumb(
  _message: string,
  _category: string,
  _data?: Record<string, unknown>
): void {
  // No breadcrumb tracking
}
