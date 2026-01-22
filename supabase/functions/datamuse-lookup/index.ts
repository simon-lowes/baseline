import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

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
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

const DATAMUSE_URL = 'https://api.datamuse.com/words';
const DEFAULT_MAX = 10;
const MAX_TERMS = 50;

function parseMax(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(Math.max(Math.floor(value), 1), MAX_TERMS);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, 1), MAX_TERMS);
    }
  }
  return DEFAULT_MAX;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // JWT Authentication - Require valid user token
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.*)$/i);

  if (!match) {
    console.error('Missing or invalid Authorization header');
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userToken = match[1];

  // Verify token by fetching user from Supabase Auth
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

  try {
    let term = '';
    let max = DEFAULT_MAX;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      term = (url.searchParams.get('term') ?? '').trim();
      max = parseMax(url.searchParams.get('max'));
    } else {
      const body = await req.json().catch(() => ({}));
      term = typeof body?.term === 'string' ? body.term.trim() : '';
      max = parseMax(body?.max);
    }

    if (!term) {
      return new Response(JSON.stringify({ terms: [] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(DATAMUSE_URL);
    url.searchParams.set('ml', term);
    url.searchParams.set('max', String(max));

    const response = await fetch(url.toString(), { method: 'GET' });
    if (!response.ok) {
      return new Response(JSON.stringify({ terms: [] }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify({ terms: [] }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const terms = data
      .map((item: { word?: unknown }) => (typeof item?.word === 'string' ? item.word.trim() : ''))
      .filter((word: string) => word.length > 0);

    return new Response(JSON.stringify({ terms }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ terms: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
