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
  } = options;

  // Track if we restored a draft
  const [hadDraft, setHadDraft] = useState(false);

  // Keep a ref to the latest data for use in event handlers
  const dataRef = useRef<T>(initialData);

  // Check if a draft exists and is valid
  const getValidDraft = useCallback((): T | null => {
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
  }, [key, expiryMs]);

  // Get initial data (draft or default)
  const getInitialData = useCallback((): T => {
    const draft = getValidDraft();
    if (draft !== null) {
      setHadDraft(true);
      return draft;
    }
    return initialData;
  }, [getValidDraft, initialData]);

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
  }, [saveDraft]);

  // Autosave periodically as a backup
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft(dataRef.current);
    }, autosaveIntervalMs);

    return () => clearInterval(interval);
  }, [saveDraft, autosaveIntervalMs]);

  // Also save on pagehide (catches some cases visibilitychange misses)
  useEffect(() => {
    const handlePageHide = () => {
      saveDraft(dataRef.current);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveDraft]);

  return {
    hadDraft,
    saveDraft,
    clearDraft,
    getInitialData,
  };
}
