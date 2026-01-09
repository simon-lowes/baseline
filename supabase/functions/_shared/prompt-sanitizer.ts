/**
 * Prompt Sanitization Utilities
 *
 * Prevents prompt injection attacks when embedding user input in AI prompts.
 * See: docs/SECURITY.md Section 9.1
 */

// Patterns commonly used in prompt injection attacks
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)/i,
  /forget\s+(all\s+)?(previous|above|prior)/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /new\s+instruction/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /user\s*:/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
];

export interface SanitizeOptions {
  /** Maximum length of output (default: 100) */
  maxLength?: number;
  /** Allow newlines (default: false) */
  allowNewlines?: boolean;
  /** Check for injection patterns (default: true) */
  checkInjection?: boolean;
}

export interface SanitizeResult {
  /** Sanitized string safe for prompts */
  value: string;
  /** Whether potential injection was detected */
  injectionDetected: boolean;
  /** Whether the input was truncated */
  wasTruncated: boolean;
  /** Original input length */
  originalLength: number;
}

/**
 * Sanitize user input for safe embedding in AI prompts
 *
 * @param input - Raw user input
 * @param options - Sanitization options
 * @returns Sanitized result with metadata
 *
 * @example
 * ```typescript
 * const result = sanitizeForPrompt(trackerName, { maxLength: 50 });
 * if (result.injectionDetected) {
 *   console.warn('Potential injection attempt detected');
 * }
 * const prompt = `Create an icon for: ${result.value}`;
 * ```
 */
export function sanitizeForPrompt(
  input: string,
  options: SanitizeOptions = {}
): SanitizeResult {
  const {
    maxLength = 100,
    allowNewlines = false,
    checkInjection = true,
  } = options;

  const originalLength = input.length;
  let value = input;
  let injectionDetected = false;

  // Step 1: Remove dangerous characters that could break prompt structure
  // Remove quotes (could close string literals)
  // Remove backslashes (escape sequences)
  // Remove angle brackets (could look like XML/HTML tags)
  // Remove curly braces (could look like template literals)
  value = value.replace(/["'`\\<>{}]/g, ' ');

  // Step 2: Handle newlines
  if (!allowNewlines) {
    value = value.replace(/[\n\r]/g, ' ');
  }

  // Step 3: Normalize whitespace
  value = value.replace(/\s+/g, ' ').trim();

  // Step 4: Check for injection patterns
  if (checkInjection) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        injectionDetected = true;
        // Replace the matched pattern with safe placeholder
        value = value.replace(pattern, '[blocked]');
      }
    }
  }

  // Step 5: Truncate to max length
  const wasTruncated = value.length > maxLength;
  if (wasTruncated) {
    value = value.slice(0, maxLength).trim();
    // Ensure we don't cut in the middle of a word
    const lastSpace = value.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      value = value.slice(0, lastSpace).trim();
    }
  }

  return {
    value,
    injectionDetected,
    wasTruncated,
    originalLength,
  };
}

/**
 * Sanitize an array of strings for prompt embedding
 */
export function sanitizeArrayForPrompt(
  inputs: string[],
  options: SanitizeOptions = {}
): SanitizeResult[] {
  return inputs.map(input => sanitizeForPrompt(input, options));
}

/**
 * Quick sanitize for simple cases - returns just the string
 */
export function quickSanitize(input: string, maxLength = 50): string {
  return sanitizeForPrompt(input, { maxLength }).value;
}

/**
 * Sanitize external API response text before including in prompts
 * More permissive than user input sanitization
 */
export function sanitizeExternalResponse(
  text: string,
  maxLength = 500
): string {
  return text
    .replace(/["'`\\<>{}]/g, ' ')  // Remove prompt-breaking chars
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim()
    .slice(0, maxLength);
}
