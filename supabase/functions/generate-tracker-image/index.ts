import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkDistributedRateLimit, getDistributedRateLimitHeaders } from '../_shared/distributed-rate-limiter.ts';
import { createSecurityLogger } from '../_shared/security-logger.ts';
import { sanitizeForPrompt } from '../_shared/prompt-sanitizer.ts';
import { generateImageWithRetry } from '../_shared/gemini-image.ts';

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
    Deno.env.get('ALLOWED_ORIGIN'), // Production domain from env
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
  const securityLog = createSecurityLogger(supabaseUrl, supabaseServiceKey, req, 'generate-tracker-image');

  // JWT Authentication
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

  // Distributed rate limiting - 10 image generations per hour per user
  const rateLimitConfig = { maxRequests: 10, windowSeconds: 3600 };
  const rateLimit = await checkDistributedRateLimit(
    supabaseUrl,
    supabaseServiceKey,
    userData.id,
    'generate-tracker-image',
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

  try {
    const body = await req.json();
    const { trackerName, trackerId } = body;

    if (!trackerName || !trackerId) {
      throw new Error('trackerName and trackerId are required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Create Supabase client for storage operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Sanitize user input to prevent prompt injection (see docs/SECURITY.md Section 9.1)
    const sanitized = sanitizeForPrompt(trackerName, { maxLength: 50 });
    if (sanitized.injectionDetected) {
      console.warn('Potential prompt injection detected in trackerName:', trackerName);
      await securityLog.injectionDetected(userData.id, trackerName);
    }
    const safeTrackerName = sanitized.value;

    // Generate image with safety block detection and progressive retry
    const geminiResult = await generateImageWithRetry(safeTrackerName, GEMINI_API_KEY);

    if (!geminiResult.success || !geminiResult.imageData) {
      const status = geminiResult.isContentBlock ? 422 : 500;
      return new Response(
        JSON.stringify({
          error: geminiResult.isContentBlock
            ? 'Could not generate an icon for this tracker name'
            : 'Image generation failed',
          isContentBlock: geminiResult.isContentBlock ?? false,
        }),
        { status, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageData } = geminiResult;

    // Convert base64 to Uint8Array
    const imageBytes = Uint8Array.from(atob(imageData.data), c => c.charCodeAt(0));

    // Generate filename with timestamp to ensure uniqueness
    const timestamp = new Date().getTime();
    const filename = `tracker-${trackerId}-${timestamp}.${imageData.mimeType.split('/')[1]}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tracker-images')
      .upload(filename, imageBytes, {
        contentType: imageData.mimeType,
        cacheControl: '31536000', // Cache for 1 year
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Generate signed URL (valid for 1 year)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('tracker-images')
      .createSignedUrl(uploadData.path, 31536000);

    if (urlError) {
      console.error('Signed URL error:', urlError.message);
      throw new Error(`Failed to create signed URL: ${urlError.message}`);
    }

    return new Response(JSON.stringify({ 
      imageUrl: signedUrlData.signedUrl,
      storagePath: uploadData.path,
      mimeType: imageData.mimeType,
      modelName: 'gemini-2.5-flash-image'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating tracker image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});