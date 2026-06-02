/**
 * Prompt Sanitization Utilities
 *
 * Prevents prompt injection attacks when embedding user input in AI prompts.
 * See: docs/SECURITY.md Section 9.1
 */

// Patterns commonly used in prompt injection attacks.
// NOTE: each pattern uses the global flag so EVERY occurrence is neutralized
// (a non-global replace would leave repeated injection phrases in the output).
// Because the `g` flag makes RegExp.prototype.test stateful (it advances
// lastIndex), callers must reset lastIndex to 0 before reusing a pattern.
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)/gi,
  /forget\s+(all\s+)?(previous|above|prior)/gi,
  /disregard\s+(all\s+)?(previous|above|prior)/gi,
  /new\s+instruction/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /user\s*:/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
];

/**
 * Replace every occurrence of any injection pattern with a safe placeholder.
 * Returns the neutralized string and whether any pattern matched.
 */
function neutralizeInjectionPatterns(input: string): { value: string; detected: boolean } {
  let value = input;
  let detected = false;
  for (const pattern of INJECTION_PATTERNS) {
    // Reset stateful lastIndex (patterns are global) before testing/replacing.
    pattern.lastIndex = 0;
    if (pattern.test(value)) {
      detected = true;
      pattern.lastIndex = 0;
      value = value.replace(pattern, '[blocked]');
    }
  }
  return { value, detected };
}

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

  // Step 4: Check for injection patterns (neutralize ALL occurrences)
  if (checkInjection) {
    const neutralized = neutralizeInjectionPatterns(value);
    value = neutralized.value;
    injectionDetected = neutralized.detected;
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
  const cleaned = text
    .replace(/["'`\\<>{}]/g, ' ')  // Remove prompt-breaking chars
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim();

  // Neutralize injection patterns too: external API content (Wikipedia,
  // Datamuse, dictionary definitions) can be attacker-influenced and is embedded
  // directly into AI prompts, so it must also be scrubbed for second-order
  // (indirect) prompt injection — not just stripped of structural characters.
  const { value } = neutralizeInjectionPatterns(cleaned);

  return value.slice(0, maxLength);
}
