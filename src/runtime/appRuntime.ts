/**
 * App Runtime
 * 
 * THE SINGLE IMPORT POINT FOR ALL BACKEND SERVICES
 * 
 * All UI/components must import backend services from this module only.
 * Never import adapters directly in components.
 */

import { localKv } from '@/adapters/local/localKv';
import { noopAuth } from '@/adapters/noop/noopAuth';
import { supabaseDb } from '@/adapters/supabase/supabaseDb';
import { supabaseAuth } from '@/adapters/supabase/supabaseAuth';
import { supabaseTracker } from '@/adapters/supabase/supabaseTracker';

import type { KvPort } from '@/ports/KvPort';
import type { AuthPort } from '@/ports/AuthPort';
import type { DbPort } from '@/ports/DbPort';
import type { TrackerPort } from '@/ports/TrackerPort';
import type { Tracker } from '@/types/tracker';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Environment Detection
// =============================================================================

const hasSupabaseEnv = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

// =============================================================================
// Runtime Configuration
// =============================================================================

export interface RuntimeConfig {
  kvProvider: 'local' | 'supabase';
  authProvider: 'noop' | 'supabase';
  dbProvider: 'noop' | 'supabase';
}

/**
 * Current runtime configuration (determined by environment)
 */
export const runtimeConfig: RuntimeConfig = {
  kvProvider: 'local',
  authProvider: hasSupabaseEnv ? 'supabase' : 'noop',
  dbProvider: hasSupabaseEnv ? 'supabase' : 'noop',
};

// =============================================================================
// Service Exports
// =============================================================================

/**
 * Key-Value Storage
 * Currently: localStorage adapter
 */
export const kv: KvPort = localKv;

/**
 * Authentication
 * Uses Supabase if env vars present, otherwise no-op
 */
// Expose auth implementation. In E2E or DEV mode we allow overriding via ?e2e=true to use noopAuth (bypass real auth)
let _auth: AuthPort = hasSupabaseEnv ? supabaseAuth : noopAuth;
if (typeof window !== 'undefined' && window.location.search.includes('e2e=true')) {
  console.log('[appRuntime] E2E mode detected - using testAuth');
  // Provide a lightweight test auth that reports a signed-in test user so E2E flows can exercise authenticated UI
  const testUser = { id: 'e2e-user', email: 'e2e@example.com' };
  _auth = {
    ...noopAuth,
    async getSession() {
      return { user: testUser } as any;
    },
    getUser() {
      return testUser as any;
    },
    onAuthStateChange(callback) {
      // Immediately invoke callback as SIGNED_IN for deterministic test state
      callback('SIGNED_IN', { user: testUser } as any);
      return { unsubscribe: () => {} };
    },
  } as AuthPort;
}
export const auth: AuthPort = _auth;

/**
 * Database
 * Uses Supabase if env vars present. When running E2E with `?e2e=true` provide a lightweight
 * in-memory adapter for tracker_entries to avoid Supabase UUID parsing errors for test-generated IDs.
 */
let _db: DbPort = supabaseDb;
if (typeof window !== 'undefined' && window.location.search.includes('e2e=true')) {
  console.log('[appRuntime] E2E mode detected - using in-memory DB adapter for tracker_entries');
  _db = {
    async select(table: string, options) {
      try {
        // Intercept tracker_entries queries for in-memory tracker IDs (non-UUIDs)
        if (table === 'tracker_entries' && options?.where && typeof options.where.tracker_id === 'string' && (options.where.tracker_id as string).startsWith('tracker-')) {
          return { data: [], error: null };
        }
        return (supabaseDb.select as any)(table, options);
      } catch (e: any) {
        return { data: null, error: e };
      }
    },
    async insert(table: string, values: any) {
      try {
        if (table === 'tracker_entries' && values && (values as any).tracker_id && String((values as any).tracker_id).startsWith('tracker-')) {
          // Simulate insertion without contacting Supabase
          return { data: values as any, error: null };
        }
        return (supabaseDb.insert as any)(table, values);
      } catch (e: any) {
        return { data: null, error: e };
      }
    },
    async update(table: string, where: Record<string, unknown>, values: any) {
      try {
        if (table === 'tracker_entries' && where && where.tracker_id && String(where.tracker_id).startsWith('tracker-')) {
          return { data: values as any, error: null };
        }
        return (supabaseDb.update as any)(table, where, values);
      } catch (e: any) {
        return { data: null, error: e };
      }
    },
    async delete(table: string, where: Record<string, unknown>) {
      try {
        if (table === 'tracker_entries' && where && where.tracker_id && String(where.tracker_id).startsWith('tracker-')) {
          return { data: null, error: null };
        }
        return (supabaseDb.delete as any)(table, where);
      } catch (e: any) {
        return { data: null, error: e };
      }
    },
    async sql(query: string, params?: unknown[]) {
      // Forward raw SQL calls to Supabase adapter (if available)
      if (supabaseDb.sql) return supabaseDb.sql(query, params);
      return { data: null, error: new Error('SQL not supported by adapter') };
    }
  };
}
export const db: DbPort = _db;

