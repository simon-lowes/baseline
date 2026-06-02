/**
 * State Encoder for Invisible Routing
 *
 * Encodes/decodes app state for shareable URLs while keeping
 * the main URL clean. Uses LZ compression for shorter URLs.
 */

import LZString from 'lz-string';

export type AppView = 'welcome' | 'dashboard' | 'tracker' | 'analytics' | 'privacy' | 'terms' | 'help';

const VALID_VIEWS: readonly AppView[] = ['welcome', 'dashboard', 'tracker', 'analytics', 'privacy', 'terms', 'help'];

export interface AppState {
  view: AppView;
  trackerId?: string;
}

/**
 * Encode app state for URL sharing
 * Uses LZ compression for shorter URLs
 */
export function encodeState(state: AppState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decode app state from URL parameter
 */
export function decodeState(encoded: string): AppState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    // Validate the view against the known union; an unrecognized view would
    // render a blank app (no currentView branch matches). Reject crafted links.
    if (!VALID_VIEWS.includes(parsed.view)) {
      return null;
    }
    // trackerId, if present, must be a string (per-user RLS still constrains access).
    if (parsed.trackerId !== undefined && typeof parsed.trackerId !== 'string') {
      return null;
    }
    return { view: parsed.view, trackerId: parsed.trackerId };
  } catch {
    return null;
  }
}

/**
 * Generate shareable URL for current state
 */
export function generateShareUrl(state: AppState): string {
  const encoded = encodeState(state);
  return `${window.location.origin}?s=${encoded}`;
}
