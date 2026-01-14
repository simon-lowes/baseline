/**
 * AI Actions for Tracker Configuration
 *
 * Convex actions that call external APIs (Gemini, Datamuse).
 * Actions can make HTTP requests unlike queries/mutations.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

// Helper to sanitize user input for prompts
function sanitizeForPrompt(
  input: string,
  maxLength: number = 100
): { value: string; injectionDetected: boolean } {
  let injectionDetected = false;

  // Check for common injection patterns
  const injectionPatterns = [
    /ignore\s+(previous|above|all)/i,
    /disregard\s+(previous|above|all)/i,
    /forget\s+(previous|above|all)/i,
    /system\s*:/i,
    /assistant\s*:/i,
    /user\s*:/i,
    /<\/?[a-z]+>/i,
    /\{\{.*\}\}/,
    /\$\{.*\}/,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      injectionDetected = true;
      break;
    }
  }

  // Sanitize the input
  const sanitized = input
    .slice(0, maxLength)
    .replace(/[<>{}$`\\]/g, "")
    .trim();

  return { value: sanitized, injectionDetected };
}

// Helper to sanitize external API responses
function sanitizeExternalResponse(input: string, maxLength: number = 200): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>{}$`\\]/g, "")
    .trim();
}

/**
 * Check if a tracker name is ambiguous.
 * Returns interpretations if the name has multiple meanings.
 */
export const checkAmbiguity = action({
  args: {
    trackerName: v.string(),
    allDefinitions: v.optional(v.array(v.string())),
    relatedTerms: v.optional(v.array(v.string())),
    wikiSummary: v.optional(v.string()),
    wikiCategories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Sanitize input
    const sanitized = sanitizeForPrompt(args.trackerName, 50);
    const safeTrackerName = sanitized.value;

    // Build context
    const contextLines: string[] = [];
    if (args.allDefinitions?.length) {
      const safeDefs = args.allDefinitions
        .slice(0, 5)
        .map((d) => sanitizeExternalResponse(d, 200));
      contextLines.push(
        "Dictionary definitions:",
        ...safeDefs.map((d, i) => `${i + 1}. ${d}`)
      );
    }
    if (args.wikiSummary) {
      contextLines.push(
        `Wikipedia summary: ${sanitizeExternalResponse(args.wikiSummary, 300)}`
      );
    }
    if (args.wikiCategories?.length) {
      const safeCats = args.wikiCategories
        .slice(0, 10)
        .map((c) => sanitizeExternalResponse(c, 50));
      contextLines.push(`Wikipedia categories: ${safeCats.join(", ")}`);
    }
    if (args.relatedTerms?.length) {
      const safeTerms = args.relatedTerms
        .slice(0, 10)
        .map((t) => sanitizeExternalResponse(t, 30));
      contextLines.push(`Related terms: ${safeTerms.join(", ")}`);
    }
    if (contextLines.length === 0) {
      contextLines.push(
        `No external context found. Use your knowledge of ${safeTrackerName}.`
      );
    }

    const prompt = `You are helping a health/wellness tracking app determine if a tracker name is ambiguous.

The user wants to create a tracker called: ${safeTrackerName}

${contextLines.join("\n")}

TASK: Determine if ${safeTrackerName} is ambiguous in the context of health/wellness/activity tracking.

A term is AMBIGUOUS if:
- It has multiple distinct interpretations that would result in DIFFERENT tracking setups
- The user's intent cannot be reasonably assumed
- Different people would track fundamentally different things with the same word

A term is NOT AMBIGUOUS if:
- It has one obvious primary meaning for tracking (e.g., "Running" → exercise)
- Even with multiple definitions, one clearly dominates for health tracking
- The different meanings would result in essentially the same tracking setup

Examples:
- "Flying" → AMBIGUOUS (pilot training vs hang gliding vs frequent flyer tracking vs fear of flying)
- "Hockey" → AMBIGUOUS (ice hockey vs field hockey)
- "Spinning" → AMBIGUOUS (vertigo/dizziness vs spinning class vs spinning yarn)
- "Running" → NOT AMBIGUOUS (clearly the exercise activity)
- "Migraine" → NOT AMBIGUOUS (clearly the headache condition)
- "Swimming" → NOT AMBIGUOUS (clearly the exercise)

Return ONLY valid JSON:
{
  "isAmbiguous": boolean,
  "reason": "string - brief explanation",
  "interpretations": [
    {
      "value": "string - lowercase-hyphenated identifier",
      "label": "string - short display label",
      "description": "string - one sentence explaining what would be tracked"
    }
  ]
}

RULES:
- If NOT ambiguous: return empty interpretations array []
- If AMBIGUOUS: return 4-8 most likely interpretations for health/wellness tracking
- Order interpretations by likelihood (most common first)`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in Gemini response");
    }

    // Parse JSON
    let jsonText = content.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    return JSON.parse(jsonText);
  },
});

