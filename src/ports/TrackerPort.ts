/**
 * Tracker Port
 * Defines the contract for tracker management services
 */

import type { Tracker, CreateTrackerInput, UpdateTrackerInput } from '@/types/tracker';

export interface TrackerResult<T> {
  data: T | null;
  error: Error | null;
}

export interface TrackerPort {
  /**
   * Get all trackers for the current user
   */
  getTrackers(): Promise<TrackerResult<Tracker[]>>;
  
  /**
   * Get a single tracker by ID
   */
  getTracker(id: string): Promise<TrackerResult<Tracker>>;
  
  /**
   * Get the user's default tracker
   */
  getDefaultTracker(): Promise<TrackerResult<Tracker>>;
  
  /**
   * Create a new tracker
   */
  createTracker(input: CreateTrackerInput): Promise<TrackerResult<Tracker>>;
  
  /**
   * Update an existing tracker
   */
  updateTracker(id: string, input: UpdateTrackerInput): Promise<TrackerResult<Tracker>>;
  
  /**
   * Delete a tracker (and all its entries)
   */
  deleteTracker(id: string): Promise<TrackerResult<null>>;
  
  /**
   * Set a tracker as the default
   */
  setDefaultTracker(id: string): Promise<TrackerResult<Tracker>>;
  
  /**
   * Ensure the user has a default tracker (creates one if not)
   * Called during onboarding or first use
   */
  ensureDefaultTracker(): Promise<TrackerResult<Tracker>>;
}
