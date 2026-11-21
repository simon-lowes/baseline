import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { sanitizeForPrompt } from '../_shared/prompt-sanitizer.ts';
import { suggestNoteChips, jevEnabled } from '../_shared/jev.ts';
import { checkDistributedRateLimit, getDistributedRateLimitHeaders } from '../_shared/distributed-rate-limiter.ts';
import { createSecurityLogger } from '../_shared/security-logger.ts';

// Secure CORS configuration
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'https://localhost:5173',
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Create security logger for this request
  const securityLog = createSecurityLogger(supabaseUrl, supabaseServiceKey, req, 'suggest-note-chips');

  // JWT Authentication - SECURITY: Required to prevent unauthorized API usage
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.*)$/i);

  if (!match) {
    console.error('Missing or invalid Authorization header');
    await securityLog.authFailure('Missing or invalid Authorization header');
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const userToken = match[1];

  // Verify JWT token with Supabase Auth
  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'apikey': supabaseServiceKey,
    },
  });

  if (!userResp.ok) {
    console.error('Invalid or expired token');
    await securityLog.invalidToken();
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const userData = await userResp.json();
  console.log('Authenticated user:', userData.id);

  // Distributed rate limiting - 300 note suggestions per hour per user
  const rateLimitConfig = { maxRequests: 300, windowSeconds: 3600 };
  const rateLimit = await checkDistributedRateLimit(
    supabaseUrl,
    supabaseServiceKey,
    userData.id,
    'suggest-note-chips',
    rateLimitConfig
  );

  const rateLimitHeaders = getDistributedRateLimitHeaders(rateLimit, rateLimitConfig);

  if (!rateLimit.allowed) {
    console.warn('Rate limit exceeded for user:', userData.id);
    await securityLog.rateLimitExceeded(userData.id, rateLimitConfig.maxRequests);
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please try again later.',
        resetAt: rateLimit.resetAt.toISOString(),
      }),
      {
        status: 429,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const empty = { triggers: [], locations: [] };
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } });

  // Off unless TYPESAFE_API_KEY is set: return no suggestions.
  if (!jevEnabled()) return json(empty);

  try {
    const body = await req.json();
    const note = sanitizeForPrompt(String(body?.note ?? ''), { maxLength: 1000 }).value;
    const triggers: string[] = Array.isArray(body?.triggers) ? body.triggers.map(String).slice(0, 40) : [];
    const locations: { value: string; label: string }[] = Array.isArray(body?.locations)
      ? body.locations.slice(0, 40).map((l: { value?: unknown; label?: unknown }) => ({ value: String(l?.value ?? ''), label: String(l?.label ?? '') }))
      : [];
    const already = {
      triggers: Array.isArray(body?.selectedTriggers) ? body.selectedTriggers.map(String) : [],
      locations: Array.isArray(body?.selectedLocations) ? body.selectedLocations.map(String) : [],
      dismissed: Array.isArray(body?.dismissed) ? body.dismissed.map(String) : [],
    };
    return json(await suggestNoteChips(note, triggers, locations, already));
  } catch (err) {
    console.error('suggest-note-chips failed:', err instanceof Error ? err.message : 'unknown');
    return json(empty);
  }
});
