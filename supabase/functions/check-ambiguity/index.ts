import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('=== Check Ambiguity Start ===');
  
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { trackerName, allDefinitions } = body;
    
    if (!trackerName) {
      throw new Error('trackerName is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    // Build context for ambiguity check
    let definitionContext = '';
    if (allDefinitions && allDefinitions.length > 0) {
      definitionContext = `Dictionary definitions found:\n${allDefinitions.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}`;
    } else {
      definitionContext = `No dictionary definitions found. Use your knowledge of "${trackerName}".`;
    }
    
    const prompt = `You are helping a health/wellness tracking app determine if a tracker name is ambiguous.

The user wants to create a tracker called "${trackerName}".

${definitionContext}

TASK: Determine if "${trackerName}" is ambiguous in the context of health/wellness/activity tracking.

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
- If AMBIGUOUS: return 2-4 most likely interpretations for health/wellness tracking
- Order interpretations by likelihood (most common first)
- Focus on interpretations that make sense for a TRACKING app (things people would log regularly)`;

    console.log('Calling Gemini API for ambiguity check:', trackerName);
    console.log('Using model: gemini-2.5-flash');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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

    console.log('Gemini response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
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
    
    const result = JSON.parse(jsonText);
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
        interpretations: [],
        errorCode: 'CHECK_AMBIGUITY_ERROR'
      }),
      {
        status: 200, // Return 200 to not block the flow
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
