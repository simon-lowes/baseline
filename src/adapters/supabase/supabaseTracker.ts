/**
 * Supabase Tracker Adapter
 * Implements TrackerPort using Supabase
 */

import type { TrackerPort, TrackerResult } from '@/ports/TrackerPort';
import type { Tracker, CreateTrackerInput, UpdateTrackerInput } from '@/types/tracker';
import { supabaseClient } from './supabaseClient';

export const supabaseTracker: TrackerPort = {
  async getTrackers(): Promise<TrackerResult<Tracker[]>> {
    try {
      console.log('[supabaseTracker] Getting session...');
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      console.log('[supabaseTracker] Session result:', session?.user?.id, sessionError?.message);
      
      if (!session?.user) {
        return { data: null, error: new Error('Not authenticated') };
      }

      console.log('[supabaseTracker] Fetching trackers for user:', session.user.id);
      const { data, error } = await supabaseClient
        .from('trackers')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      console.log('[supabaseTracker] Query result:', data?.length, 'trackers, error:', error?.message);
      
      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Tracker[], error: null };
    } catch (err) {
      console.error('[supabaseTracker] Exception:', err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async getTracker(id: string): Promise<TrackerResult<Tracker>> {
    try {
      const { data, error } = await supabaseClient
        .from('trackers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Tracker, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async getDefaultTracker(): Promise<TrackerResult<Tracker>> {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('Not authenticated') };
      }

      const { data, error } = await supabaseClient
        .from('trackers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Tracker, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async createTracker(input: CreateTrackerInput): Promise<TrackerResult<Tracker>> {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('Not authenticated') };
      }

      const { data, error } = await supabaseClient
        .from('trackers')
        .insert({
          user_id: user.id,
          name: input.name,
          type: input.type ?? 'custom',
          preset_id: input.preset_id ?? null,
          icon: input.icon ?? 'activity',
          color: input.color ?? '#6366f1',
          is_default: input.is_default ?? false,
          generated_config: input.generated_config ?? null,
          user_description: input.user_description ?? null,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Tracker, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async updateTracker(id: string, input: UpdateTrackerInput): Promise<TrackerResult<Tracker>> {
    try {
      const { data, error } = await supabaseClient
        .from('trackers')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Tracker, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async deleteTracker(id: string): Promise<TrackerResult<null>> {
    try {
      const { error } = await supabaseClient
        .from('trackers')
        .delete()
        .eq('id', id);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: null, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async setDefaultTracker(id: string): Promise<TrackerResult<Tracker>> {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('Not authenticated') };
      }

      // First, unset all other defaults for this user
      await supabaseClient
        .from('trackers')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the new default
      const { data, error } = await supabaseClient
        .from('trackers')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Tracker, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },

  async ensureDefaultTracker(): Promise<TrackerResult<Tracker>> {
    try {
      // Try to get existing default tracker
      const existing = await this.getDefaultTracker();
      if (existing.data) {
        return existing;
      }

      // No default tracker exists, create one
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('Not authenticated') };
      }

      // Create a default Chronic Pain tracker
      const { data, error } = await supabaseClient
        .from('trackers')
        .insert({
          user_id: user.id,
          name: 'Chronic Pain',
          type: 'preset',
          preset_id: 'chronic_pain',
          icon: 'activity',
          color: '#ef4444',
          is_default: true,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as Tracker, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error'),
      };
    }
  },
};
