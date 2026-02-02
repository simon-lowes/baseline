import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
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

// Rate limiting configuration
const RATE_LIMIT_PER_MINUTE = 10; // Max images to generate per minute
const RATE_LIMIT_DELAY_MS = 6000; // 6 seconds between image generations

interface BackfillProgress {
  totalTrackers: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

// Simple in-memory rate limiter (resets on function restart)
let lastGenerationTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastGeneration = now - lastGenerationTime;
  
  if (timeSinceLastGeneration < RATE_LIMIT_DELAY_MS) {
    const waitTime = RATE_LIMIT_DELAY_MS - timeSinceLastGeneration;
    console.log(`Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastGenerationTime = Date.now();
}

async function generateImageForTracker(
  trackerId: string, 
  trackerName: string,
  supabase: any,
  geminiApiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Generating image for tracker: ${trackerName} (ID: ${trackerId})`);
    
    // Apply rate limiting
    await rateLimit();
    
    // Generate image with safety block detection and progressive retry
    const geminiResult = await generateImageWithRetry(trackerName, geminiApiKey);

    if (!geminiResult.success || !geminiResult.imageData) {
      return { success: false, error: geminiResult.error || 'Image generation failed' };
    }

    const imageData = geminiResult.imageData;

    // Convert base64 to Uint8Array
    const imageBytes = Uint8Array.from(atob(imageData.data), c => c.charCodeAt(0));
    
    // Generate filename
    const timestamp = new Date().getTime();
    const filename = `tracker-${trackerId}-${timestamp}.${imageData.mimeType.split('/')[1]}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tracker-images')
      .upload(filename, imageBytes, {
        contentType: imageData.mimeType,
        cacheControl: '31536000',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Generate signed URL
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('tracker-images')
      .createSignedUrl(uploadData.path, 31536000);

    if (urlError) {
      console.error('Signed URL error:', urlError);
      return { success: false, error: `URL generation failed: ${urlError.message}` };
    }

    // Update tracker with image info
    const { error: updateError } = await supabase
      .from('trackers')
      .update({
        image_url: signedUrlData.signedUrl,
        image_generated_at: new Date().toISOString(),
        image_model_name: 'gemini-2.5-flash-image',
        updated_at: new Date().toISOString(),
      })
      .eq('id', trackerId);

    if (updateError) {
      console.error('Tracker update error:', updateError);
      return { success: false, error: `Update failed: ${updateError.message}` };
    }

    console.log(`Successfully generated and stored image for tracker ${trackerId}`);
    return { success: true };

  } catch (error) {
    console.error('Image generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
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

  const userData = await userResp.json();
  console.log('Authenticated user:', userData.id);

  console.log('=== Backfill Tracker Images Start ===');
  
  try {
    const body = await req.json();
    const { dryRun = false, batchSize = 5 } = body;
    
    console.log('Backfill configuration:', { dryRun, batchSize });
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Create Supabase client (reusing env vars from auth section)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Find trackers that need images (idempotent - only process trackers without images)
    console.log('Querying trackers without images...');
    const { data: trackers, error: queryError } = await supabase
      .from('trackers')
      .select('id, name, image_url')
      .is('image_url', null)
      .limit(batchSize);
    
    if (queryError) {
      throw new Error(`Failed to query trackers: ${queryError.message}`);
    }
    
    if (!trackers || trackers.length === 0) {
      console.log('No trackers need images - backfill complete');
      return new Response(JSON.stringify({ 
        message: 'No trackers need images',
        progress: {
          totalTrackers: 0,
          processedCount: 0,
          successCount: 0,
          errorCount: 0,
          errors: []
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${trackers.length} trackers that need images`);
    
    const progress: BackfillProgress = {
      totalTrackers: trackers.length,
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Process each tracker
    for (const tracker of trackers) {
      console.log(`Processing tracker: ${tracker.name} (${tracker.id})`);
      
      if (dryRun) {
        console.log(`[DRY RUN] Would generate image for: ${tracker.name}`);
        progress.successCount++;
      } else {
        const result = await generateImageForTracker(
          tracker.id,
          tracker.name,
          supabase,
          GEMINI_API_KEY
        );
        
        if (result.success) {
          progress.successCount++;
        } else {
          progress.errorCount++;
          progress.errors.push(`${tracker.name}: ${result.error}`);
        }
      }
      
      progress.processedCount++;
      
      // Log progress
      const percentComplete = Math.round((progress.processedCount / progress.totalTrackers) * 100);
      console.log(`Progress: ${progress.processedCount}/${progress.totalTrackers} (${percentComplete}%)`);
    }
    
    console.log('Backfill completed:', progress);
    
    return new Response(JSON.stringify({ 
      message: dryRun ? 'Dry run completed' : 'Backfill completed',
      progress 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});