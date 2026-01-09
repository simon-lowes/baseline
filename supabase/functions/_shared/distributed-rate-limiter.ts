/**
 * Distributed Rate Limiter for Edge Functions
 *
 * Uses Supabase database for persistence across function instances.
 * This replaces the in-memory rate limiter which resets on function restarts.
 *
 * @see docs/SECURITY.md Section 5.3
 */

export interface DistributedRateLimitConfig {
  maxRequests: number;      // Max requests per window
  windowSeconds: number;    // Window size in seconds (default: 3600 = 1 hour)
}

export interface DistributedRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  currentCount: number;
}

/**
 * Check rate limit using Supabase database
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key
 * @param userId - User ID from JWT
 * @param endpoint - Endpoint name (e.g., 'generate-tracker-config')
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkDistributedRateLimit(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  endpoint: string,
  config: DistributedRateLimitConfig
): Promise<DistributedRateLimitResult> {
  const windowSeconds = config.windowSeconds || 3600;

  try {
    // Call the database function to check and increment rate limit
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_endpoint: endpoint,
        p_max_requests: config.maxRequests,
        p_window_seconds: windowSeconds,
      }),
    });

    if (!response.ok) {
      console.error('Rate limit check failed:', response.status, await response.text());
      // On error, allow the request but log it (fail open for availability)
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
        currentCount: 0,
      };
    }

    const result = await response.json();

    // Handle array response (PostgREST returns array for function calls)
    const data = Array.isArray(result) ? result[0] : result;

    if (!data) {
      console.error('Empty rate limit response');
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
        currentCount: 0,
      };
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      resetAt: new Date(data.reset_at),
      currentCount: data.current_count,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow the request but log it (fail open for availability)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
      currentCount: 0,
    };
  }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getDistributedRateLimitHeaders(
  result: DistributedRateLimitResult,
  config: DistributedRateLimitConfig
): Record<string, string> {
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}