/**
 * Generate tracker configuration using AI.
 * Creates field labels, categories, triggers, etc. based on the tracker type.
 */
export const generateTrackerConfig = action({
  args: {
    trackerName: v.string(),
    definition: v.optional(v.string()),
    allDefinitions: v.optional(v.array(v.string())),
    userDescription: v.optional(v.string()),
    selectedInterpretation: v.optional(v.string()),
    wikiSummary: v.optional(v.string()),
    wikiCategories: v.optional(v.array(v.string())),
    relatedTerms: v.optional(v.array(v.string())),
    conversationHistory: v.optional(
      v.array(v.object({ question: v.string(), answer: v.string() }))
    ),
  },
  handler: async (ctx, args) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Sanitize input
    const sanitizedName = sanitizeForPrompt(args.trackerName, 50);
    const safeTrackerName = sanitizedName.value;

    // Build context
    const lines: string[] = [];
    if (args.selectedInterpretation) {
      lines.push(
        `• User selected interpretation: ${sanitizeExternalResponse(args.selectedInterpretation, 200)}`
      );
    }
    if (args.userDescription) {
      const sanitizedDesc = sanitizeForPrompt(args.userDescription, 500);
      lines.push(`• User description: ${sanitizedDesc.value}`);
    }
    if (args.allDefinitions?.length) {
      const safeDefs = args.allDefinitions
        .slice(0, 5)
        .map((d) => sanitizeExternalResponse(d, 200));
      lines.push(
        "• Dictionary definitions:",
        ...safeDefs.map((d, i) => `   ${i + 1}. ${d}`)
      );
    } else if (args.definition) {
      lines.push(
        `• Dictionary definition: ${sanitizeExternalResponse(args.definition, 200)}`
      );
    }
    if (args.wikiSummary) {
      lines.push(
        `• Wikipedia summary: ${sanitizeExternalResponse(args.wikiSummary, 300)}`
      );
    }
    if (lines.length === 0) {
      lines.push(
        `• No external context found. Infer the most likely health/wellness meaning of "${safeTrackerName}" that a person would track.`
      );
    }

    const questionCount = args.conversationHistory?.length ?? 0;
    const conversationSection = args.conversationHistory?.length
      ? `\nPrevious conversation:\n${args.conversationHistory
          .map((h, i) => {
            const sanitizedAnswer = sanitizeForPrompt(h.answer, 500);
            return `Q${i + 1}: ${h.question}\nA${i + 1}: ${sanitizedAnswer.value}`;
          })
          .join("\n\n")}`
      : "";

    const confidenceBoost = Math.min(0.15 * questionCount, 0.35);
    const isConversationalMode = questionCount > 0;

    const prompt = `You are helping configure a health/wellness tracking app. The user wants to create a custom tracker called "${safeTrackerName}".

Context signals:
${lines.join("\n")}
${conversationSection}

${isConversationalMode ? `CONVERSATION MODE ACTIVE:
- Questions answered so far: ${questionCount}
- Base confidence: 0.4 + ${confidenceBoost.toFixed(2)} = ${(0.4 + confidenceBoost).toFixed(2)}
- If you have enough context, output Shape A
- Otherwise, ask exactly ONE follow-up question
- Set "final_question": true if this question will likely give you enough context

` : ""}Generate a JSON configuration for this tracker.

Your response MUST be valid JSON and follow one of these shapes:

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
  "final_question": boolean,
  "questions": ["single contextual question"],
  "reason": "short reason why more detail is needed"
}

If confidence < 0.7 OR you would output generic categories, return Shape B.

For Shape A, the config MUST be:
{
  "intensityLabel": "string - what the 1-10 scale measures",
  "intensityMinLabel": "string - label for value 1",
  "intensityMaxLabel": "string - label for value 10",
  "intensityScale": "string - one of: 'low_bad', 'high_bad', or 'neutral'",
  "locationLabel": "string - what categories to track",
  "locationPlaceholder": "string - placeholder text",
  "triggersLabel": "string - what factors to note",
  "notesLabel": "string - usually 'Notes'",
  "notesPlaceholder": "string - contextual placeholder",
  "addButtonLabel": "string - e.g., 'Log Entry'",
  "formTitle": "string - e.g., 'Log ${safeTrackerName}'",
  "emptyStateTitle": "string - welcome message",
  "emptyStateDescription": "string - 1-2 sentences",
  "emptyStateBullets": ["string", "string", "string"],
  "entryTitle": "string - e.g., '${safeTrackerName} Entry'",
  "deleteConfirmMessage": "string - deletion confirmation",
  "locations": [{"value": "string", "label": "string"}],
  "triggers": ["string"],
  "suggestedHashtags": ["string"]
}

Guidelines:
- emptyStateBullets: exactly 3 benefits of tracking this
- locations: 6-10 relevant categories with value (lowercase-hyphenated) and label
- triggers: 8-12 common factors
- suggestedHashtags: 5-8 useful hashtags without #
- Be domain-specific, not generic`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in Gemini response");
    }

    // Parse JSON
    let jsonText = content.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const parsed = JSON.parse(jsonText);

    if (parsed?.needs_clarification) {
      return parsed;
    }

    const config = parsed?.config ?? parsed;
    return { config };
  },
});