/**
 * Tracker Service
 * Manages user trackers (multiple tracking types per user)
 */
let _tracker: TrackerPort = supabaseTracker;

// In E2E mode, provide a lightweight in-memory tracker implementation so tests can run without external DB
if (typeof window !== 'undefined' && window.location.search.includes('e2e=true')) {
  console.log('[appRuntime] E2E mode detected - using in-memory test tracker');
  const e2eStore: Tracker[] = [];
  // Seed a default tracker so the Dashboard view appears (avoid WelcomeScreen in E2E preview)
  const nowIso = new Date().toISOString();
  e2eStore.push({
    id: uuidv4(),
    user_id: 'e2e-user',
    name: 'Default Tracker',
    type: 'custom',
    icon: 'activity',
    color: '#6366f1',
    is_default: true,
    preset_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  } as Tracker);

  _tracker = {
    async getTrackers() {
      return { data: [...e2eStore], error: null };
    },
    async getTracker(id: string) {
      const found = e2eStore.find(t => t.id === id) || null;
      return { data: found ?? null, error: null };
    },
    async getDefaultTracker() {
      const found = e2eStore.find(t => t.is_default) || (e2eStore.length ? e2eStore[0] : null);
      return { data: found ?? null, error: null };
    },
    async createTracker(input) {
      const id = uuidv4();
      const nowIso = new Date().toISOString();
      const newTracker: Tracker = {
        id,
        user_id: 'e2e-user',
        name: input.name,
        type: (input as any).type || 'custom',
        icon: (input as any).icon || 'activity',
        color: (input as any).color || '#6366f1',
        is_default: (input as any).is_default ?? false,
        preset_id: (input as any).preset_id || null,
        generated_config: (input as any).generated_config || null,
        confirmed_interpretation: (input as any).confirmed_interpretation || null,
        created_at: nowIso,
        updated_at: nowIso,
      } as Tracker;
      e2eStore.push(newTracker);
      return { data: newTracker, error: null };
    },
    async updateTracker(id, input) {
      const idx = e2eStore.findIndex(t => t.id === id);
      if (idx === -1) return { data: null, error: new Error('Not found') };
      e2eStore[idx] = { ...e2eStore[idx], ...(input as any) };
      return { data: e2eStore[idx], error: null };
    },
    async deleteTracker(id) {
      const idx = e2eStore.findIndex(t => t.id === id);
      if (idx === -1) return { data: null, error: new Error('Not found') };
      e2eStore.splice(idx, 1);
      return { data: null, error: null };
    },
    async setDefaultTracker(id: string) {
      e2eStore.forEach(t => (t.is_default = t.id === id));
      const found = e2eStore.find(t => t.id === id) || null;
      return { data: found, error: null };
    },
    async ensureDefaultTracker() {
      if (e2eStore.length === 0) {
        const nowIso = new Date().toISOString();
        const newTracker = {
          id: `tracker-${Date.now()}`,
          user_id: 'e2e-user',
          name: 'Default Tracker',
          type: 'custom',
          icon: 'activity',
          color: '#6366f1',
          is_default: true,
          preset_id: null,
          created_at: nowIso,
          updated_at: nowIso,
        } as unknown as Tracker;
        e2eStore.push(newTracker);
        return { data: newTracker, error: null };
      }
      return { data: e2eStore[0], error: null };
    },
  };
}

export const tracker: TrackerPort = _tracker;

// =============================================================================
// Diagnostics Helpers
// =============================================================================

export function getRuntimeStatus() {
  return {
    kv: runtimeConfig.kvProvider,
    auth: runtimeConfig.authProvider,
    db: runtimeConfig.dbProvider,
    user: auth.getUser(),
  };
}
