import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== create-default-tracker function start ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.*)$/i);
    if (!match) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ error: 'Invalid user token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const user = await userResp.json();
    const userId = user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Could not determine user id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role client to ensure we can create a tracker even with RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if default tracker exists
    const { data: existing, error: checkErr } = await supabase
      .from('trackers')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .limit(1);

    if (checkErr) {
      console.error('Error checking existing default tracker:', checkErr);
      throw checkErr;
    }

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ message: 'Default tracker already exists', trackerId: existing[0].id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call the DB function to create the default tracker
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_default_tracker', { p_user_id: userId });

    if (rpcError) {
      console.error('Error creating default tracker via RPC:', rpcError);
      throw rpcError;
    }

    const createdTrackerId = rpcData;

    return new Response(JSON.stringify({ message: 'Default tracker created', trackerId: createdTrackerId }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('create-default-tracker error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});