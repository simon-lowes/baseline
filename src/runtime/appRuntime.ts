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
export const auth: AuthPort = hasSupabaseEnv ? supabaseAuth : noopAuth;

/**
 * Database
 * Uses Supabase if env vars present
 */
export const db: DbPort = supabaseDb;

/**
 * Tracker Service
 * Manages user trackers (multiple tracking types per user)
 */
export const tracker: TrackerPort = supabaseTracker;

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