/**
 * Generate a tracker icon image using AI.
 * Returns base64 encoded image data.
 */
export const generateTrackerImage = action({
  args: {
    trackerName: v.string(),
    trackerId: v.string(),
  },
  handler: async (ctx, args) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Sanitize input
    const sanitized = sanitizeForPrompt(args.trackerName, 50);
    const safeTrackerName = sanitized.value;

    const imagePrompt = `Create a minimal, clean, flat design icon for a health tracking app. The icon represents: ${safeTrackerName}

Style requirements:
- Square 1:1 aspect ratio
- Minimal flat design
- Clean simple shapes
- No text or labels in the image
- Suitable for mobile app card display
- Modern healthcare/wellness aesthetic
- Single solid background color
- Icon should be centered and fill most of the square
- Use healthcare-appropriate colors (blues, greens, or neutral tones)

The icon should visually represent the concept of ${safeTrackerName} in a simple, recognizable way.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini Image API error: ${response.status}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];

    let imageData: { data: string; mimeType: string } | null = null;
    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith("image/")) {
        imageData = part.inlineData as { data: string; mimeType: string };
        break;
      }
    }

    if (!imageData || !imageData.data) {
      throw new Error("No image data in Gemini response");
    }

    // Return base64 data - the frontend can handle storage
    return {
      imageData: imageData.data,
      mimeType: imageData.mimeType,
      modelName: "gemini-2.0-flash-exp",
    };
  },
});

/**
 * Look up related terms using Datamuse API.
 */
export const datamuseLookup = action({
  args: {
    term: v.string(),
    max: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const term = args.term.trim();
    if (!term) {
      return { terms: [] };
    }

    const max = Math.min(Math.max(args.max ?? 10, 1), 50);

    const url = new URL("https://api.datamuse.com/words");
    url.searchParams.set("ml", term);
    url.searchParams.set("max", String(max));

    const response = await fetch(url.toString());
    if (!response.ok) {
      return { terms: [] };
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return { terms: [] };
    }

    const terms = data
      .map((item: { word?: unknown }) =>
        typeof item?.word === "string" ? item.word.trim() : ""
      )
      .filter((word: string) => word.length > 0);

    return { terms };
  },
});
