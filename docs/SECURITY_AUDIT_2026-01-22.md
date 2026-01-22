# Security Audit Report - Baseline Health Tracking App

**Audit Date:** January 22, 2026
**Auditor:** Claude Security Analysis
**Version Audited:** 4.x (current main branch)

---

## Executive Summary

| Category | Rating | Critical Issues |
|----------|--------|-----------------|
| **Authentication** | A (Strong) | None |
| **RLS Policies** | A+ (Excellent) | None |
| **Secrets Management** | B- (Needs Attention) | 1 local file exposure |
| **Input Validation** | C+ (Inconsistent) | Missing length limits |
| **Edge Functions** | B (Good with gaps) | 2 functions lack JWT verification |
| **Dependencies** | A- (Good) | 1 moderate CVE (lodash) |
| **XSS/CSRF Protection** | A (Strong) | None |
| **Overall** | **B+** | 4 items need remediation |

---

## Critical Findings (Immediate Action Required)

### 1. CRITICAL: Exposed Credentials in Local File

**Location:** `src/lib/.env`

**Issue:** A `.env` file exists in `src/lib/` containing Supabase credentials. While NOT committed to git (verified), this is a risky location.

**Status:** File exists locally, not tracked in git

**Action Required:**
```bash
# Delete this file immediately
rm src/lib/.env
```

**Why It Matters:** If accidentally committed in a future change, credentials would be exposed in git history permanently.

---

### 2. CRITICAL: `backfill-tracker-images` Edge Function - No Authentication

**Location:** `supabase/functions/backfill-tracker-images/index.ts:187-199`

**Issue:** This function has `verify_jwt = true` in config.toml but **does not implement any JWT verification code**. Anyone with network access can:
- Trigger unlimited image generation (Gemini API costs)
- Cause storage quota exhaustion
- Modify arbitrary trackers with generated images

**Action Required:** Add JWT verification (copy pattern from `delete-account/index.ts:73-101`).

---

### 3. HIGH: `datamuse-lookup` Edge Function - No Authentication Code

**Location:** `supabase/functions/datamuse-lookup/index.ts:43-105`

**Issue:** Despite `verify_jwt = true` in config, the function contains no authentication code. Could be abused for API lookup amplification.

**Mitigation:** Either:
1. Add explicit JWT verification to match other functions, OR
2. Document this as intentionally public (if appropriate for word lookup utility)

---

### 4. HIGH: Vercel OIDC Token in `.env.local`

**Location:** `.env.local:5`

**Issue:** Contains a real Vercel OIDC JWT token. While not committed to git, this token should be rotated.

**Action Required:**
1. Delete or invalidate token from Vercel dashboard
2. Regenerate if needed for local development

---

## High Priority Findings

### 5. Inconsistent Password Requirements

**Locations:**
- `AuthForm.tsx:175` - Requires **6 characters** for signup
- `App.tsx:524` - Requires **8 characters** for password reset

**Recommendation:** Standardize to 12+ characters with strength requirements.

---

### 6. Missing Input Length Limits

| Field | Current Limit | Recommended |
|-------|---------------|-------------|
| Notes/descriptions | None | 5,000 chars |
| Display name | None | 100 chars |
| Tracker name | None | 200 chars |
| Hashtags | None | 50 chars each, 20 max |

**Affected Files:**
- `PainEntryForm.tsx:322` - Textarea without maxLength
- `ProfileSection.tsx:155` - Input without maxLength
- `WelcomeScreen.tsx:95` - No validation on tracker name

---

### 7. Verbose Error Messages in Edge Functions

**Locations:**
- `generate-tracker-config.ts:355` - Leaks Gemini API error details
- `generate-tracker-fields.ts:237` - Exposes API status codes
- `check-ambiguity.ts:349` - Returns truncated error text

**Recommendation:** Return generic error messages to clients, log details server-side only.

---

## Medium Priority Findings

### 8. lodash Prototype Pollution Vulnerability

**Package:** `lodash@4.17.21` (via workbox-build)
**CVE:** GHSA-xxjr-mmjv-4gpg
**Severity:** Moderate (CVSS 6.5)

**Action:** `npm audit fix`

**Impact:** Build-time only (vite-plugin-pwa dependency), not runtime risk.

---

### 9. Console Logging in Production Code

**Locations:** Throughout `supabaseAuth.ts`, `App.tsx`, `Dashboard.tsx`

**Issue:** Verbose debug logs visible in browser DevTools.

**Recommendation:** Wrap in dev-only checks:
```typescript
if (import.meta.env.DEV) {
  console.log('[Auth] Session validated:', user.id);
}
```

---

### 10. Hashtag Validation Gap

**Location:** `PainEntryForm.tsx:124-130`

**Current:** Only removes `#`, trims, and lowercases.

**Missing:**
- Character set validation (allows spaces, special chars)
- Length limit per tag
- Maximum tag count

