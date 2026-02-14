# Security Audit Checklist

This document provides a comprehensive security audit framework for Baseline. It complements [SECURITY.md](./SECURITY.md), which covers Supabase-specific security, vulnerability reporting, and implementation details.

**Use this document for:**
- Regular security audits (quarterly recommended)
- Pre-release security reviews
- Onboarding security-conscious contributors
- Compliance verification

---

## Table of Contents

1. [Audit Schedule](#audit-schedule)
2. [OWASP Top 10:2025 Compliance](#owasp-top-102025-compliance)
3. [Supply Chain Security](#supply-chain-security)
4. [Privacy & Regulatory Compliance](#privacy--regulatory-compliance)
5. [CI/CD Security](#cicd-security)
6. [Secrets Management](#secrets-management)
7. [Logging & Monitoring](#logging--monitoring)
8. [Error Handling Security](#error-handling-security)
9. [API Security](#api-security)
10. [Backup & Disaster Recovery](#backup--disaster-recovery)
11. [Penetration Testing](#penetration-testing)
12. [Audit Tracking](#audit-tracking)

---

## Audit Schedule

| Audit Type | Frequency | Owner | Duration |
|------------|-----------|-------|----------|
| Full security audit | Quarterly | Lead Developer | 2-4 hours |
| Dependency scan | Weekly (automated) | CI/CD | Automated |
| OWASP checklist review | Monthly | Developer | 1 hour |
| Penetration test | Annually | External/Internal | 1-2 days |
| Privacy compliance review | Quarterly | Lead Developer | 1 hour |
| Secrets rotation | Quarterly | Lead Developer | 30 min |

---

## OWASP Top 10:2025 Compliance

The [OWASP Top 10:2025](https://owasp.org/Top10/) represents the most critical security risks to web applications. This checklist is tailored for Baseline's architecture.

### A01:2025 - Broken Access Control

Access control enforces that users cannot act outside their intended permissions.

| Check | Status | Notes |
|-------|--------|-------|
| All database tables have RLS policies | [ ] | See `supabase/migrations/` |
| RLS policies use `auth.uid() = user_id` | [ ] | Verify no bypass routes |
| No direct table access without RLS | [ ] | Check for `service_role` usage |
| API endpoints validate user ownership | [ ] | Supabase handles via RLS |
| No CORS misconfigurations | [ ] | Check `supabase/config.toml` |
| Session tokens cannot be reused after logout | [ ] | Supabase Auth handles |
| No insecure direct object references (IDOR) | [ ] | UUIDs, not sequential IDs |

**Baseline-specific checks:**
- [ ] Tracker entries are isolated per user
- [ ] Export functions only export user's own data
- [ ] Share URLs don't expose other users' data

### A02:2025 - Security Misconfiguration

Security misconfiguration is the most common issue, often from insecure defaults.

| Check | Status | Notes |
|-------|--------|-------|
| CSP headers properly configured | [ ] | See `index.html` meta tag |
| Debug mode disabled in production | [ ] | Vite handles via `mode` |
| Default credentials changed | [ ] | No defaults in codebase |
| Unnecessary features disabled | [ ] | Review Supabase dashboard |
| Error messages don't leak stack traces | [ ] | ErrorBoundary in place |
| Security headers configured | [ ] | See SECURITY.md |
| HTTPS enforced | [ ] | Traefik handles via Let's Encrypt |

**Baseline-specific checks:**
- [ ] Supabase anon key has minimal permissions
- [ ] No service_role key in client code
- [ ] Environment variables not in repository

### A03:2025 - Software Supply Chain Failures (NEW)

Supply chain attacks target dependencies, build processes, and distribution.

| Check | Status | Notes |
|-------|--------|-------|
| Dependencies from trusted sources only | [ ] | npm registry |
| Package lockfile committed | [ ] | `package-lock.json` |
| No known vulnerable dependencies | [ ] | Run `npm audit` |
| Dependency versions pinned | [ ] | Check `package.json` |
| Build pipeline integrity verified | [ ] | GitHub Actions |
| SBOM generated for releases | [ ] | See Supply Chain section |
| Transitive dependencies reviewed | [ ] | `npm ls --all` |

**Baseline-specific checks:**
- [ ] Recharts, D3, shadcn/ui from official sources
- [ ] Supabase client version up to date
- [ ] No deprecated packages in use

### A04:2025 - Cryptographic Failures

Failures related to cryptography that often lead to sensitive data exposure.

| Check | Status | Notes |
|-------|--------|-------|
| All data in transit uses TLS 1.2+ | [ ] | HTTPS enforced |
| Sensitive data encrypted at rest | [ ] | Supabase handles |
| No hardcoded secrets | [ ] | Environment variables |
| Strong password requirements | [ ] | Supabase Auth config |
| Secure session tokens | [ ] | JWT via Supabase |
| No deprecated crypto algorithms | [ ] | N/A for client app |

**Baseline-specific checks:**
- [ ] Health data transmitted over HTTPS only
- [ ] No PII in URL parameters
- [ ] localStorage doesn't contain sensitive tokens

### A05:2025 - Injection

Injection flaws occur when untrusted data is sent to an interpreter.

| Check | Status | Notes |
|-------|--------|-------|
| SQL injection prevented | [ ] | Supabase SDK parameterizes |
| NoSQL injection prevented | [ ] | N/A |
| Command injection prevented | [ ] | No server-side commands |
| XSS prevented | [ ] | React auto-escapes |
| LDAP injection prevented | [ ] | N/A |
| Template injection prevented | [ ] | No template engines |

**Baseline-specific checks:**
- [ ] User input sanitized in tracker names
- [ ] Chart labels escaped properly
- [ ] Export filenames sanitized

### A06:2025 - Insecure Design

Insecure design represents missing or ineffective security controls.

| Check | Status | Notes |
|-------|--------|-------|
| Threat modeling performed | [ ] | Document threats |
| Security requirements defined | [ ] | See SECURITY.md |
| Secure development lifecycle | [ ] | Code review process |
| Principle of least privilege | [ ] | RLS policies |
| Defense in depth | [ ] | Multiple layers |
| Fail securely | [ ] | See Error Handling |

**Baseline-specific checks:**
- [ ] Multi-tenant data isolation designed
- [ ] Rate limiting on data operations
- [ ] Graceful degradation when APIs fail

### A07:2025 - Authentication Failures

Confirmation of user identity and session management.

| Check | Status | Notes |
|-------|--------|-------|
| Strong password policy | [ ] | Supabase config |
| MFA available | [ ] | Supabase supports |
| Session timeout configured | [ ] | Check Supabase Auth |
| Secure password recovery | [ ] | Magic link flow |
| Brute force protection | [ ] | Supabase rate limiting |
| Session fixation prevented | [ ] | New session on login |

**Baseline-specific checks:**
- [ ] "Remember me" has appropriate timeout
- [ ] Logout invalidates all sessions
- [ ] Password reset tokens expire

### A08:2025 - Software and Data Integrity Failures

Failures related to code and infrastructure that don't protect against integrity violations.

| Check | Status | Notes |
|-------|--------|-------|
| CI/CD pipeline secured | [ ] | GitHub Actions |
| Code signing in place | [ ] | Optional |
| Dependency integrity verified | [ ] | Lockfile hashes |
| No unsigned/unverified updates | [ ] | npm registry |
| Serialization safely handled | [ ] | JSON only |

**Baseline-specific checks:**
- [ ] Tracker configurations validated on import
- [ ] No arbitrary code execution from user data
- [ ] State encoder validates decoded data

### A09:2025 - Security Logging and Alerting Failures

Insufficient logging and monitoring coupled with missing incident response.

| Check | Status | Notes |
|-------|--------|-------|
| Authentication events logged | [ ] | Supabase logs |
| Access control failures logged | [ ] | RLS violations |
| Input validation failures logged | [ ] | Client-side only |
| High-value transactions logged | [ ] | Data exports |
| Logs protected from tampering | [ ] | Supabase managed |
| Alerting configured | [ ] | Set up in Supabase |

**Baseline-specific checks:**
- [ ] Sentry captures errors (production)
- [ ] No PII in error logs
- [ ] Failed login attempts monitored

### A10:2025 - Mishandling of Exceptional Conditions (NEW)

Improper handling of unexpected conditions that can lead to security issues.

| Check | Status | Notes |
|-------|--------|-------|
| All exceptions caught appropriately | [ ] | ErrorBoundary |
| No sensitive data in error messages | [ ] | Custom error pages |
| Fail-secure not fail-open | [ ] | Deny by default |
| Resource exhaustion handled | [ ] | React Query limits |
| Timeout handling in place | [ ] | API timeouts |
| Graceful degradation | [ ] | Offline handling |

**Baseline-specific checks:**
- [ ] Chart rendering fails gracefully
- [ ] API failures show user-friendly messages
- [ ] Data sync conflicts handled safely

---

## Supply Chain Security

### SBOM (Software Bill of Materials)

Generate an SBOM for each release to track all dependencies:

```bash
# Generate CycloneDX SBOM
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# Or use npm's built-in (Node 20+)
npm sbom --sbom-format cyclonedx
```

### Dependency Scanning

| Tool | Purpose | Frequency |
|------|---------|-----------|
| `npm audit` | Known vulnerabilities | Every build |
| Dependabot | Automated updates | Continuous |
| Snyk | Deep scanning | Weekly |
| Socket.dev | Supply chain risks | On PR |

**Audit commands:**
```bash
# Quick audit
npm audit

# Fix automatically where possible
npm audit fix

# Full report
npm audit --json > audit-report.json
```

### Package Evaluation Checklist

Before adding a new dependency:

- [ ] Package has >1000 weekly downloads
- [ ] Actively maintained (commits in last 6 months)
- [ ] No known critical vulnerabilities
- [ ] License compatible (MIT, Apache 2.0, BSD)
- [ ] Source code available and readable
- [ ] No unnecessary permissions/postinstall scripts
- [ ] Limited transitive dependencies
- [ ] Trusted maintainers/organization

### Lockfile Hygiene

- [ ] `package-lock.json` committed to repository
- [ ] CI uses `npm ci` (not `npm install`)
- [ ] Lockfile reviewed in PRs for unexpected changes
- [ ] No `file:` or `link:` dependencies in production

---

## Privacy & Regulatory Compliance

### Health Data Considerations

While Baseline is not HIPAA-regulated (no covered entity relationship), we follow best practices for health-related data:

| Principle | Implementation | Status |
|-----------|----------------|--------|
| Data minimization | Only collect necessary metrics | [ ] |
| Purpose limitation | Data used only for tracking | [ ] |
| Storage limitation | Retention policies defined | [ ] |
| User control | Export and delete available | [ ] |
| Encryption | TLS in transit, encrypted at rest | [ ] |

### GDPR Data Subject Rights

| Right | Implementation | Status |
|-------|----------------|--------|
| Right to access | Export functionality | [ ] |
| Right to rectification | Edit entries | [ ] |
| Right to erasure | Delete account/data | [ ] |
| Right to portability | JSON/CSV export | [ ] |
| Right to object | N/A (no profiling) | [ ] |
| Withdraw consent | Account deletion | [ ] |

### Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| User accounts | Until deletion requested | Cascade delete |
| Tracker entries | Until deletion requested | Soft/hard delete |
| Auth logs | 90 days | Automatic |
| Error logs | 30 days | Automatic (Sentry) |

### Privacy Checklist

- [ ] Privacy policy accessible and current
- [ ] Consent obtained before data collection
- [ ] Data processing purposes documented
- [ ] Third-party data sharing disclosed
- [ ] Cookie consent if applicable
- [ ] Data breach notification process defined

---

## CI/CD Security

### GitHub Repository Settings

| Setting | Required | Status |
|---------|----------|--------|
| Branch protection on `main` | Yes | [ ] |
| Require PR reviews | Yes | [ ] |
| Require status checks | Yes | [ ] |
| Require signed commits | Recommended | [ ] |
| Dismiss stale reviews | Yes | [ ] |
| Restrict force pushes | Yes | [ ] |

### GitHub Actions Security

- [ ] Secrets stored in GitHub Secrets (not in code)
- [ ] `GITHUB_TOKEN` has minimal permissions
- [ ] Third-party actions pinned to SHA
- [ ] No secrets printed in logs
- [ ] Workflow permissions restricted

**Example secure workflow:**
```yaml
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4  # Pin to version
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run build
```

### Build Security

- [ ] Build artifacts don't contain secrets
- [ ] Source maps disabled in production (or secured)
- [ ] Environment variables injected at build time
- [ ] No test credentials in production builds

---

## Secrets Management

### Environment Variable Inventory

| Variable | Purpose | Rotation Frequency |
|----------|---------|-------------------|
| `VITE_SUPABASE_URL` | API endpoint | Never (public) |
| `VITE_SUPABASE_ANON_KEY` | Client auth | Quarterly |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side | Quarterly |
| `SENTRY_DSN` | Error tracking | Yearly |

### Secret Scanning

Tools to detect secrets in code:

```bash
# Install git-secrets
brew install git-secrets

# Set up hooks
git secrets --install
git secrets --register-aws

# Scan repository
git secrets --scan
```

Alternative tools:
- **truffleHog**: Deep history scanning
- **gitleaks**: Fast secret detection
- **GitHub Secret Scanning**: Automatic (if enabled)

### Rotation Checklist

When rotating secrets:

- [ ] Generate new secret in provider dashboard
- [ ] Update in GitHub Secrets / hosting env vars
- [ ] Deploy with new secret
- [ ] Verify application works
- [ ] Revoke old secret
- [ ] Document rotation date

---

## Logging & Monitoring

### What to Log

| Event | Priority | Contains PII |
|-------|----------|--------------|
| Authentication success | Medium | User ID only |
| Authentication failure | High | Email (masked) |
| Authorization failure | High | User ID, resource |
| Data export | High | User ID |
| Account deletion | High | User ID |
| Configuration changes | Medium | User ID |

### What NOT to Log

- Passwords (even hashed)
- Full JWT tokens
- Credit card numbers
- Health data values
- IP addresses (in detail)
- Session cookies

### Log Retention

| Log Type | Retention | Location |
|----------|-----------|----------|
| Application errors | 30 days | Sentry |
| Auth events | 90 days | Supabase |
| API requests | 7 days | Supabase |
| Build logs | 30 days | GitHub |

### Monitoring Alerts

Configure alerts for:

- [ ] Unusual login patterns (location, frequency)
- [ ] Spike in failed authentication
- [ ] High error rates (Sentry)
- [ ] Database connection issues
- [ ] API rate limit approaches

---

## Error Handling Security

### Fail-Secure Patterns

| Scenario | Secure Response |
|----------|-----------------|
| Database unreachable | Show error, don't show cached data from other users |
| Auth token expired | Redirect to login, don't grant access |
| RLS policy fails | Deny access, log incident |
| API timeout | Show friendly error, retry with backoff |
| Invalid input | Reject entirely, don't partially process |

### Error Message Guidelines

**Do:**
- Show user-friendly messages
- Log detailed errors server-side
- Provide action items for users

**Don't:**
- Expose stack traces
- Show database errors
- Reveal system architecture
- Include sensitive data in errors

### Exception Boundaries

```tsx
// Every major feature should have an ErrorBoundary
<ErrorBoundary fallback={<FeatureError />}>
  <TrackerView />
</ErrorBoundary>
```

Verify coverage:
- [ ] App-level ErrorBoundary
- [ ] Route-level boundaries
- [ ] Feature-level boundaries for charts/data

---

## API Security

### Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Data read | 100 requests | 1 minute |
| Data write | 30 requests | 1 minute |
| Export | 5 requests | 1 hour |

### Request Validation

- [ ] Request size limits configured
- [ ] Content-Type validation
- [ ] JSON schema validation where applicable
- [ ] File upload size limits (if any)

### Timeout Configuration

| Operation | Timeout | Handling |
|-----------|---------|----------|
| API calls | 30 seconds | Retry with backoff |
| Auth operations | 10 seconds | Show timeout message |
| File uploads | 60 seconds | Progress indicator |
| Export generation | 120 seconds | Background job |

### CORS Configuration

- [ ] Origin whitelist configured
- [ ] Credentials mode appropriate
- [ ] No wildcard (*) in production
- [ ] Preflight caching enabled

---

## Backup & Disaster Recovery

### Backup Strategy

| Data | Backup Frequency | Retention | Encryption |
|------|------------------|-----------|------------|
| Database | Daily | 30 days | Yes |
| User uploads | Daily | 30 days | Yes |
| Configuration | On change | Forever | Yes |

### Backup Security

- [ ] Backups encrypted at rest
- [ ] Backup access restricted to admins
- [ ] Backup integrity verified regularly
- [ ] Recovery tested quarterly

### Disaster Recovery

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Database corruption | 4 hours | 24 hours | Restore from backup |
| Region outage | 8 hours | 24 hours | Failover to backup region |
| Complete data loss | 24 hours | 24 hours | Restore from offsite backup |

RTO = Recovery Time Objective
RPO = Recovery Point Objective

---

## Penetration Testing

### Scope Definition

**In Scope:**
- Web application (baseline.simonlowes.cloud)
- Authentication flows
- Data access controls
- API endpoints
- Client-side security

**Out of Scope:**
- Supabase infrastructure
- Hosting infrastructure (Dokploy/Traefik)
- Third-party APIs
- Social engineering
- Physical security

### Testing Tools

| Tool | Purpose | License |
|------|---------|---------|
| OWASP ZAP | Dynamic scanning | Open source |
| Burp Suite Community | Manual testing | Free |
| Nuclei | Vulnerability scanning | Open source |
| sqlmap | SQL injection testing | Open source |

### Testing Checklist

- [ ] Authentication bypass attempts
- [ ] Session management testing
- [ ] Access control testing (IDOR)
- [ ] Input validation testing
- [ ] Business logic testing
- [ ] API security testing
- [ ] Client-side security review

### Finding Severity

| Severity | Definition | Remediation SLA |
|----------|------------|-----------------|
| Critical | Data breach possible | 24 hours |
| High | Significant security impact | 7 days |
| Medium | Limited security impact | 30 days |
| Low | Minor security concern | 90 days |
| Info | Best practice improvement | Backlog |

---

## Audit Tracking

Use this section to track completed audits and findings.

### Audit Log

| Date | Type | Auditor | Findings | Status |
|------|------|---------|----------|--------|
| 2026-01-18 | Quick audit | Claude | 0 critical, 0 high | ✅ Pass |

**2026-01-18 Audit Details:**
- npm audit: 0 vulnerabilities
- Supabase Security Advisors: No issues
- RLS: All 9 tables enabled
- Service role key: Server-side only (Edge Functions)
- CSP: Properly configured with frame-ancestors 'none'
- Secrets: .env files gitignored correctly
- Raw HTML: 1 usage in chart.tsx (trusted CSS, acceptable)

### Open Findings

| ID | Severity | Description | Found | Due | Status |
|----|----------|-------------|-------|-----|--------|
| - | - | No open findings | - | - | - |

### Remediation History

| ID | Description | Fixed | Verified |
|----|-------------|-------|----------|
| - | Initial audit - clean baseline | 2026-01-18 | ✅ |

---

## Resources

### Security Standards
- [OWASP Top 10:2025](https://owasp.org/Top10/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

### Supply Chain
- [OWASP Dependency-Track](https://dependencytrack.org/)
- [Sigstore](https://www.sigstore.dev/) - Code signing
- [SLSA Framework](https://slsa.dev/) - Supply chain levels

### Privacy
- [GDPR Official Text](https://gdpr.eu/)
- [HIPAA Best Practices](https://www.hhs.gov/hipaa/)
- [Privacy by Design Principles](https://www.ipc.on.ca/wp-content/uploads/resources/7foundationalprinciples.pdf)

### Tools
- [OWASP ZAP](https://www.zaproxy.org/)
- [Snyk](https://snyk.io/)
- [npm audit](https://docs.npmjs.com/cli/audit)

---

*Last updated: January 2026*

*This document should be reviewed and updated quarterly.*
