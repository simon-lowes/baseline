import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { sanitizeForPrompt, sanitizeExternalResponse } from '../_shared/prompt-sanitizer.ts';

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

const MIN_INTERPRETATIONS = 4;
const MAX_INTERPRETATIONS = 8;

type Interpretation = {
  value: string;
  label: string;
  description: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeInterpretations(raw: unknown): Interpretation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const value = typeof item?.value === 'string' ? item.value.trim() : '';
      const label = typeof item?.label === 'string' ? item.label.trim() : '';
      const description = typeof item?.description === 'string' ? item.description.trim() : '';
      if (!value || !label || !description) return null;
      return { value, label, description };
    })
    .filter((item): item is Interpretation => Boolean(item));
}

function buildFallbackInterpretations(trackerName: string): Interpretation[] {
  const term = trackerName.trim();
  const templates = [
    {
      value: 'symptom-condition',
      label: 'Symptom / Condition',
      description: `Tracking "${term}" as a symptom, condition, or health issue.`,
    },
    {
      value: 'activity-exercise',
      label: 'Activity / Exercise',
      description: `Tracking "${term}" as a physical activity or workout.`,
    },
    {
      value: 'habit-behavior',
      label: 'Habit / Behavior',
      description: `Tracking "${term}" as a daily habit or behavior.`,
    },
    {
      value: 'nutrition-intake',
      label: 'Nutrition / Intake',
      description: `Tracking "${term}" as something consumed (food, drink, or supplement).`,
    },
    {
      value: 'measurement-reading',
      label: 'Measurement / Reading',
      description: `Tracking "${term}" as a measurement or health reading.`,
    },
    {
      value: 'device-object',
      label: 'Device / Object',
      description: `Tracking use of "${term}" as an object, tool, or device.`,
    },
  ];

  return templates.map((item) => ({
    ...item,
    value: slugify(item.value),
  }));
}

