/**
 * Shared Gemini Image Generation Module
 *
 * Handles image generation with safety block detection and progressive retry.
 * Used by both generate-tracker-image and backfill-tracker-images edge functions.
 */

import { sanitizeForPrompt } from './prompt-sanitizer.ts';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

export interface GeminiImageResult {
  success: boolean;
  imageData?: { data: string; mimeType: string };
  strategy?: 'standard' | 'abstract' | 'generic';
  error?: string;
  isContentBlock?: boolean;
}

/**
 * Check Gemini response for safety blocks at both prompt and candidate level.
 */
export function checkSafetyBlock(data: Record<string, unknown>): {
  blocked: boolean;
  reason?: string;
} {
  // Prompt-level block (request rejected before generation)
  const promptFeedback = data.promptFeedback as
    | { blockReason?: string }
    | undefined;
  if (promptFeedback?.blockReason) {
    return { blocked: true, reason: `prompt_block: ${promptFeedback.blockReason}` };
  }

  // Candidate-level block (generation stopped mid-stream)
  const candidates = data.candidates as
    | Array<{ finishReason?: string }>
    | undefined;
  const finishReason = candidates?.[0]?.finishReason;
  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    return { blocked: true, reason: `finish_reason: ${finishReason}` };
  }

  return { blocked: false };
}

/**
 * Extract image data from a Gemini response.
 */
function extractImageData(
  data: Record<string, unknown>
): { data: string; mimeType: string } | null {
  const candidates = data.candidates as
    | Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>
    | undefined;
  const parts = candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.inlineData && part.inlineData.mimeType?.startsWith('image/') && part.inlineData.data) {
      return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
  }

  return null;
}

/**
 * Build progressively safer prompts for image generation.
 */
function buildPrompts(safeTrackerName: string): Array<{ strategy: GeminiImageResult['strategy']; prompt: string }> {
  return [
    {
      strategy: 'standard',
      prompt: `Create a minimal, clean, flat design icon for a health tracking app. The icon represents: ${safeTrackerName}

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

The icon should visually represent the concept of ${safeTrackerName} in a simple, recognizable way that users will understand at a glance.`,
    },
    {
      strategy: 'abstract',
      prompt: `Create a minimal, clean, flat design icon for a wellness monitoring app.

Style requirements:
- Square 1:1 aspect ratio
- Abstract geometric shapes representing health tracking
- No text, no labels, no human figures
- Suitable for mobile app card display
- Modern healthcare/wellness aesthetic
- Single solid background color
- Icon should be centered and fill most of the square
- Use calming healthcare colors (soft blues, teals, or greens)

The icon should be an abstract, geometric representation of wellness monitoring — think circles, waves, or gentle curves.`,
    },
    {
      strategy: 'generic',
      prompt: `Create a minimal, clean, flat design icon for a health app.

Style requirements:
- Square 1:1 aspect ratio
- A simple medical cross or heartbeat line icon
- No text, no labels, no human figures
- Single solid calming blue or green background
- Icon should be centered and fill most of the square
- Minimal flat design with clean shapes`,
    },
  ];
}

/**
 * Generate a tracker icon image with progressive retry on safety blocks.
 *
 * Tries up to 3 prompts: standard → abstract → generic.
 * Returns structured result with image data or error info.
 */
export async function generateImageWithRetry(
  trackerName: string,
  geminiApiKey: string
): Promise<GeminiImageResult> {
  const sanitized = sanitizeForPrompt(trackerName, { maxLength: 50 });
  const prompts = buildPrompts(sanitized.value);
  let lastError = '';
  let wasContentBlock = false;

  for (const { strategy, prompt } of prompts) {
    try {
      console.log(`[gemini-image] Attempting strategy: ${strategy}`);

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 0.3,
          },
        }),
      });

      if (!response.ok) {
        lastError = `Gemini API error: ${response.status}`;
        console.warn(`[gemini-image] ${strategy} failed: ${lastError}`);
        continue;
      }

      const data = await response.json();

      // Check for safety blocks
      const safety = checkSafetyBlock(data);
      if (safety.blocked) {
        wasContentBlock = true;
        lastError = `Content blocked (${safety.reason})`;
        console.warn(`[gemini-image] ${strategy} blocked: ${safety.reason}`);
        continue;
      }

      // Extract image data
      const imageData = extractImageData(data);
      if (!imageData) {
        lastError = 'No image data in response';
        console.warn(`[gemini-image] ${strategy}: no image data returned`);
        continue;
      }

      console.log(`[gemini-image] Success with strategy: ${strategy}`);
      return { success: true, imageData, strategy };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[gemini-image] ${strategy} exception:`, err);
    }
  }

  return {
    success: false,
    error: lastError,
    isContentBlock: wasContentBlock,
  };
}
