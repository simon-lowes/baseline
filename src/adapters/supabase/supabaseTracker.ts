/**
 * Supabase Tracker Adapter
 * Implements TrackerPort using Supabase
 */

import type { TrackerPort, TrackerResult } from '@/ports/TrackerPort';
import type { Tracker, CreateTrackerInput, UpdateTrackerInput } from '@/types/tracker';
import { supabaseClient } from './supabaseClient';

/**
 * Validates hex color format (#RRGGBB)
 * Prevents XSS and ensures database constraint compliance
 */
function validateHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

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

      if ((input.type ?? 'custom') === 'custom' && !input.generated_config) {
        return { data: null, error: new Error('Custom trackers require a generated configuration.') };
      }

      // Validate color format to prevent XSS and ensure database constraint compliance
      const color = input.color ?? '#6366f1';
      if (!validateHexColor(color)) {
        return { data: null, error: new Error('Color must be a valid hex color code in #RRGGBB format') };
      }

      // Server-side guard: prevent creating ambiguous-named trackers without user confirmation
      const AMBIGUOUS_TERMS = [
        'flying','hockey','curling','reading','drinking','smoking','shooting','chilling','running','driving',
        'lifting','bowling','batting','pressing','cycling','boxing','climbing','dancing','walking','fasting','gaming','training'
      ];
      if (AMBIGUOUS_TERMS.includes(input.name.toLowerCase()) && !input.confirmed_interpretation) {
        console.warn('[supabaseTracker] Blocked ambiguous tracker creation without confirmation:', input.name);
        return { data: null, error: new Error(`Tracker name "${input.name}" is ambiguous and requires a confirmed interpretation before creation`) };
      }

      const payload: Record<string, unknown> = {
        user_id: user.id,
        name: input.name,
        type: input.type ?? 'custom',
        preset_id: input.preset_id ?? null,
        icon: input.icon ?? 'activity',
        color: color,
        is_default: input.is_default ?? false,
      };
      if (input.generated_config !== undefined) payload.generated_config = input.generated_config;
      if (input.user_description) payload.user_description = input.user_description;
      if (input.confirmed_interpretation) payload.confirmed_interpretation = input.confirmed_interpretation;

      const attemptInsert = async (body: Record<string, unknown>) => {
        return supabaseClient.from('trackers').insert(body).select().single();
      };

      let { data, error } = await attemptInsert(payload);
      let msg = error?.message?.toLowerCase() ?? '';

      const missingColumn = (column: string) =>
        msg.includes('does not exist') && msg.includes('column') && msg.includes(column);
      const missingConfirmed = missingColumn('confirmed_interpretation');
      const missingUserDescription = missingColumn('user_description');
      const missingGeneratedConfig = missingColumn('generated_config');

      let strippedOptionalColumns = false;

      if (error && (missingConfirmed || missingUserDescription)) {
        const retryPayload = { ...payload };
        if (missingConfirmed) delete retryPayload.confirmed_interpretation;
        if (missingUserDescription) delete retryPayload.user_description;
        ({ data, error } = await attemptInsert(retryPayload));
        msg = error?.message?.toLowerCase() ?? '';
        strippedOptionalColumns = true;
      }

      const looksLikeSchemaCacheIssue = msg.includes('schema cache');

      if (error && looksLikeSchemaCacheIssue) {
        console.warn('[supabaseTracker] Schema cache issue detected, attempting refresh and retry:', error.message);
        try {
          await supabaseClient.rpc('refresh_schema_cache');
        } catch (refreshErr) {
          console.warn('[supabaseTracker] Failed to refresh schema cache:', refreshErr);
        }
        ({ data, error } = await attemptInsert(payload));
        msg = error?.message?.toLowerCase() ?? '';
      }

      if (
        error &&
        !strippedOptionalColumns &&
        msg.includes('schema cache') &&
        (msg.includes('confirmed_interpretation') || msg.includes('user_description'))
      ) {
        const retryPayload = { ...payload };
        if (msg.includes('confirmed_interpretation')) delete retryPayload.confirmed_interpretation;
        if (msg.includes('user_description')) delete retryPayload.user_description;
        ({ data, error } = await attemptInsert(retryPayload));
        msg = error?.message?.toLowerCase() ?? '';
        strippedOptionalColumns = true;
      }

      if (error) {
        const message = error.message || 'Failed to create tracker';
        if (missingGeneratedConfig) {
          return {
            data: null,
            error: new Error('Database schema is missing generated_config. Apply the latest Supabase migrations and retry.'),
          };
        }
        if (looksLikeSchemaCacheIssue) {
          return {
            data: null,
            error: new Error('Schema cache is out of date. Please refresh and try again so your tracker config can be saved.'),
          };
        }
        return { data: null, error: new Error(message) };
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
      // Validate color if provided
      if (input.color && !validateHexColor(input.color)) {
        return { data: null, error: new Error('Color must be a valid hex color code in #RRGGBB format') };
      }

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
