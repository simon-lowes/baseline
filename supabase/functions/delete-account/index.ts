import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Delete Account Edge Function
 *
 * Securely deletes a user's account and all associated data.
 * This requires admin privileges (service role key) which is why
 * it must be done server-side.
 *
 * GDPR Article 17 (Right to Erasure) compliant - deletes all user data.
 *
 * Deletion order respects foreign key constraints:
 * 1. tracker_entries (references trackers and user_id)
 * 2. trackers (references user_id)
 * 3. profiles (references auth.users)
 * 4. auth.users (the user account itself)
 */

// Secure CORS configuration
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost:5174',
    'https://localhost:5174',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:5173',
    'https://127.0.0.1:5173',
    Deno.env.get('ALLOWED_ORIGIN'),
  ].filter(Boolean);

  const isAllowed = allowedOrigins.some(allowed => allowed && origin === allowed);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('=== delete-account function start ===');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    // Extract and validate authorization header
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.*)$/i);

    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userToken = match[1];

    // Verify token and fetch user
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'apikey': supabaseServiceKey,
      },
    });

    if (!userResp.ok) {
      const text = await userResp.text();
      console.error('Failed to verify user token:', userResp.status, text);
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = await userResp.json();
    const userId = user?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine user id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting account for user: ${userId}`);

    // Use service role client to bypass RLS and perform deletions
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete in order respecting foreign key constraints:

    // 1. Delete all tracker entries for this user
    const { error: entriesError, count: entriesCount } = await supabase
      .from('tracker_entries')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (entriesError) {
      console.error('Error deleting tracker_entries:', entriesError);
      throw new Error(`Failed to delete tracker entries: ${entriesError.message}`);
    }
    console.log(`Deleted ${entriesCount ?? 0} tracker entries`);

    // 2. Delete all trackers for this user
    const { error: trackersError, count: trackersCount } = await supabase
      .from('trackers')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (trackersError) {
      console.error('Error deleting trackers:', trackersError);
      throw new Error(`Failed to delete trackers: ${trackersError.message}`);
    }
    console.log(`Deleted ${trackersCount ?? 0} trackers`);

    // 3. Delete the user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      // Profile might not exist, log but don't fail
      console.warn('Error deleting profile (may not exist):', profileError);
    } else {
      console.log('Deleted profile');
    }

    // 4. Delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      throw new Error(`Failed to delete auth user: ${authError.message}`);
    }
    console.log('Deleted auth user');

    console.log('=== delete-account function complete ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
        deleted: {
          entries: entriesCount ?? 0,
          trackers: trackersCount ?? 0,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('delete-account error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
