/**
 * Invisible Router Hook
 *
 * Manages navigation state via the History API without changing the URL.
 * The URL always stays as '/' but browser back/forward still work
 * because each history entry has its own state object.
 *
 * For sharing, we can generate encoded URLs that decode on load
 * and immediately clean up.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { decodeState, type AppState, type AppView } from '@/lib/stateEncoder';

const DEFAULT_STATE: AppState = { view: 'dashboard' };

export type { AppState, AppView };

export function useInvisibleRouter() {
  const [currentState, setCurrentState] = useState<AppState>(() => {
    // Check for shared link on initial load
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('s');

    if (encoded) {
      const decoded = decodeState(encoded);
      if (decoded) {
        // Clean URL immediately (before first render completes)
        window.history.replaceState(decoded, '', '/');
        return decoded;
      }
    }

    // Check existing history state
    const historyState = window.history.state as AppState | null;
    if (historyState?.view) {
      return historyState;
    }

    return DEFAULT_STATE;
  });

  const isInitialMount = useRef(true);

  useEffect(() => {
    // Handle browser back/forward
    const handlePopState = (event: PopStateEvent) => {
      const newState = (event.state as AppState) || DEFAULT_STATE;
      setCurrentState(newState);
    };

    window.addEventListener('popstate', handlePopState);

    // Set initial state on mount
    if (isInitialMount.current) {
      isInitialMount.current = false;

      // Ensure we have clean URL and proper history state
      if (!window.history.state?.view) {
        window.history.replaceState(currentState, '', '/');
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentState]);

  // Navigate function - pushes new state, URL stays '/'
  const navigate = useCallback((newState: AppState) => {
    window.history.pushState(newState, '', '/');
    setCurrentState(newState);
  }, []);

  // Go back programmatically
  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return {
    currentView: currentState.view,
    trackerId: currentState.trackerId,
    navigate,
    goBack,
    currentState, // For generating share URLs
  };
}
