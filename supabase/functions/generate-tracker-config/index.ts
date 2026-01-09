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

  console.log('=== Generate Tracker Config Start ===');
  
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const {
      trackerName,
      definition,
      allDefinitions,
      userDescription,
      selectedInterpretation,
      wikiSummary,
      wikiCategories,
      relatedTerms,
      // NEW: Conversation history for iterative questioning
      conversationHistory,
    } = body as {
      trackerName: string;
      definition?: string;
      allDefinitions?: string[];
      userDescription?: string;
      selectedInterpretation?: string;
      wikiSummary?: string;
      wikiCategories?: string[];
      relatedTerms?: string[];
      conversationHistory?: Array<{ question: string; answer: string }>;
    };
    
    if (!trackerName) {
      console.log('Missing tracker name');
      throw new Error('trackerName is required');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    console.log('API key present:', !!GEMINI_API_KEY);
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    // Build context block from all signals
    const lines: string[] = [];
    if (selectedInterpretation) {
      lines.push(`• User selected interpretation: ${selectedInterpretation}`);
    }
    if (userDescription) {
      lines.push(`• User description: ${userDescription}`);
    }
    if (allDefinitions?.length) {
      lines.push(
        '• Dictionary definitions:',
        ...allDefinitions.map((d: string, i: number) => `   ${i + 1}. ${d}`)
      );
    } else if (definition) {
      lines.push(`• Dictionary definition: ${definition}`);
    }
    if (wikiSummary) {
      lines.push(`• Wikipedia summary: ${wikiSummary}`);
    }
    if (wikiCategories?.length) {
      lines.push(`• Wikipedia categories: ${wikiCategories.join(', ')}`);
    }
    if (relatedTerms?.length) {
      lines.push(`• Related terms (Datamuse): ${relatedTerms.join(', ')}`);
    }
    if (lines.length === 0) {
      lines.push(`• No external context found. Infer the most likely health/wellness meaning of "${trackerName}" that a person would track.`);
    }
    const contextSection = lines.join('\n');

    // Build conversation history section if provided
    const questionCount = conversationHistory?.length ?? 0;
    const conversationSection = conversationHistory?.length
      ? `\nPrevious conversation:\n${conversationHistory.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n\n')}`
      : '';

    // Adjust confidence threshold based on conversation depth
    // Each answered question adds ~0.15 confidence
    const confidenceBoost = Math.min(0.15 * questionCount, 0.35);
    const isConversationalMode = questionCount > 0;
    
    const prompt = `You are helping configure a health/wellness tracking app through ${isConversationalMode ? 'a conversation' : 'analysis'}. The user wants to create a custom tracker called "${trackerName}".

Context signals:
${contextSection}
${conversationSection}

${isConversationalMode ? `CONVERSATION MODE ACTIVE:
- Questions answered so far: ${questionCount}
- Base confidence: 0.4 + ${confidenceBoost.toFixed(2)} from conversation = ${(0.4 + confidenceBoost).toFixed(2)}
- If you have gathered enough context to generate SPECIFIC (non-generic) config, output Shape A
- Otherwise, ask exactly ONE follow-up question (not multiple) that builds on the conversation
- Do NOT repeat questions about topics already answered
- Set "final_question": true if this question will likely give you enough context

` : ''}CRITICAL INTERPRETATION RULES:
1. If a selectedInterpretation is provided above, use ONLY that interpretation - ignore all other definitions.
2. Otherwise, choose the interpretation most relevant to health, wellness, or activity tracking that a PERSON would do.
3. IGNORE dictionary definitions about baseball, cricket, or other sports terminology that uses the word differently (e.g., "fly out" in baseball is NOT what someone means by "Flying" tracker).
4. For ambiguous terms, prefer the most common health/wellness interpretation:
   - "Flying" → travel by air, flying sports (hang gliding, paragliding), or fear of flying - NOT baseball
   - "Running" → the exercise activity
   - "Curling" → the winter sport (if athletic) or possibly hair care
   - "Depression" → mental health condition
5. Avoid generic outputs. NEVER use generic categories like "General/Positive/Negative/Neutral" or triggers like "Note/Important/Follow-up/Recurring". Make locations/triggers specific to the interpreted domain (e.g., for vertigo/dizziness: positional changes, head movement, hydration, medication, sleep, stress, sinus/ear issues, visual triggers).
6. If the term is about dizziness/vertigo/spinning sensation, bias locations to symptom types/positions (e.g., "positional", "head movement", "standing up", "visual trigger", "post-exertion", "ear/sinus related") and triggers to common factors (hydration, sleep, stress, medication, caffeine/alcohol, motion, bright lights).
7. If the term suggests a class or sport (e.g., spinning class), bias locations to modality/intensity/duration and triggers to effort, fatigue, hydration, equipment, recovery.
8. If you cannot confidently generate SPECIFIC locations/triggers (at least 6 locations and 8 triggers) from the context, do NOT output a config. Instead, ask clarifying questions.

Your response MUST be valid JSON and MUST follow one of these two shapes:

Shape A (ready to generate):
{
  "needs_clarification": false,
  "confidence": 0.0-1.0,
  "config": { ...exact config shape below... }
}

Shape B (needs more info):
{
  "needs_clarification": true,
  "confidence": 0.0-1.0,
  "final_question": boolean, // true if answering this should provide enough context
  "questions": ["single contextual question"],
  "reason": "short reason why more detail is needed"
}

If confidence < 0.7 OR you would output generic categories/triggers, return Shape B.
${isConversationalMode ? `In conversational mode, ask exactly ONE focused question that builds on previous answers.` : `For initial clarification, ask 1-3 concrete, narrow questions.`}
Avoid vague prompts like "tell me more". Example questions:
- "Is this about symptoms (dizziness/vertigo) or an activity (spinning class)?"
- "How long do episodes typically last?"
- "Which situations trigger it (turning head, standing up, screens, exercise, travel)?"

Generate a JSON configuration for this tracker. The configuration should be contextually appropriate for tracking "${trackerName}" in a health/wellness app.

For Shape A, the config MUST be this exact structure:
{
  "intensityLabel": "string - what the 1-10 scale measures (e.g., 'Blood Pressure Level', 'Severity')",
  "intensityMinLabel": "string - label for value 1 (e.g., '1 - Low/Normal')",
  "intensityMaxLabel": "string - label for value 10 (e.g., '10 - Very High')",
  "intensityScale": "string - one of: 'low_bad', 'high_bad', or 'neutral'",
  "locationLabel": "string - what categories/types to track (e.g., 'Reading Type', 'Symptom')",
  "locationPlaceholder": "string - placeholder text",
  "triggersLabel": "string - what factors to note (e.g., 'Contributing Factors')",
  "notesLabel": "string - usually 'Notes'",
  "notesPlaceholder": "string - contextual placeholder",
  "addButtonLabel": "string - e.g., 'Log Reading'",
  "formTitle": "string - e.g., 'Log Blood Pressure'",
  "emptyStateTitle": "string - welcome message",
  "emptyStateDescription": "string - 1-2 sentences explaining the value of tracking this",
  "emptyStateBullets": ["string", "string", "string"],
  "entryTitle": "string - e.g., 'Blood Pressure Entry'",
  "deleteConfirmMessage": "string - deletion confirmation",
  "locations": [{"value": "string", "label": "string"}],
  "triggers": ["string"],
  "suggestedHashtags": ["string"]
}

Guidelines:
- emptyStateBullets: exactly 3 benefits of tracking this
- locations: 6-10 relevant categories/types with value (lowercase-hyphenated) and label
- triggers: 8-12 common factors that might affect this
- suggestedHashtags: 5-8 useful hashtags without the # symbol
- Be domain-specific. If the context indicates symptoms (e.g., dizziness/vertigo), include symptom types/positions as locations and likely triggers as triggers. If it's performance/activity, include modality/intensity/frequency as locations and influencing factors as triggers.

For intensityScale:
- "high_bad" if high values are concerning (pain, blood pressure, anxiety)
- "low_bad" if low values are concerning (mood, energy, oxygen levels)
- "neutral" if the scale is just measurement without inherent good/bad (exercise intensity)

Make it medically/scientifically informed but accessible to regular users.`;

    // Call Google Gemini API using gemini-3-flash-preview model
    console.log('Calling Gemini API (gemini-3-flash-preview) for tracker:', trackerName);
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
            // Disable thinking mode to get clean JSON output
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
    console.log('Gemini response candidates:', data.candidates?.length);
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content in Gemini response');
    }

    // Parse and validate JSON - strip any markdown if present
    let jsonText = content.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replaceAll(/```json?\n?/g, '').replaceAll(/```$/g, '').trim();
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate required fields
    if (parsed?.needs_clarification) {
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = parsed?.config ?? parsed;
    const locLabels = Array.isArray(config?.locations) ? config.locations.map((l: any) => String(l?.label || '').toLowerCase()) : [];
    const trigLabels = Array.isArray(config?.triggers) ? config.triggers.map((t: any) => String(t || '').toLowerCase()) : [];
    const genericLocations = ['general', 'positive', 'negative', 'neutral'];
    const genericTriggers = ['note', 'important', 'follow-up', 'recurring'];
    const looksGenericLocations = locLabels.length <= 3 || locLabels.every((l: string) => genericLocations.includes(l));
    const looksGenericTriggers = trigLabels.length <= 4 && trigLabels.every((t: string) => genericTriggers.includes(t));
    if (looksGenericLocations || looksGenericTriggers) {
      // In conversational mode, ask a single focused question
      const questions = isConversationalMode
        ? [`What specific aspects of "${trackerName}" would you like to track? For example, timing, categories, triggers, or measurements.`]
        : [
            `When you say "${trackerName}", what exactly do you want to track?`,
            'What situations, positions, or activities usually trigger it?',
            'What specific categories should the tracker include (types, contexts, or patterns)?',
          ];
      return new Response(
        JSON.stringify({
          needs_clarification: true,
          confidence: 0.3 + confidenceBoost,
          final_question: questionCount >= 2, // If we've asked 2+ questions and still generic, next one should be final
          questions,
          reason: 'Generated configuration was too generic.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const requiredFields = [
      'intensityLabel', 'intensityScale', 'locationLabel',
      'addButtonLabel', 'formTitle', 'emptyStateTitle', 'locations', 'triggers'
    ];
    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return new Response(JSON.stringify({ config }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating tracker config:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
