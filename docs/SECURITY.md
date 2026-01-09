# Security Reference Document

**Project:** Baseline Health Tracker
**Last Audit:** 9 January 2026
**Security Expert:** Claude (AI Security Advisor)
**Version:** 1.2.0 (Data Export feature added)

> This is the authoritative security reference for the project. It should be consulted before any code changes that touch authentication, authorization, data handling, or external integrations.

---

## Table of Contents

1. [Security Architecture Overview](#1-security-architecture-overview)
2. [Authentication](#2-authentication)
3. [Authorization & Access Control](#3-authorization--access-control)
4. [Database Security](#4-database-security)
5. [API & Edge Function Security](#5-api--edge-function-security)
6. [Frontend Security](#6-frontend-security)
7. [Environment & Secrets Management](#7-environment--secrets-management)
8. [OWASP Top 10 Compliance](#8-owasp-top-10-compliance)
9. [Known Vulnerabilities & Mitigations](#9-known-vulnerabilities--mitigations)
10. [Security Monitoring & Maintenance](#10-security-monitoring--maintenance)
11. [Incident Response](#11-incident-response)
12. [Security Checklist for Development](#12-security-checklist-for-development)
13. [Future Considerations](#13-future-considerations)

---

## 1. Security Architecture Overview

### 1.1 Defense in Depth Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
│  - Input validation (React controlled components)            │
│  - No sensitive data in localStorage (except theme)          │
│  - CSP headers (recommended)                                 │
├─────────────────────────────────────────────────────────────┤
│                    EDGE FUNCTIONS                            │
│  - JWT validation on protected endpoints                     │
│  - CORS origin whitelist                                     │
│  - Rate limiting (in-memory)                                 │
│  - Input validation before AI calls                          │
├─────────────────────────────────────────────────────────────┤
│                    SUPABASE AUTH                             │
│  - Email/password authentication                             │
│  - Magic link authentication                                 │
│  - Server-side session validation                            │
│  - Token refresh handling                                    │
├─────────────────────────────────────────────────────────────┤
│                    DATABASE (PostgreSQL)                     │
│  - Row Level Security (RLS) on ALL tables                    │
│  - FORCE RLS enabled                                         │
│  - All functions have search_path set                        │
│  - Triggers prevent user_id tampering                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Trust Boundaries

| Boundary | Trust Level | Verification |
|----------|-------------|--------------|
| Browser → Edge Functions | Untrusted | JWT validation, input sanitization |
| Edge Functions → External APIs | Semi-trusted | Response validation required |
| Supabase Client → Database | Verified | RLS policies enforce access |
| Service Role → Database | Privileged | Only used in Edge Functions |

---

## 2. Authentication

### 2.1 Implementation Details

**Primary Files:**
- `src/ports/AuthPort.ts` - Authentication interface contract
- `src/adapters/supabase/supabaseAuth.ts` - Supabase implementation
- `src/components/AuthForm.tsx` - Login/signup UI
- `src/App.tsx` - Session management

### 2.2 Authentication Flow

```
1. User submits credentials
   ↓
2. Supabase Auth validates (server-side)
   ↓
3. JWT token issued, stored by Supabase client
   ↓
4. App calls auth.getSession() on load
   ↓
5. App calls auth.getUser() for SERVER validation (critical!)
   ↓
6. Only then is user considered authenticated
```

### 2.3 Session Validation Strategy

**Two-Phase Validation (Critical Security Feature):**

```typescript
// Phase 1: Quick cache check (for UI)
const { data: { session } } = await auth.getSession();

// Phase 2: Server validation (AUTHORITATIVE)
const { data: { user }, error } = await auth.getUser();
if (error || !user) {
  await auth.signOut(); // Clear potentially stale tokens
}
```

**Why this matters:** `getSession()` only checks local cache. `getUser()` validates the token against Supabase servers. Never trust cached sessions for authorization decisions.

### 2.4 Security Controls

| Control | Status | Location |
|---------|--------|----------|
| User enumeration prevention | ✅ Enabled | `supabaseAuth.ts:checkUserExists()` returns fixed error |
| Password minimum length | ✅ 6 chars (signup), 8 chars (reset) | `AuthForm.tsx` |
| Brute force protection | ✅ Supabase built-in | Rate limiting on auth endpoints |
| Session timeout | ✅ Supabase default (1 hour refresh) | Supabase config |
| Auto-logout on auth error | ✅ Enabled | `App.tsx:handleError()` |

### 2.5 Authentication Weaknesses to Monitor

- **Magic Link Security**: Email delivery depends on SMTP provider (Resend)
- **Password Reset**: Same email delivery dependency
- **Dev/E2E Bypass**: `?dev=true` and `?e2e=true` bypass auth in development - **ensure not accessible in production**

---

## 3. Authorization & Access Control

### 3.1 Authorization Model

The application uses **Row Level Security (RLS)** as the primary authorization mechanism. This means:

1. Authorization is enforced at the DATABASE level, not application level
2. Even if application code has bugs, data cannot be accessed without proper auth
3. The Supabase client automatically includes the user's JWT in requests

### 3.2 Resource Ownership

| Resource | Owner Field | Access Pattern |
|----------|-------------|----------------|
| `trackers` | `user_id` | Direct ownership: `user_id = auth.uid()` |
| `tracker_entries` | via `tracker_id` | Indirect: `tracker.user_id = auth.uid()` |
| `profiles` | `id` | Self: `id = auth.uid()` |
| `ambiguous_terms` | `user_id` | Direct ownership |
| `dictionary_cache` | N/A | Read: all authenticated, Write: authenticated |
| `maintenance_log` | N/A | Service role only |

### 3.3 Policy Patterns

**Standard Owner Policy (trackers):**
```sql
CREATE POLICY trackers_select_owner ON public.trackers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

**Indirect Owner Policy (tracker_entries):**
```sql
CREATE POLICY tracker_entries_select_owner ON public.tracker_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trackers t
      WHERE t.id = tracker_entries.tracker_id
      AND t.user_id = auth.uid()
    )
  );
```

### 3.4 Triggers for Data Integrity

| Trigger | Table | Purpose |
|---------|-------|---------|
| `deny_user_id_change` | `trackers`, `tracker_entries` | Prevents ownership transfer |
| `set_ambiguous_terms_user_id` | `ambiguous_terms` | Auto-sets user_id on insert |
| `enforce_interpretation_on_ambiguous_names` | `trackers` | Prevents ambiguous tracker names |

---

## 4. Database Security

### 4.1 RLS Status

| Table | RLS Enabled | Force RLS | Policies |
|-------|-------------|-----------|----------|
| `tracker_entries` | ✅ | ✅ | 4 (CRUD) |
| `trackers` | ✅ | ✅ | 4 (CRUD) |
| `profiles` | ✅ | ✅ | 3 (CRU) |
| `ambiguous_terms` | ✅ | ✅ | 5 (CRUD + service) |
| `dictionary_cache` | ✅ | ✅ | 3 (read all, write auth/service) |
| `maintenance_log` | ✅ | ✅ | 1 (service only) |

### 4.2 Function Security

All `SECURITY DEFINER` functions have:
- `SET search_path = ''` (prevents search path injection)
- Appropriate privilege grants

**Functions with SECURITY DEFINER:**
- `create_default_tracker(uuid)` - Creates default tracker for new users
- `handle_new_user()` - Creates profile on signup
- `refresh_schema_cache()` - Notifies PostgREST of schema changes
- `maintenance_*` functions - Database self-healing
- `claim_ambiguous_terms_null_rows()` - Migration helper

### 4.3 Database Check Constraints

| Table | Column | Constraint |
|-------|--------|------------|
| `trackers` | `color` | `color ~ '^#[0-9A-Fa-f]{6}$'` (valid hex) |

### 4.4 Automatic Maintenance

The database has self-healing capabilities via `run_database_maintenance()`:

- Runs daily at 03:00 UTC via pg_cron
- Fixes: function search_path, duplicate policies, unused indexes, unindexed FKs
- All actions logged to `maintenance_log`

---

## 5. API & Edge Function Security

### 5.1 Edge Functions Inventory

| Function | JWT Required | Purpose |
|----------|--------------|---------|
| `generate-tracker-config` | No | AI config generation |
| `generate-tracker-image` | No | AI image generation |
| `generate-tracker-fields` | No | AI field suggestions |
| `validate-tracker-fields` | No | Field validation |
| `check-ambiguity` | No | Ambiguity detection |
| `datamuse-lookup` | No | Synonym lookup |
| `create-default-tracker` | Yes* | Creates default tracker |
| `db-maintenance` | Yes | Manual maintenance trigger |

*Uses Bearer token validation, not Supabase JWT middleware

### 5.2 CORS Configuration

All edge functions use a whitelist:
```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  Deno.env.get('ALLOWED_ORIGIN'),  // Production URL
];
```

### 5.3 Rate Limiting

**Current Implementation:** In-memory rate limiting in `_shared/rate-limiter.ts`

**Limitation:** Only works per-instance. Multi-instance deployments can bypass.

**Recommendation:** Consider Deno KV or Redis for distributed rate limiting.

### 5.4 Input Validation

| Edge Function | Validation |
|---------------|------------|
| `validate-tracker-fields` | MAX_FIELDS=20, MAX_OPTIONS=50, MAX_LABEL_LENGTH=100 |
| `datamuse-lookup` | Term trimmed, max validated |
| `generate-tracker-fields` | Basic input checks |

---

## 6. Frontend Security

### 6.1 XSS Prevention

| Protection | Status | Details |
|------------|--------|---------|
| React JSX escaping | ✅ Default | All content rendered via JSX |
| dangerouslySetInnerHTML | ✅ Safe | Only 1 usage in `chart.tsx` for CSS variables |
| User-generated HTML | ✅ Not used | No HTML rendering from user input |
| Input validation | ✅ Controlled | All forms use controlled React components |

### 6.2 CSRF Prevention

- Supabase auth uses HTTP-only cookies with SameSite attribute
- All API calls include Authorization header (JWT)
- No state-changing GET requests

### 6.3 Sensitive Data Handling

| Data Type | Storage | Security |
|-----------|---------|----------|
| Auth tokens | Supabase client (localStorage) | Managed by Supabase |
| Theme preference | localStorage | Non-sensitive |
| User data | Never stored client-side | Fetched per-session |
| Passwords | Never stored | Submitted directly to Supabase |

### 6.4 URL Parameter Security

```typescript
// Safe: Only reads Supabase auth hash parameters
const hashParams = new URLSearchParams(location.hash.substring(1));
if (hashParams.get('access_token')) {
  // Handle auth callback
  history.replaceState(null, '', location.pathname); // Clean URL
}
```

### 6.5 Data Export Security

**Files:**
- `src/components/export/ExportDialog.tsx` - Export UI
- `src/lib/export/csv-export.ts` - CSV generation
- `src/lib/export/pdf-report.ts` - PDF generation
- `src/lib/export/report-charts.ts` - Chart capture

**Security Model:**

| Aspect | Implementation | Status |
|--------|---------------|--------|
| Data Source | Uses already-loaded entries (RLS protected) | ✅ Safe |
| Export Location | Local download only (no server storage) | ✅ Safe |
| Shareable Links | Not implemented (by design) | ✅ N/A |
| PDF Generation | Client-side via jsPDF (no data sent to server) | ✅ Safe |
| Chart Capture | Client-side via html2canvas | ✅ Safe |

**Privacy Considerations:**

1. **Local-Only Exports**: All exports download directly to user's device
2. **No Cloud Storage**: Export data never leaves the browser (except initial RLS-protected fetch)
3. **No Sharing URLs**: Deliberately omitted to prevent accidental data exposure
4. **User Controls**: Date range filtering lets users control exported scope

**Potential Risks:**

| Risk | Severity | Mitigation |
|------|----------|------------|
| Exported file left accessible | Low | User responsibility (local device) |
| PDF metadata exposure | Low | Minimal metadata (generation date only) |
| Screenshot/chart capture | Low | Only captures user's own data |

---

## 7. Environment & Secrets Management

### 7.1 Environment Variables

| Variable | Exposure | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Browser | Public Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Public anon key (RLS protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | Admin access (NEVER expose) |
| `GEMINI_API_KEY` | Edge Functions only | AI API key |
| `ALLOWED_ORIGIN` | Edge Functions only | Production CORS origin |

### 7.2 Git Ignore Rules

```gitignore
.env
.env.*
supabase/.env
supabase/.temp/
```

### 7.3 Secret Rotation

| Secret | Rotation Method |
|--------|-----------------|
| Supabase anon key | Dashboard → Settings → API |
| Supabase service role | Dashboard → Settings → API |
| Gemini API key | Google Cloud Console |

---

## 8. OWASP Top 10 Compliance

### 8.1 Assessment Matrix

| # | Vulnerability | Status | Notes |
|---|---------------|--------|-------|
| A01 | Broken Access Control | ✅ Mitigated | RLS enforced at database level |
| A02 | Cryptographic Failures | ✅ Mitigated | TLS enforced, passwords hashed by Supabase |
| A03 | Injection | ⚠️ Partial | SQL safe, **Prompt injection risk** |
| A04 | Insecure Design | ✅ Good | Defense in depth, ports/adapters pattern |
| A05 | Security Misconfiguration | ✅ Mitigated | Self-healing maintenance, search_path set |
| A06 | Vulnerable Components | ⚠️ Monitor | Regular npm audit needed |
| A07 | Auth Failures | ✅ Mitigated | Server-side validation, rate limiting |
| A08 | Data Integrity Failures | ✅ Mitigated | Database constraints, triggers |
| A09 | Logging Failures | ⚠️ Partial | Maintenance logged, need more app logging |
| A10 | SSRF | ✅ N/A | No user-controlled URL fetching |

---

## 9. Known Vulnerabilities & Mitigations

### 9.1 Prompt Injection Vulnerabilities

**Status:** ✅ FIXED (9 January 2026)

**Fixed Files:**
1. `supabase/functions/generate-tracker-image/index.ts` - Lines 134-139
2. `supabase/functions/generate-tracker-fields/index.ts` - Lines 141-148
3. `supabase/functions/check-ambiguity/index.ts` - Lines 145-171

**Shared Utility:** `supabase/functions/_shared/prompt-sanitizer.ts`

**Solution Implemented:**

1. **Centralized sanitization utility** with:
   - Dangerous character removal (`"'`\<>{}`)
   - Newline normalization
   - Injection pattern detection (regex blocklist)
   - Configurable length limits
   - Metadata tracking (truncation, injection detection)

2. **User input sanitization** via `sanitizeForPrompt()`:
   ```typescript
   const sanitized = sanitizeForPrompt(trackerName, { maxLength: 50 });
   if (sanitized.injectionDetected) {
     console.warn('Potential prompt injection detected');
   }
   const safeTrackerName = sanitized.value;
   ```

3. **External API response sanitization** via `sanitizeExternalResponse()`:
   ```typescript
   // Dictionary/Wikipedia data sanitized before prompt inclusion
   const safeDefinitions = allDefinitions.map(d => sanitizeExternalResponse(d, 200));
   ```

**Detection Patterns Blocked:**
- `ignore (all) (previous|above|prior)`
- `forget (all) (previous|above|prior)`
- `disregard (all) (previous|above|prior)`
- `new instruction`
- System/role markers: `system:`, `assistant:`, `user:`, `[INST]`, `<<SYS>>`, etc.

**Logging:** All detected injection attempts are logged for security monitoring.

### 9.2 MEDIUM: In-Memory Rate Limiting

**Status:** ⚠️ Known Limitation

**Issue:** Rate limiting uses in-memory storage, ineffective across instances.

**Mitigation:** Accept for current scale, plan for Deno KV or Redis.

### 9.3 LOW: Third-Party API Data Injection

**Status:** ⚠️ Theoretical Risk

**Issue:** Dictionary and Wikipedia API responses are included in AI prompts. A compromised API could inject prompt manipulations.

**Mitigation:**
- Validate response structure before use
- Limit response size included in prompts
- Monitor for unusual API responses

---

## 10. Security Monitoring & Maintenance

### 10.1 Automated Security Checks

| Check | Schedule | Action |
|-------|----------|--------|
| Database maintenance | Daily 03:00 UTC | Auto-fixes common issues |
| Supabase Security Advisor | Manual/Dashboard | Check for new warnings |
| Supabase Performance Advisor | Manual/Dashboard | Check for new warnings |

### 10.2 Manual Security Audits

**Frequency:** Before each major release

**Checklist:**
- [ ] Run `npm audit` and address vulnerabilities
- [ ] Review new Edge Functions for input validation
- [ ] Check Supabase Dashboard advisors
- [ ] Verify RLS policies on new tables
- [ ] Test authentication flows
- [ ] Review environment variable usage

### 10.3 Security Logging

**Currently Logged:**
- Database maintenance actions (`maintenance_log`)
- Auth events (Supabase Auth logs)
- Edge Function errors (Supabase Functions logs)

**Recommended Additions:**
- Failed authentication attempts
- Rate limit violations
- Suspicious input patterns

---

## 11. Incident Response

### 11.1 Security Incident Classification

| Severity | Examples | Response Time |
|----------|----------|---------------|
| Critical | Data breach, auth bypass | Immediate |
| High | Prompt injection exploit, privilege escalation | < 4 hours |
| Medium | Rate limit bypass, XSS attempt | < 24 hours |
| Low | Information disclosure, minor misconfiguration | < 1 week |

### 11.2 Response Procedures

**Data Breach:**
1. Revoke all Supabase API keys immediately
2. Force logout all users (`auth.signOut()` globally)
3. Review database logs for unauthorized access
4. Notify affected users if required
5. Post-mortem and fix root cause

**Auth Bypass:**
1. Disable affected authentication method
2. Review all sessions created during vulnerability window
3. Force re-authentication for all users

**API Key Exposure:**
1. Rotate exposed key immediately in Supabase Dashboard
2. Update environment variables in deployment
3. Review logs for unauthorized usage

---

## 12. Security Checklist for Development

### 12.1 Before Creating New Tables

- [ ] Enable RLS: `ALTER TABLE name ENABLE ROW LEVEL SECURITY;`
- [ ] Force RLS: `ALTER TABLE name FORCE ROW LEVEL SECURITY;`
- [ ] Create policies for SELECT, INSERT, UPDATE, DELETE
- [ ] Add `user_id` column if user-owned
- [ ] Add `deny_user_id_change` trigger if applicable

### 12.2 Before Creating Edge Functions

- [ ] Decide: JWT required or public?
- [ ] Add CORS origin whitelist
- [ ] Validate all user inputs
- [ ] Sanitize inputs before AI prompts
- [ ] Use service role key only when necessary
- [ ] Add rate limiting if public

### 12.3 Before Creating Database Functions

- [ ] Add `SET search_path = ''` for SECURITY DEFINER functions
- [ ] Use fully qualified table names (`public.tablename`)
- [ ] Grant minimal necessary permissions
- [ ] Log sensitive operations

### 12.4 Before Deploying

- [ ] No secrets in code or logs
- [ ] Environment variables set correctly
- [ ] CORS whitelist includes production URL
- [ ] Run database maintenance dry-run
- [ ] Test authentication flow end-to-end

---

## 13. Future Considerations

### 13.1 Planned Security Improvements

| Priority | Improvement | Effort | Status |
|----------|-------------|--------|--------|
| High | Fix prompt injection vulnerabilities | 2-4 hours | ✅ Complete |
| High | Add Content Security Policy headers | 1-2 hours | Not Started |
| Medium | Implement distributed rate limiting | 4-8 hours | Not Started |
| Medium | Add security event logging | 4-8 hours | Not Started |
| Low | Add 2FA support | 8-16 hours | Not Started |
| Low | Add audit trail for data changes | 8-16 hours | Not Started |

### 13.2 Security Debt Tracking

| Item | Introduced | Reason | Status |
|------|------------|--------|--------|
| Prompt injection | Initial AI integration | Rapid development | ✅ Fixed (v1.1.0) |
| In-memory rate limiting | Initial release | Simplicity | ⚠️ Monitor, upgrade if needed |
| Dev mode auth bypass | Development | Testing convenience | ⚠️ Ensure blocked in production |

### 13.3 Security Review Triggers

A security review should be triggered when:
- Adding new authentication methods
- Creating new database tables
- Adding new Edge Functions
- Integrating new external APIs
- Upgrading Supabase or major dependencies
- Before major releases

---

## Appendix A: File Reference

### Authentication
- `src/ports/AuthPort.ts` - Auth interface
- `src/adapters/supabase/supabaseAuth.ts` - Supabase auth implementation
- `src/components/AuthForm.tsx` - Login/signup UI
- `src/App.tsx` - Session management

### Database
- `supabase/migrations/` - All database migrations
- Database functions: See Section 4.2

### Edge Functions
- `supabase/functions/` - All edge functions
- `supabase/functions/_shared/` - Shared utilities

### Configuration
- `.env.example` - Environment variable template
- `.gitignore` - Secret exclusion rules

---

## Appendix B: Security Contacts

| Role | Contact |
|------|---------|
| Project Owner | [Your contact] |
| Security Issues | Create GitHub issue with `security` label |
| Supabase Support | support@supabase.io |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 9 Jan 2026 | Initial comprehensive security audit |
| 1.1.0 | 9 Jan 2026 | Prompt injection fixes applied to edge functions |
| 1.2.0 | 9 Jan 2026 | Added Data Export security documentation (Phase 7) |

---

**End of Security Reference Document**
