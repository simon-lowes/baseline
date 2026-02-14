/**
 * Security Headers Tests
 *
 * Static analysis of index.html CSP and security headers defined in security-headers.json.
 * These tests verify security properties of the deployed config —
 * they fail if someone weakens a header.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..', '..');
const indexHtml = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');
const headersConfig = JSON.parse(readFileSync(resolve(ROOT, 'security-headers.json'), 'utf-8'));

// Extract the CSP meta tag content
// The content attribute uses double quotes but the CSP value contains single quotes
// (e.g., 'self'), so we match up to the closing double quote specifically.
const cspMatch = indexHtml.match(
  /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content="([^"]+)"/i,
);
const csp = cspMatch?.[1] ?? '';

// Extract security headers for the catch-all route
const catchAllRoute = headersConfig.headers?.find(
  (h: { source: string }) => h.source === '/(.*)',
);
const securityHeaders: Record<string, string> = {};
for (const { key, value } of catchAllRoute?.headers ?? []) {
  securityHeaders[key.toLowerCase()] = value;
}

// ---------------------------------------------------------------------------
// CSP meta tag properties
// ---------------------------------------------------------------------------
describe('CSP meta tag in index.html', () => {
  it('is present', () => {
    expect(csp).toBeTruthy();
  });

  it('default-src is self', () => {
    expect(csp).toMatch(/default-src\s+'self'/);
  });

  it('script-src does NOT contain unsafe-eval', () => {
    const scriptSrc = csp.match(/script-src\s+([^;]+)/)?.[1] ?? '';
    expect(scriptSrc).not.toContain('unsafe-eval');
  });

  it('script-src does NOT contain wildcard or data: URI', () => {
    const scriptSrc = csp.match(/script-src\s+([^;]+)/)?.[1] ?? '';
    // A bare * (not part of a subdomain wildcard like *.example.com)
    expect(scriptSrc).not.toMatch(/(?<!\.)(\*)/);
    expect(scriptSrc).not.toContain('data:');
  });

  it('connect-src does NOT have a bare wildcard', () => {
    const connectSrc = csp.match(/connect-src\s+([^;]+)/)?.[1] ?? '';
    // Bare wildcard = just "*", not "*.supabase.co"
    const tokens = connectSrc.split(/\s+/);
    expect(tokens).not.toContain('*');
  });
});

// ---------------------------------------------------------------------------
// Security response headers
// ---------------------------------------------------------------------------
describe('Security response headers', () => {
  it('X-Frame-Options is DENY', () => {
    expect(securityHeaders['x-frame-options']).toBe('DENY');
  });

  it('X-Content-Type-Options is nosniff', () => {
    expect(securityHeaders['x-content-type-options']).toBe('nosniff');
  });

  it('HSTS max-age >= 31536000', () => {
    const hsts = securityHeaders['strict-transport-security'] ?? '';
    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    expect(maxAgeMatch).toBeTruthy();
    expect(Number(maxAgeMatch![1])).toBeGreaterThanOrEqual(31536000);
  });

  it('Referrer-Policy is set', () => {
    expect(securityHeaders['referrer-policy']).toBeTruthy();
  });

  it('Permissions-Policy restricts camera, microphone, and geolocation', () => {
    const pp = securityHeaders['permissions-policy'] ?? '';
    expect(pp).toContain('camera=()');
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('geolocation=()');
  });

  it('no wildcard Access-Control-Allow-Origin', () => {
    expect(securityHeaders['access-control-allow-origin']).not.toBe('*');
  });
});

// ---------------------------------------------------------------------------
// No dev artefacts in production HTML
// ---------------------------------------------------------------------------
describe('no dev artefacts in index.html', () => {
  it('no inline <script> blocks with e2e/dev helpers', () => {
    // The comment about removal is fine; actual window.__e2e or window.__dev JS is not
    expect(indexHtml).not.toMatch(/window\.__e2e\s*=/);
    expect(indexHtml).not.toMatch(/window\.__dev\s*=/);
  });

  it('no localhost references outside CSP', () => {
    // Remove the CSP meta tag line, then check remaining HTML for localhost
    const withoutCsp = indexHtml.replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
    expect(withoutCsp).not.toContain('localhost');
  });
});
