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
// Expose auth implementation. In local development (no Supabase env) provide a lightweight dev auth
// so the app can be used without configuring Supabase. For E2E we still allow ?e2e=true to use the special testAuth.
let _auth: AuthPort;
if ((!hasSupabaseEnv && typeof window !== 'undefined') || (typeof window !== 'undefined' && window.location.search.includes('dev=true'))) {
  console.log('[appRuntime] DEV mode detected - using devAuth');
  const devUser = { id: 'dev-user', email: 'dev@example.com' };
  _auth = {
    ...noopAuth,
    async getSession() {
      return { user: devUser, accessToken: 'dev-token', expiresAt: Math.floor(Date.now() / 1000) + 3600 } as any;
    },
    getUser() {
      return devUser as any;
    },
    onAuthStateChange(callback) {
      // Immediately invoke callback as SIGNED_IN for deterministic dev state
      callback('SIGNED_IN', { user: devUser } as any);
      return { unsubscribe: () => {} };
    },
    async waitForInitialValidation() {
      return devUser as any;
    }
  } as AuthPort;
} else {
  // Use real supabase auth in environments with proper env vars
  _auth = hasSupabaseEnv ? supabaseAuth : noopAuth;
}

// E2E override (explicit via ?e2e=true) - take precedence
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
    async waitForInitialValidation() {
      return testUser as any;
    }
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

// DEV mode: in-memory tracker for local development (no Supabase env)
if ((!hasSupabaseEnv && typeof window !== 'undefined') || (typeof window !== 'undefined' && window.location.search.includes('dev=true'))) {
  console.log('[appRuntime] DEV mode detected - using in-memory dev tracker');
  const DEV_KEY = '__baseline_dev_trackers';
  let devStore: Tracker[] = [];
  try {
    const raw = window.localStorage.getItem(DEV_KEY);
    if (raw) devStore = JSON.parse(raw) as Tracker[];
  } catch {}

  if (devStore.length === 0) {
    const nowIso = new Date().toISOString();
    devStore.push({
      id: `dev-${Date.now()}`,
      user_id: 'dev-user',
      name: 'Default Tracker',
      type: 'custom',
      icon: 'activity',
      color: '#6366f1',
      is_default: true,
      preset_id: null,
      created_at: nowIso,
      updated_at: nowIso,
    } as Tracker);
    try { window.localStorage.setItem(DEV_KEY, JSON.stringify(devStore)); } catch {}
  }
  const saveDev = () => { try { window.localStorage.setItem(DEV_KEY, JSON.stringify(devStore)); } catch {} };

  _tracker = {
    async getTrackers() {
      console.log('[devStore] getTrackers -> count:', devStore.length);
      return { data: [...devStore], error: null };
    },
    async getTracker(id: string) {
      const found = devStore.find(t => t.id === id) || null;
      return { data: found ?? null, error: null };
    },
    async getDefaultTracker() {
      const found = devStore.find(t => t.is_default) || (devStore.length ? devStore[0] : null);
      return { data: found ?? null, error: null };
    },
    async createTracker(input) {
      const id = `dev-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const newTracker: Tracker = {
        id,
        user_id: 'dev-user',
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
      devStore.push(newTracker);
      try { saveDev(); } catch {}
      console.log('[devStore] createTracker -> id:', newTracker.id, 'name:', newTracker.name, 'count:', devStore.length);
      return { data: newTracker, error: null };
    },

    async updateTracker(id, input) {
      const idx = devStore.findIndex(t => t.id === id);
      if (idx === -1) return { data: null, error: new Error('Not found') };
      devStore[idx] = { ...devStore[idx], ...(input as any) };
      try { saveDev(); } catch {}
      return { data: devStore[idx], error: null };
    },
    async deleteTracker(id) {
      const idx = devStore.findIndex(t => t.id === id);
      if (idx === -1) return { data: null, error: new Error('Not found') };
      devStore.splice(idx, 1);
      try { saveDev(); } catch {}
      return { data: null, error: null };
    },
    async setDefaultTracker(id: string) {
      devStore.forEach(t => (t.is_default = t.id === id));
      const found = devStore.find(t => t.id === id) || null;
      return { data: found, error: null };
    },
    async ensureDefaultTracker() {
      if (devStore.length === 0) {
        const nowIso = new Date().toISOString();
        const newTracker = {
          id: `tracker-${Date.now()}`,
          user_id: 'dev-user',
          name: 'Default Tracker',
          type: 'custom',
          icon: 'activity',
          color: '#6366f1',
          is_default: true,
          preset_id: null,
          created_at: nowIso,
          updated_at: nowIso,
        } as unknown as Tracker;
        devStore.push(newTracker);
        return { data: newTracker, error: null };
      }
      return { data: devStore[0], error: null };
    },
  };
}

// In E2E mode, provide a lightweight in-memory tracker implementation so tests can run without external DB
if (typeof window !== 'undefined' && window.location.search.includes('e2e=true')) {
  console.log('[appRuntime] E2E mode detected - using in-memory test tracker');
  // Persist E2E store across page reloads using localStorage so tests can navigate without losing state
  const E2E_KEY = '__baseline_e2e_trackers';
  let e2eStore: Tracker[] = [];
  try {
    const raw = window.localStorage.getItem(E2E_KEY);
    if (raw) {
      e2eStore = JSON.parse(raw) as Tracker[];
    }
  } catch (err) {
    // ignore parse errors and fall back to seeding
  }

  // Seed a default tracker if empty
  if (e2eStore.length === 0) {
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
    try { window.localStorage.setItem(E2E_KEY, JSON.stringify(e2eStore)); } catch {};
  }
  const saveE2E = () => { try { window.localStorage.setItem(E2E_KEY, JSON.stringify(e2eStore)); } catch {} };

  _tracker = {
    async getTrackers() {
      console.log('[e2eStore] getTrackers -> count:', e2eStore.length);
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
      try { saveE2E(); } catch {}
      console.log('[e2eStore] createTracker -> id:', newTracker.id, 'name:', newTracker.name, 'count:', e2eStore.length);
      return { data: newTracker, error: null };
    },

    async updateTracker(id, input) {
      const idx = e2eStore.findIndex(t => t.id === id);
      if (idx === -1) return { data: null, error: new Error('Not found') };
      e2eStore[idx] = { ...e2eStore[idx], ...(input as any) };
      try { saveE2E(); } catch {}
      return { data: e2eStore[idx], error: null };
    },
    async deleteTracker(id) {
      const idx = e2eStore.findIndex(t => t.id === id);
      if (idx === -1) return { data: null, error: new Error('Not found') };
      e2eStore.splice(idx, 1);
      try { saveE2E(); } catch {}
      return { data: null, error: null };
    },
    async setDefaultTracker(id: string) {
      e2eStore.forEach(t => (t.is_default = t.id === id));
      try { saveE2E(); } catch {}
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

// Expose a small dev helper when running in dev mode so tests can create trackers directly
if (typeof window !== 'undefined' && window.location.search.includes('dev=true')) {
  try {
    (window as any).__dev = (window as any).__dev || {};
    (window as any).__dev.createTracker = async (input: any) => {
      const res = await _tracker.createTracker(input);
      try {
        if (res && res.data) {
          window.dispatchEvent(new CustomEvent('__dev:trackerCreated', { detail: res.data }));
        }
      } catch (e) {}
      return res;
    };
  } catch (e) {
    // ignore
  }
}

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