---

## Security Strengths

### Authentication (Score: A)
- PKCE implementation for magic links (excellent)
- Proper session management with server validation
- Token storage handled by Supabase SDK (not localStorage)
- User enumeration protection enabled
- `checkUserExists()` function disabled for security

### Row Level Security (Score: A+)
- All user tables have RLS enabled with FORCE RLS
- Consistent `auth.uid() = user_id` pattern across CRUD
- No overly permissive policies on sensitive data
- Service role key isolated to Edge Functions only
- Defense-in-depth: application filters + database RLS

### Content Security Policy (Score: A)
Properly configured in `index.html` with:
- `default-src 'self'`
- `frame-ancestors 'none'`
- Explicit allowlist for external APIs

### XSS Prevention (Score: A)
- React auto-escaping for user content
- Limited raw HTML injection (chart styles only, developer-controlled data)
- No dynamic code execution functions
- DOM manipulation uses safe createElement APIs

### CSRF Protection (Score: A)
- JWT-based authentication (not vulnerable to form hijacking)
- All API requests use Authorization headers
- RLS provides server-side validation

### Prompt Injection Prevention (Score: A)
Comprehensive sanitization in `prompt-sanitizer.ts`:
- 12 injection patterns blocked
- Character stripping (quotes, brackets, backslash)
- Length truncation with word boundaries
- All injection attempts logged

### Distributed Rate Limiting (Score: A-)
- Database-backed rate limiter for AI functions
- Per-user tracking prevents one user from blocking others
- Proper rate limit headers returned
- *Gap:* `backfill-tracker-images` uses in-memory only

### Security Logging (Score: A)
Comprehensive event tracking via `security-logger.ts`:
- `auth_failure`, `rate_limit_exceeded`, `injection_detected`
- Client IP extraction from proxy headers
- Severity levels for alerting

---

## Compliance Status

| Standard | Status | Notes |
|----------|--------|-------|
| GDPR Data Protection | Pass | RLS isolation, delete-account function |
| OWASP A01: Broken Access Control | Pass | RLS at database level |
| OWASP A02: Cryptographic Failures | Pass | TLS enforced, Supabase hashes passwords |
| OWASP A03: Injection | Pass | Parameterized queries via SDK |
| OWASP A05: Security Misconfiguration | Partial | 2 edge functions missing auth |
| OWASP A07: Auth Failures | Pass | PKCE + server validation |

---

## Remediation Checklist

### Immediate (This Week)
- [ ] Delete `src/lib/.env` file
- [ ] Add JWT verification to `backfill-tracker-images`
- [ ] Add JWT verification to `datamuse-lookup` OR document as intentional
- [ ] Run `npm audit fix` for lodash vulnerability
- [ ] Rotate Vercel OIDC token in `.env.local`

### High Priority (This Month)
- [ ] Standardize password minimum to 12 characters
- [ ] Add `maxLength` to Notes textarea (5000 chars)
- [ ] Add `maxLength` to Display name input (100 chars)
- [ ] Add `maxLength` to Tracker name input (200 chars)
- [ ] Add hashtag validation (alphanumeric, length limit)
- [ ] Replace verbose error messages with generic ones

### Medium Priority (This Quarter)
- [ ] Wrap console.log in dev-only checks
- [ ] Add npm audit to CI/CD pipeline
- [ ] Upgrade Playwright from 1.38.0 to latest
- [ ] Consider rate limiting for `create-default-tracker`
- [ ] Document offline data storage in Privacy Policy

---

## Files Audited

| Category | Files Reviewed |
|----------|---------------|
| Authentication | `supabaseAuth.ts`, `AuthForm.tsx`, `AuthConfirm.tsx`, `useAuth.ts` |
| Database Security | 44 migration files, `SUPABASE_SCHEMA.sql` |
| Edge Functions | 9 functions in `supabase/functions/` |
| Input Validation | `PainEntryForm.tsx`, `DynamicFieldForm.tsx`, `ProfileSection.tsx`, `WelcomeScreen.tsx` |
| Client Security | `App.tsx`, `Dashboard.tsx`, `chart.tsx`, `main.tsx` |
| Dependencies | `package.json`, `package-lock.json` |
| Configuration | `index.html`, `config.toml`, `.gitignore` |

---

## Conclusion

The Baseline application demonstrates **strong security fundamentals** with proper authentication, comprehensive RLS policies, and good prompt injection prevention. The main areas requiring attention are:

1. **Credential hygiene** - Remove stray `.env` files and rotate exposed tokens
2. **Edge function authentication** - Two functions need JWT verification code
3. **Input validation** - Add length limits to user-generated content fields
4. **Password policy** - Increase minimum and add strength requirements

Overall security posture is **B+**, upgradeable to **A** after addressing the critical and high-priority items.

---

*Report generated by Claude Security Analysis*
*Next audit recommended: April 2026*
