import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate-limiter.ts';

// Secure CORS configuration
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    Deno.env.get('ALLOWED_ORIGIN'),
  ].filter(Boolean);

  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed as string));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

interface FieldSuggestion {
  id: string;
  type: 'number_scale' | 'single_select' | 'multi_select' | 'text' | 'toggle';
  label: string;
  required: boolean;
  order: number;
  config: any;
  reasoning: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // JWT Authentication
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.*)$/i);

  if (!match) {
    console.error('Missing or invalid Authorization header');
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const userToken = match[1];
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

  // Rate limiting - 20 field generations per hour per user
  const rateLimit = checkRateLimit(userData.id, {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  const rateLimitHeaders = getRateLimitHeaders(rateLimit, {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    console.warn('Rate limit exceeded for user:', userData.id);
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please try again later.',
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      }),
      {
        status: 429,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  console.log('=== Generate Tracker Fields Start ===');

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));

    const { trackerName, context, previousSuggestions } = body;

    if (!trackerName) {
      throw new Error('trackerName is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Build prompt with context
    const previousFieldNames = previousSuggestions?.map((s: any) => s.label).join(', ') || 'none';

    const prompt = `You are helping design custom fields for a health/wellness tracking app.

Tracker name: "${trackerName}"
Context: ${context || 'General health tracking'}
Previously suggested fields: ${previousFieldNames}

Generate 3-5 useful custom fields for this tracker. Each field should:
- Be relevant and practical for tracking "${trackerName}"
- NOT duplicate any previously suggested fields
- Use appropriate field types (number_scale, single_select, multi_select, text, toggle)
- Include clear reasoning for why this field is useful

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.

Return a JSON array of field suggestions with this structure:
[
  {
    "type": "number_scale",
    "label": "Severity",
    "required": true,
    "config": {
      "type": "number_scale",
      "min": 1,
      "max": 10,
      "step": 1,
      "labels": ["Mild", "Moderate", "Severe"]
    },
    "reasoning": "Tracking severity helps identify patterns and triggers"
  },
  {
    "type": "single_select",
    "label": "Time of Day",
    "required": false,
    "config": {
      "type": "single_select",
      "options": ["Morning", "Afternoon", "Evening", "Night"]
    },
    "reasoning": "Understanding when symptoms occur can reveal circadian patterns"
  }
]

Field types available:
- number_scale: For ratings/scales (config: min, max, step, labels?)
- single_select: Choose one option (config: options array)
- multi_select: Choose multiple options (config: options array)
- text: Free text input (config: multiline boolean, placeholder?)
- toggle: Yes/No switch (config: onLabel?, offLabel?)

Generate contextually appropriate fields now:`;

    console.log('Calling Gemini API...');
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response:', JSON.stringify(geminiData));

    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('No text generated from Gemini');
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let fieldsData: any[];
    try {
      // Remove markdown code blocks if present
      let cleanedText = generatedText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
      }
      fieldsData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', generatedText);
      throw new Error('Failed to parse field suggestions from AI response');
    }

    // Add IDs and order to suggestions
    const suggestions: FieldSuggestion[] = fieldsData.map((field, index) => ({
      id: `field-${Date.now()}-${index}`,
      order: index,
      ...field,
    }));

    console.log('Generated suggestions:', suggestions.length);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
