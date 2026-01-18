/**
 * App Context
 *
 * Provides shared state to all route components.
 * This allows routes to access trackers, entries, and handlers
 * without prop drilling.
 */

import { createContext, useContext } from 'react';
import type { Tracker } from '@/types/tracker';
import type { PainEntry } from '@/types/pain-entry';

export interface AppContextValue {
  // Tracker state
  trackers: Tracker[];
  currentTracker: Tracker | null;
  setCurrentTracker: (tracker: Tracker | null) => void;

  // Entry state
  entries: PainEntry[];
  allEntries: PainEntry[];

  // Tracker handlers
  onTrackerCreated: (tracker: Tracker) => void;
  onTrackerDeleted: (trackerId: string) => void;

  // Entry handlers
  onEntryAdd: (entry: PainEntry) => Promise<void>;
  onEntryUpdate: (entry: PainEntry) => Promise<void>;
  onEntryDelete: (entryId: string) => Promise<void>;

  // Analytics
  analyticsTracker: Tracker | null;
  setAnalyticsTracker: (tracker: Tracker | null) => void;
  loadAllEntries: () => Promise<void>;

  // Loading states
  loading: boolean;
  trackersLoading: boolean;

  // Offline support
  isOnline: boolean;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContext.Provider');
  }
  return context;
}
