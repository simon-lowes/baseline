# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in Baseline, please report it responsibly.

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, please email: **52527080+simon-lowes@users.noreply.github.com**

Please include as much of the following information as possible:

- Type of issue (e.g., SQL injection, XSS, authentication bypass, data exposure)
- Full paths of affected source file(s)
- Location of the affected code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue and how an attacker might exploit it

This information helps me understand and address the issue more quickly.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 4.x     | :white_check_mark: |
| 3.x     | :x:                |
| < 3.0   | :x:                |

## Security Measures

Baseline implements several security measures:

### Authentication & Authorization
- Secure authentication via Supabase Auth with JWT tokens
- Session validation with dual-layer checking (cache + server-side)
- Magic link (passwordless) authentication support
- Password recovery flow with secure token handling
- "Remember me" session persistence with appropriate timeouts

### Data Protection
- **Row Level Security (RLS)** policies enforced on all database tables
- All data operations gated by `auth.uid() = user_id` checks
- User data isolation - users can only access their own records
- HTTPS-only communication with backend services
- Environment variable protection for sensitive credentials

### Input Validation
- React Hook Form + Zod schema validation on all forms
- Type-safe API calls through Supabase client SDK
- Parameterized queries preventing SQL injection
- HTML5 input type validation (email, password)

### Content Security Policy (CSP)
Implemented via meta tag in `index.html`:
- `default-src 'self'` - restricts resource loading to same origin
- `frame-ancestors 'none'` - prevents clickjacking
- Explicit allowlist for external APIs (Supabase, Google Fonts)
- `img-src` allows `data:` and `blob:` for PDF export functionality

### XSS Prevention
- React's default auto-escaping for user content
- No use of dynamic code execution functions
- Limited raw HTML rendering (only for CSS-in-JS in chart components with trusted data)
- Error boundary prevents stack trace exposure to users

---

## Supabase Security Configuration

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring:
```sql
-- Users can only read their own data
CREATE POLICY "Users can read own entries"
  ON tracker_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert own entries"
  ON tracker_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### API Key Management
- **Anon key** used for client-side operations (safe due to RLS)
- **Service role key** used only in Edge Functions (server-side)
- Keys stored in environment variables, never committed to repository
- `.env` files excluded via `.gitignore`

### Supabase Security Updates (2025-2026)

As of 2025, Supabase introduced a new API key system:
- **Publishable keys** (`sb_publishable_...`) replace anon keys
- **Secret keys** (`sb_secret_...`) replace service_role keys
- Instant key rotation and granular auditing capabilities
- Legacy JWT-based keys will be removed in late 2026

**Migration Note**: Plan to migrate to the new key format before late 2026.

---

## Known Risks & Mitigations

### CSP `unsafe-inline` Requirement
**Risk**: `'unsafe-inline'` is required for script-src and style-src due to Tailwind CSS v4 runtime styling.

**Mitigation**:
- All external script sources are explicitly whitelisted
- `frame-ancestors 'none'` prevents embedding attacks
- Consider migrating to nonce-based CSP in future

### Third-Party API Calls
**Risk**: Application makes calls to external APIs for enrichment data.

**Services Used**:
| Service | Purpose | Data Sent |
|---------|---------|-----------|
| Wikipedia API | Tracker descriptions | Tracker name |
| Datamuse API | Related terms | Tracker name |
| Dictionary API | Definitions | Tracker name |
| Google Generative AI | Config generation | Tracker context |

**Mitigation**:
- No personal health data sent to third-party APIs
- Fallback mechanisms if APIs unavailable
- All calls over HTTPS

### Client-Side Storage
**Risk**: Some preferences stored in localStorage.

**What's Stored**:
- Theme preference (non-sensitive)
- Accessibility settings (non-sensitive)
- Session flags (booleans only, not tokens)

**Mitigation**: Actual JWT tokens managed by Supabase SDK, not stored by application code.

---

## Recommended Security Headers

When deploying to production, configure these HTTP headers at the server/CDN level:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Note**: Vercel and similar platforms often set these automatically.

---

## Security Checklist for Contributors

Before submitting code changes:

- [ ] No hardcoded secrets or API keys
- [ ] User input validated before use
- [ ] No raw HTML rendering with user-supplied data
- [ ] No dynamic code execution (avoid Function constructor)
- [ ] Database operations use parameterized queries (via Supabase SDK)
- [ ] Error messages don't expose internal details
- [ ] Console.log statements removed from production paths
- [ ] New tables have RLS policies defined

---

## Multi-Factor Authentication (MFA)

Supabase Auth supports MFA. Consider enabling for enhanced security:
- TOTP (Time-based One-Time Password) support
- Can be enforced per-user or organization-wide
- Refer to [Supabase MFA documentation](https://supabase.com/docs/guides/auth/auth-mfa)

---

## Security Monitoring

### Supabase Security Advisors
Regularly check the Supabase dashboard Security Advisors for:
- Missing RLS policies
- Overly permissive policies
- Unused indexes affecting performance
- Password policy recommendations

### Recommended Practices
- Review Security Advisors weekly
- Monitor authentication logs for suspicious patterns
- Set up alerts for failed login attempts
- Rotate API keys periodically

---

## Incident Response

In the event of a security incident:

1. **Contain**: Disable affected features/endpoints
2. **Assess**: Determine scope and impact
3. **Notify**: Inform affected users within 72 hours (GDPR requirement)
4. **Remediate**: Fix the vulnerability
5. **Review**: Document lessons learned

---

## Response Time

I will acknowledge receipt of your vulnerability report within 48 hours and provide a more detailed response within 7 days.

---

## Additional Resources

- [Supabase Security Documentation](https://supabase.com/docs/guides/security)
- [Supabase Security Testing Guide](https://supabase.com/docs/guides/security/security-testing)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro)

---

*Last updated: January 2026*
