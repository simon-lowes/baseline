/**
 * Security Event Logger for Edge Functions
 *
 * Logs security events to Supabase for monitoring and incident response.
 * Events include: auth failures, rate limit violations, suspicious patterns.
 *
 * @see docs/SECURITY.md Section 10.3
 */

export type SecurityEventType =
  | 'auth_failure'           // Failed authentication attempt
  | 'auth_invalid_token'     // Invalid or expired JWT token
  | 'rate_limit_exceeded'    // Rate limit violation
  | 'rate_limit_warning'     // Approaching rate limit (80%+)
  | 'injection_detected'     // Potential prompt injection detected
  | 'suspicious_input'       // Suspicious input pattern
  | 'cors_violation'         // CORS origin not in whitelist
  | 'config_error';          // Server configuration error

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventDetails {
  message?: string;
  input?: string;
  pattern?: string;
  remaining?: number;
  limit?: number;
  origin?: string;
  [key: string]: unknown;
}

/**
 * Log a security event to the database
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key
 * @param eventType - Type of security event
 * @param severity - Severity level
 * @param options - Additional event details
 */
export async function logSecurityEvent(
  supabaseUrl: string,
  supabaseServiceKey: string,
  eventType: SecurityEventType,
  severity: SecuritySeverity,
  options: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    details?: SecurityEventDetails;
  } = {}
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/log_security_event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        p_event_type: eventType,
        p_severity: severity,
        p_user_id: options.userId || null,
        p_ip_address: options.ipAddress || null,
        p_user_agent: options.userAgent || null,
        p_endpoint: options.endpoint || null,
        p_details: options.details ? JSON.stringify(options.details) : null,
      }),
    });

    if (!response.ok) {
      // Log to console but don't throw - security logging shouldn't break the request
      console.error('Failed to log security event:', response.status, await response.text());
    }
  } catch (error) {
    // Log to console but don't throw - security logging shouldn't break the request
    console.error('Security logging error:', error);
  }
}

/**
 * Extract client IP from request headers
 * Handles common proxy headers
 */
export function getClientIp(req: Request): string | undefined {
  // Check common proxy headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (client IP)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Cloudflare
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return undefined;
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined;
}

/**
 * Helper to create a security logger bound to a request
 */
export function createSecurityLogger(
  supabaseUrl: string,
  supabaseServiceKey: string,
  req: Request,
  endpoint: string
) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);

  return {
    log: (
      eventType: SecurityEventType,
      severity: SecuritySeverity,
      userId?: string,
      details?: SecurityEventDetails
    ) => logSecurityEvent(
      supabaseUrl,
      supabaseServiceKey,
      eventType,
      severity,
      { userId, ipAddress, userAgent, endpoint, details }
    ),

    authFailure: (message: string) => logSecurityEvent(
      supabaseUrl,
      supabaseServiceKey,
      'auth_failure',
      'medium',
      { ipAddress, userAgent, endpoint, details: { message } }
    ),

    invalidToken: (userId?: string) => logSecurityEvent(
      supabaseUrl,
      supabaseServiceKey,
      'auth_invalid_token',
      'medium',
      { userId, ipAddress, userAgent, endpoint }
    ),

    rateLimitExceeded: (userId: string, limit: number) => logSecurityEvent(
      supabaseUrl,
      supabaseServiceKey,
      'rate_limit_exceeded',
      'high',
      { userId, ipAddress, userAgent, endpoint, details: { limit } }
    ),

    injectionDetected: (userId: string, input: string) => logSecurityEvent(
      supabaseUrl,
      supabaseServiceKey,
      'injection_detected',
      'high',
      { userId, ipAddress, userAgent, endpoint, details: { input: input.substring(0, 100) } }
    ),
  };
}
