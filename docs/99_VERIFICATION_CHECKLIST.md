# 99 Verification Checklist (Copilot Prompt)

Paste this into Copilot Chat after you finish a provider integration.

---

Run through this checklist and fix any failures.

## Build
- [ ] `npm install` clean
- [ ] `npm run dev` works
- [ ] `npm run build` succeeds
- [ ] No references to `@github/spark` remain
- [ ] No references to `spark.` remain

## Runtime
- [ ] `.env.example` exists and matches framework env prefix rules
- [ ] app shows “Not configured” errors clearly if backend not set
- [ ] Diagnostics page shows current provider + user

## Auth
- [ ] Sign up, sign in, sign out flow works
- [ ] Auth state persists on refresh
- [ ] User ID is stable and available via `auth.getUser()`

## Data security
- [ ] Multi-user test:
  - Create 2 users
  - User A cannot read/write User B data
- [ ] DB queries always filter by user_id (unless data is public)
- [ ] If using RLS/Rules: verify policies/rules enforce isolation

## Observability
- [ ] Meaningful errors surfaced to user
- [ ] Console logs removed or guarded in dev

## Mobile UI
- [ ] iOS Safari: Create Tracker opens and stays visible when keyboard shows/hides
- [ ] iOS Safari: Disambiguation flow stays visible (no dimmed screen only)
- [ ] iOS Safari: Scroll within modal works and can close with Cancel

Report results and create `POST_MIGRATION_REPORT.md`.
