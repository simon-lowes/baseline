/**
 * useFormDraft Hook
 *
 * Provides automatic form draft persistence to prevent data loss when:
 * - Phone screen locks/dims
 * - User switches to another app
 * - Browser tab is terminated by the OS
 *
 * Uses localStorage for persistence (survives tab termination, unlike sessionStorage)
 * and the visibilitychange event (most reliable cross-platform signal per Chrome Page Lifecycle API)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface DraftData<T> {
  timestamp: number;
  data: T;
}

interface UseFormDraftOptions {
  /** How long to keep drafts before they expire (default: 24 hours) */
  expiryMs?: number;
  /** Autosave interval in ms (default: 10 seconds) */
  autosaveIntervalMs?: number;
  /**
   * Whether draft persistence is active (default: true). When false, the
   * autosave interval, visibilitychange, and pagehide handlers do NOT write to
   * storage. Use this when the form is editing an existing record so it does not
   * clobber the new-entry draft stored under the same key.
   */
  enabled?: boolean;
}

interface UseFormDraftReturn<T> {
  /** Whether a draft was restored on mount */
  hadDraft: boolean;
  /** Save the current form data as a draft */
  saveDraft: (data: T) => void;
  /** Clear the saved draft (call on successful submit or cancel) */
  clearDraft: () => void;
  /** Get the initial data (draft if exists and valid, otherwise initialData) */
  getInitialData: () => T;
}

const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_AUTOSAVE_INTERVAL_MS = 10 * 1000; // 10 seconds

/**
 * Hook for persisting form data across page visibility changes and browser restarts.
 *
 * @param key - Unique storage key for this form draft
 * @param initialData - Default form data when no draft exists
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { hadDraft, saveDraft, clearDraft, getInitialData } = useFormDraft(
 *   `baseline-draft-entry-${trackerId}`,
 *   { intensity: 5, notes: '', locations: [] }
 * );
 *
 * const [formData, setFormData] = useState(getInitialData);
 *
 * // Save draft whenever form changes
 * useEffect(() => {
 *   saveDraft(formData);
 * }, [formData, saveDraft]);
 *
 * // Clear on submit
 * const handleSubmit = () => {
 *   submitToServer(formData);
 *   clearDraft();
 * };
 * ```
 */
export function useFormDraft<T>(
  key: string,
  initialData: T,
  options: UseFormDraftOptions = {}
): UseFormDraftReturn<T> {
  const {
    expiryMs = DEFAULT_EXPIRY_MS,
    autosaveIntervalMs = DEFAULT_AUTOSAVE_INTERVAL_MS,
    enabled = true,
  } = options;

  // Keep a ref to the latest data for use in event handlers
  const dataRef = useRef<T>(initialData);

  // Pure function to check for valid draft (no hooks, safe to call anywhere)
  const checkForDraft = (): T | null => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const draft: DraftData<T> = JSON.parse(stored);

      // Check if draft is expired
      if (Date.now() - draft.timestamp > expiryMs) {
        localStorage.removeItem(key);
        return null;
      }

      return draft.data;
    } catch (error) {
      console.warn('[useFormDraft] Failed to parse draft:', error);
      localStorage.removeItem(key);
      return null;
    }
  };

  // Track if we restored a draft - computed once on mount
  const [hadDraft] = useState(() => {
    return checkForDraft() !== null;
  });

  // Get initial data (draft or default) - pure function safe to call during render
  const getInitialData = useCallback((): T => {
    const draft = checkForDraft();
    if (draft !== null) {
      return draft;
    }
    return initialData;
  }, [key, expiryMs, initialData]);

  // Save draft to localStorage
  const saveDraft = useCallback((data: T) => {
    dataRef.current = data;
    try {
      const draft: DraftData<T> = {
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (error) {
      console.warn('[useFormDraft] Failed to save draft:', error);
    }
  }, [key]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  // Save on visibility change (most reliable mobile signal)
  useEffect(() => {
    if (!enabled) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Save immediately when page becomes hidden
        saveDraft(dataRef.current);
        console.log('[useFormDraft] Saved draft on visibility hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveDraft, enabled]);

  // Autosave periodically as a backup
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      saveDraft(dataRef.current);
    }, autosaveIntervalMs);

    return () => clearInterval(interval);
  }, [saveDraft, autosaveIntervalMs, enabled]);

  // Also save on pagehide (catches some cases visibilitychange misses)
  useEffect(() => {
    if (!enabled) return;
    const handlePageHide = () => {
      saveDraft(dataRef.current);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveDraft, enabled]);

  return {
    hadDraft,
    saveDraft,
    clearDraft,
    getInitialData,
  };
}
