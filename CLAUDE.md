# Baseline - Health Tracking App

## AUTONOMOUS EXECUTION RULES
When running unattended: Never ask questions, never present options, make all decisions yourself, proceed immediately.

## Project Overview
**Baseline** - A flexible health tracking platform for monitoring pain, mood, sleep, medications, or custom metrics with visualizations and insights.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **UI**: shadcn/ui (Tailwind CSS v4 + Radix UI)
- **Backend**: Supabase (Auth, PostgreSQL, RLS)
- **State**: TanStack React Query
- **Charts**: Recharts, D3
- **Testing**: Vitest, Playwright

## Environment Setup
Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` — see `README.md` for details.

## Key Commands
```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run test         # Run unit tests
npm run test:watch   # Run unit tests in watch mode
npm run test:e2e     # Run Playwright tests
npm run lint         # ESLint check
npm run preview      # Preview production build locally
```

## Architecture
- **Ports & Adapters pattern** - Clean separation of concerns
- Components in `src/components/ui/` (shadcn)
- Pages/features in `src/components/`
- Services in `src/services/` (image generation, config generation, sync, dictionary, wiki, datamuse)
- Supabase client in `src/lib/supabase.ts`
- Types in `src/types/` (includes tracker presets in `tracker.ts`)

## Database
- Supabase with Row Level Security (RLS)
- Migrations in `supabase/migrations/`
- Schema docs in `SUPABASE_SCHEMA.sql`

## Design System
- **Calming palette**: Soft teal primary, warm cream backgrounds
- **Font**: Source Sans 3
- **Animations**: Gentle, 200-300ms, never jarring
- Uses shadcn/ui components - check `components.json` for config

## Common Tasks

### Adding a New Tracker Type
1. Add type to `src/types/tracker.ts`
2. Add preset to `TRACKER_PRESETS` in `src/types/tracker.ts`
3. Add UI components for the new metric type
4. Update Supabase RLS policies if needed

### Adding a New Page/Feature
1. Create component in `src/components/`
2. Add route if needed
3. Create React Query hooks for data fetching
4. Write Vitest tests

### UI Changes
- Use existing shadcn components from `src/components/ui/`
- Follow the calming design language in PRD.md
- Test on mobile viewport sizes

## Files to Reference
- `PRD.md` - Product requirements and design specs
- `SUPABASE_SCHEMA.sql` - Database schema
- `README.md` - Setup instructions
- `src/components/ui/` - shadcn component library

## GitHub Repository Configuration

**Branch protection on `main`** (configured Jan 2026):
- Required status checks: CodeQL (`Analyze (javascript-typescript)`) and Smoke Test
- Strict mode: branches must be up-to-date before merging
- Enforce admins: true (even admins can't bypass)
- No force pushes or branch deletion allowed
- No required PR reviews (solo project - automated checks are the safety net)

**Dependabot auto-merge**: Enabled. Non-major PRs auto-merge after CodeQL and Smoke Test pass. There is no AI review step (see "Claude GitHub Actions" below).

**Security rationale**: CodeQL scans every PR for vulnerabilities before merge. Human review not required for solo dev, but automated security scanning is enforced. If collaborators are added, revisit and enable required reviews.

## Security Test Suite

Automated security tests enforce invariants via static analysis (no mocking, no runtime deps). Tests run in ~250ms total.

### Unit Tests (Vitest)
- **`supabase/functions/__tests__/prompt-sanitizer.test.ts`** — Prompt injection detection (15+ OWASP patterns), character stripping, truncation
- **`src/lib/__tests__/security-headers.test.ts`** — CSP meta tag properties, security headers (HSTS, X-Frame-Options, Permissions-Policy), no dev artefacts
- **`src/lib/__tests__/xss-safety.test.ts`** — Raw HTML injection allowlist (chart.tsx only), innerHTML allowlist (Dashboard.tsx only), 8 forbidden DOM patterns
- **`supabase/functions/__tests__/edge-function-security.test.ts`** — Auth enforcement on all 9 edge functions, CORS allowlist, error sanitisation, prompt sanitizer imports, SECURITY DEFINER + search_path. **Explicit function list — adding a new edge function requires updating `EDGE_FUNCTIONS` array in this test.**
- **`src/adapters/__tests__/auth-security.test.ts`** — `e2e=true`/`dev=true` gated by `import.meta.env.DEV`, no JWT in localStorage

### E2E Tests (Playwright)
- **`tests/e2e/security-csp.spec.ts`** — CSP meta tag present in production build
- **`tests/e2e/security-auth.spec.ts`** — `?e2e=true` and `?dev=true` ignored in production, `window.__dev` undefined
- **`tests/e2e/security-headers.spec.ts`** — CSP present, no server version disclosure

### Known Gaps (tracked in tests)
- `configGenerationService.ts` and `Dashboard.tsx` have ungated `e2e=true` checks (non-auth, but should be DEV-gated) — allowlisted in auth-security test with TODO
- Cyrillic homoglyphs can evade prompt sanitizer ASCII regex — documented in prompt-sanitizer test

## Image Generation Architecture

Gemini image generation uses a shared module at `supabase/functions/_shared/gemini-image.ts`:
- **Safety block detection**: Checks both `promptFeedback.blockReason` and `finishReason: SAFETY/PROHIBITED_CONTENT`
- **Progressive retry**: 3 prompt strategies (standard → abstract → generic) to handle content safety blocks
- **Used by**: `generate-tracker-image` and `backfill-tracker-images` edge functions
- **Frontend**: `src/services/imageGenerationService.ts` propagates `isContentBlock` flag; all 11 call sites in Dashboard, TrackerSelector, and WelcomeScreen show toast errors on failure
- **Regenerate**: Desktop tracker dropdown menu includes "Regenerate Icon" option

## Testing Standards
When testing this project, read `testing-standards.md` from the memory directory first. Before running tests, do a quick web search for updates to the specific tools being used. Update the memory file with any changes found.

## When Making Changes
1. Check existing patterns in codebase first
2. Maintain TypeScript strict mode compliance
3. Ensure RLS policies are respected
4. Keep the calming, accessible UX
5. **Update CHANGELOG.md** before every commit (add to Unreleased section)
6. Run `npm run lint` and `npm run test` before committing
7. When adding a new edge function, update the `EDGE_FUNCTIONS` list in `supabase/functions/__tests__/edge-function-security.test.ts`
8. When adding raw HTML injection patterns or innerHTML, update the allowlist in `src/lib/__tests__/xss-safety.test.ts`
9. When modifying Gemini image generation (model, prompts, API URL), update both `_shared/gemini-image.ts` and the `gemini-model-strings.test.ts` static analysis test

## Claude GitHub Actions (removed September 2026)

This repo previously ran `anthropics/claude-code-action` in CI: a `claude-review` job inside the Dependabot auto-merge workflow, a stale duplicate of that workflow (`claude-chores.yml`), and an `@claude` mention workflow (`claude.yml`). All of it was removed because the jobs had failed on every PR since July 2026 (expired `CLAUDE_CODE_OAUTH_TOKEN`, plus upstream bugs) and nothing depended on them. Merges are gated by branch protection and the required status checks, not by an AI review. The `CLAUDE_CODE_OAUTH_TOKEN` repository secret can be deleted. To bring it back, see https://code.claude.com/docs/en/github-actions.

