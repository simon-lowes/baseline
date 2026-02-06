/**
 * State Encoder for Invisible Routing
 *
 * Encodes/decodes app state for shareable URLs while keeping
 * the main URL clean. Uses LZ compression for shorter URLs.
 */

import LZString from 'lz-string';

export type AppView = 'welcome' | 'dashboard' | 'tracker' | 'analytics' | 'privacy' | 'terms' | 'help';

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
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as AppState;
    }
    return null;
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