function ensureInterpretationCount(result: any, trackerName: string): void {
  if (!result || !result.isAmbiguous) {
    if (result) result.interpretations = [];
    return;
  }

  const existing = normalizeInterpretations(result.interpretations);
  const seen = new Set(existing.map((item) => item.value.toLowerCase()));
  const fallback = buildFallbackInterpretations(trackerName);

  for (const candidate of fallback) {
    if (existing.length >= MIN_INTERPRETATIONS) break;
    const key = candidate.value.toLowerCase();
    if (!seen.has(key)) {
      existing.push(candidate);
      seen.add(key);
    }
  }

  result.interpretations = existing.slice(0, MAX_INTERPRETATIONS);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('=== Check Ambiguity Start ===');
  
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { trackerName, allDefinitions, relatedTerms, wikiSummary, wikiCategories } = body;
    
    if (!trackerName) {
      throw new Error('trackerName is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    // Sanitize user input to prevent prompt injection (see docs/SECURITY.md Section 9.1)
    const sanitizedName = sanitizeForPrompt(trackerName, { maxLength: 50 });
    if (sanitizedName.injectionDetected) {
      console.warn('Potential prompt injection detected in trackerName:', trackerName);
    }
    const safeTrackerName = sanitizedName.value;

    // Build context for ambiguity check - sanitize external API responses
    const ctx: string[] = [];
    if (allDefinitions && allDefinitions.length > 0) {
      // Sanitize external API data before including in prompt
      const safeDefinitions = allDefinitions
        .slice(0, 5) // Limit to 5 definitions
        .map((d: string) => sanitizeExternalResponse(d, 200));
      ctx.push('Dictionary definitions:', ...safeDefinitions.map((d: string, i: number) => `${i + 1}. ${d}`));
    }
    if (wikiSummary) {
      ctx.push(`Wikipedia summary: ${sanitizeExternalResponse(wikiSummary, 300)}`);
    }
    if (wikiCategories?.length) {
      const safeCategories = wikiCategories.slice(0, 10).map((c: string) => sanitizeExternalResponse(c, 50));
      ctx.push(`Wikipedia categories: ${safeCategories.join(', ')}`);
    }
    if (relatedTerms?.length) {
      const safeTerms = relatedTerms.slice(0, 10).map((t: string) => sanitizeExternalResponse(t, 30));
      ctx.push(`Related terms: ${safeTerms.join(', ')}`);
    }
    if (ctx.length === 0) ctx.push(`No external context found. Use your knowledge of ${safeTrackerName}.`);
    const definitionContext = ctx.join('\n');

    const prompt = `You are helping a health/wellness tracking app determine if a tracker name is ambiguous.

The user wants to create a tracker called: ${safeTrackerName}

${definitionContext}

TASK: Determine if ${safeTrackerName} is ambiguous in the context of health/wellness/activity tracking.

A term is AMBIGUOUS if:
- It has multiple distinct interpretations that would result in DIFFERENT tracking setups
- The user's intent cannot be reasonably assumed
- Different people would track fundamentally different things with the same word

A term is NOT AMBIGUOUS if:
- It has one obvious primary meaning for tracking (e.g., "Running" → exercise)
- Even with multiple definitions, one clearly dominates for health tracking (e.g., "Depression" → mental health)
- The different meanings would result in essentially the same tracking setup

Examples:
- "Flying" → AMBIGUOUS (pilot training vs hang gliding vs frequent flyer tracking vs fear of flying)
- "Hockey" → AMBIGUOUS (ice hockey vs field hockey - different sports, different metrics)
- "Curling" → AMBIGUOUS (winter sport vs hair styling)
- "Spinning" → AMBIGUOUS (vertigo/dizziness symptom vs spinning class exercise vs spinning yarn/fiber)
- "Running" → NOT AMBIGUOUS (clearly the exercise activity)
- "Migraine" → NOT AMBIGUOUS (clearly the headache condition)
- "Yoga" → NOT AMBIGUOUS (clearly the practice)
- "Reading" → AMBIGUOUS (the hobby vs blood pressure/medical readings)
- "Swimming" → NOT AMBIGUOUS (clearly the exercise)
- "Stress" → NOT AMBIGUOUS (clearly psychological/mental health)
- "Smoking" → NOT AMBIGUOUS (clearly tobacco/vaping use)
- "Walking" → NOT AMBIGUOUS (clearly the exercise)

Return ONLY valid JSON (no markdown, no explanation):
{
  "isAmbiguous": boolean,
  "reason": "string - brief explanation of your decision",
  "interpretations": [
    {
      "value": "string - lowercase-hyphenated identifier (e.g., 'ice-hockey')",
      "label": "string - short display label (e.g., 'Ice Hockey')",
      "description": "string - one sentence explaining what would be tracked"
    }
  ]
}

RULES:
- If NOT ambiguous: return empty interpretations array []
- If AMBIGUOUS: return 4-8 most likely interpretations for health/wellness tracking
- Order interpretations by likelihood (most common first)
- Focus on interpretations that make sense for a TRACKING app (things people would log regularly)`;

    async function callGemini(promptText: string) {
      console.log('Calling Gemini API for ambiguity check:', trackerName);
      console.log('Using model: gemini-2.5-flash');
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.3, // Lower temperature for more consistent classification
              maxOutputTokens: 1024,
              // Disable thinking mode for this simple classification task
              thinkingConfig: {
                thinkingBudget: 0
              },
            },
          }),
        }
      );
      return response;
    }

    let response = await callGemini(prompt);

    console.log('Gemini response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    let data = await response.json();
    console.log('Gemini raw response:', JSON.stringify(data).substring(0, 500));
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in Gemini response');
    }

    console.log('Raw content from Gemini:', content);

    // Parse JSON - strip any markdown if present
    let jsonText = content.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replaceAll(/```json?\n?/g, '').replaceAll(/```$/g, '').trim();
    }
    
    console.log('JSON text after cleanup:', jsonText);
    
    let result = JSON.parse(jsonText);
    const interpCount = Array.isArray(result?.interpretations) ? result.interpretations.length : 0;
    if (result?.isAmbiguous && interpCount < 4) {
      const strongerPrompt = `${prompt}\n\nIMPORTANT: Your last output had too few interpretations. You MUST return 4-8 interpretations if ambiguous.\n- Ensure diversity across plausible domains (symptom/medical, activity/exercise, device/object, hobby/creative, nutrition/intake, measurement/reading) if applicable.\n- If a health symptom interpretation is plausible, include it.\n- If you are unsure, include broader but still trackable interpretations to reach 4-8 options.`;
      response = await callGemini(strongerPrompt);
      if (response.ok) {
        data = await response.json();
        const retryContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (retryContent) {
          let retryJson = retryContent.trim();
          if (retryJson.startsWith('```')) {
            retryJson = retryJson.replaceAll(/```json?\n?/g, '').replaceAll(/```$/g, '').trim();
          }
          try {
            result = JSON.parse(retryJson);
          } catch {}
        }
      }
    }
    ensureInterpretationCount(result, trackerName);
    console.log('Ambiguity check result:', JSON.stringify(result));
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Check ambiguity error:', errorMessage);
    console.error('Full error:', error);
    
    // Return a generic error message to the client to avoid exposing internal details
    return new Response(
      JSON.stringify({ 
        isAmbiguous: false, 
        reason: 'An unexpected error occurred while checking ambiguity.',
        interpretations: []
      }),
      {
        status: 200, // Return 200 to not block the flow
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
