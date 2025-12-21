/**
 * Supabase Client
 * Shared Supabase client instance for all Supabase adapters
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars are missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
