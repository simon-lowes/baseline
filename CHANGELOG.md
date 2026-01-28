# Changelog

All notable changes to **Baseline** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- **White screen crash** caused by React error #527 (mismatched react/react-dom versions)
  - Pinned react and react-dom to exact version 19.2.3 (no caret ranges)
  - Added npm `overrides` to force consistent React versions across all dependencies
  - Removed stale `workspaces` config leftover from Convex migration
- CSP `frame-ancestors` directive moved from unsupported `<meta>` tag to Vercel HTTP headers
- Added SVG favicon to fix 404 on `/favicon.ico`

### Added

- **Dependabot verification pipeline** — two-layer safety net before auto-merge
  - Playwright smoke test that loads the production build and catches fatal JS errors (React #527, chunk load failures, uncaught exceptions)
  - Claude Code review job that analyses changelogs, checks React version consistency, and validates peer dependencies before approving
  - Smoke test runs as a separate GitHub Actions workflow on all PRs to `main`
- Theme onboarding system with respectful, non-intrusive indicators
  - Theme CTA (colour picker pulse) shows max 6 times, persists via server for auth users
  - Mode indicator tooltip (Light/Dark/System) shows once per session, auto-dismisses
  - Server-side sync via `profiles.theme_onboarding_completed` column
- Authentication recovery dialog for expired/invalid magic links
  - Clear explanation of what happened (link expired, pre-fetched by email client)
  - Option to request a new magic link directly from the dialog
  - Option to switch to password sign-in
- PKCE-based magic link verification (`/auth/confirm` route)
  - Immune to email client link pre-fetching (requires JS execution)
  - Dedicated landing page with loading, success, and error states
- Password reset page (`/reset-password` route)
  - Dedicated landing page with token verification and password form
  - Uses PKCE flow for reliability (immune to email client pre-fetching)
  - Clear error handling for expired/invalid links

### Changed

- High Contrast theme is now toggleable (click again to exit)
  - Follows accessibility best practice: accessibility features should be toggleable
  - Remembers previous theme and restores it when toggling off
  - Falls back to Zinc if no previous theme stored
- Magic link button on sign-in page now clearly explains its dual purpose
  - Added helper text above button: "New or returning? We'll email you a sign-in link"
  - Renamed button from "Continue with email" to "Email me a sign-in link"
  - Users now understand the button works for both sign-up and sign-in before clicking
- Theme colour intensity increased for better visibility
  - Background, card, and border chroma values boosted 2-3x across all 9 colour themes
  - Light mode: backgrounds now have 0.025 chroma (was ~0.01), borders have 0.05 (was ~0.02)
  - Dark mode: backgrounds now have 0.03 chroma (was ~0.02), borders have 0.05 (was ~0.02)
  - Theme changes are now noticeably visible while remaining subtle and professional
  - High-contrast accessibility theme unchanged
- Magic links now work for both sign-in AND account creation (dual-purpose)
  - Button changed from "Sign in with email link" to "Continue with email"
  - Subtitle now says "works for new and existing accounts"
  - Check email screen messaging updated to reflect dual purpose
  - Improves accessibility for neurodiverse users who may miss smaller "Create account" link
- Legal documents updated to British English spelling
- Terms of Service liability cap simplified for free app (£100 flat cap)
- Theme CTA tooltip changed from "Pick your theme! 🎨" to "Personalise your theme"
- Magic link redirects now use `/auth/confirm` for PKCE flow (improved reliability)
- Signup confirmation screen now warns existing users they won't receive an email

### Fixed

- Custom accent colour picker now works when High Contrast theme is active
  - Previously, picking a custom colour while on High Contrast didn't visually change the UI
  - Now automatically switches to Zinc theme before applying custom accent
  - High Contrast's stark black/white was overriding the custom colour effect
- Custom accent colour now cleared when selecting a preset theme
  - Previously, custom accent inline styles overrode preset theme CSS due to specificity
  - Now clicking any preset theme (Zinc, Rose, Violet, etc.) clears the custom accent
  - Also syncs the clearing to server for authenticated users
- Search crash when entries have null `triggers` or `locations` arrays
  - Added nullish coalescing (`?? []`) before calling `.join()` in search filter
  - Matches existing defensive pattern used for `hashtags` field
- Failing unit tests for ambiguous tracker name guard
  - Tests were hitting `generated_config` validation before reaching ambiguous name check
  - Added `type: 'preset'` to test inputs to bypass unrelated validation
- Theme onboarding tooltips no longer overlap on mobile (mode indicator hidden when CTA active)
- Magic links now work when email clients pre-fetch/scan links (PKCE flow)
- Auth errors in URL hash now display user-friendly error messages instead of silent failure
- Users trying to sign up with existing email now see clear guidance to sign in instead
- AI insights now understand tracker polarity (high_bad vs low_bad)
  - For pain trackers: decreasing intensity = "improving trend"
  - For mood/sleep trackers: increasing intensity = "improving trend"
  - Peak days, trigger correlations, and anomaly detection all respect polarity
  - Previously all trackers were treated like pain (decreasing = better)
- Aggregated "View Your Progress" insights now analyze each tracker with correct polarity
  - Entries are grouped by tracker and analyzed with their respective polarity
  - Insight titles now prefixed with tracker name (e.g., "Mood: Improving trend!")
  - Previously all entries were analyzed as pain (high_bad) in aggregated view
- Custom accent colour now properly overrides theme colours
  - Now sets both `--primary` (buttons, switches) and `--accent` (hover states)
  - Previously only set `--accent`, leaving main UI elements unchanged

---

## [Beta] - 2026-01-18

Major milestone: Full-featured health tracking app with AI-powered tracker creation, theming, offline support, and accessibility compliance.

### Added

- **Navigation**: Browser back/forward support with invisible routing (no URL changes)
- **Professional Infrastructure**: About dialog, Help center, feedback links
- **Account Settings**: GDPR-compliant data export (JSON) and account deletion
- **Offline Support**: PWA service worker with offline access to cached data
- **Accessibility**: WCAG 2.1 AA compliance (focus management, ARIA labels, keyboard nav)
- **Theme System**: 8 color themes (Teal, Rose, Blue, Green, Violet, Amber, Indigo, Cyan) with dark mode
- **AI Tracker Builder**: Conversational tracker creation powered by Gemini
- **Swipeable Cards**: Mobile-friendly swipe gestures for tracker actions
- **Session Persistence**: "Remember me" functionality with draft saving
- **Email Templates**: Custom templates for confirmation, password reset, email change
- **Timezone Support**: Timezone-aware date handling and 24-hour clock format option
- **AI-Generated Images**: Unique tracker images generated via AI on dashboard
- **Smart Disambiguation**: Clarification step when tracker names are ambiguous
- **Dictionary Service**: Word lookup and caching for tracker context
- **Report Charts**: Utilities for capturing analytics charts as images
- **Theme Sync**: Server-side theme preference sync across devices

### Changed

- Simplified tracker header for better mobile UX (removed redundant back button)
- Improved navigation with cleaner, more spacious header layout
- Code splitting for reduced initial bundle sizes
- Theme-reactive chart colors that adapt to selected theme
- Upgraded to Gemini 3.0 models for AI features

### Fixed

- Mobile horizontal scrolling issues on header and swipeable cards
- Selected tags now use theme primary color for better visibility
- Race conditions in tracker auto-selection on component mount
- Tracker deletion now navigates to dashboard correctly
- Settings components fetch their own entry data (fixed data loading)
- React included in main bundle to fix chunk loading order
- PWA precache limits increased for larger bundles
- TypeScript compilation errors resolved
- Null safety for entry arrays (locations, triggers)
- Migration filename inconsistencies with database records

### Security

- Resolved CORS origin bypass vulnerability in edge functions
- Fixed biased cryptographic random number generation (GitHub Alert #3)
- Enhanced rate limiting across all edge functions
- Added HTTPS localhost variants to CORS allowed origins

### Removed

- Convex backend experiment (reverted to Supabase-only architecture)
- Redundant in-app back button (browser handles navigation)

---

## [Alpha] - 2025-12-21

Initial public release: Migration from Spark prototype to Supabase-powered app.

### Added

- **Authentication**: Magic Link email authentication via Supabase
- **Multi-Tracker Support**: Create and manage multiple health trackers
- **Welcome Screen**: Onboarding flow for new users
- **Dashboard**: Home view with all trackers displayed as cards
- **Entry Logging**: Log health entries with severity scale (1-10)
- **Tagging System**: Location and trigger tags for entries
- **Analytics Dashboard**: Charts and visualizations for tracking patterns
- **Search**: Full-text search across notes, triggers, and locations
- **Entry Calendar**: Heatmap calendar view of entry history
- **Preset Trackers**: Quick-start templates (Pain, Mood, Sleep, etc.)
- **Custom Trackers**: Create trackers for anything with AI-generated context
- **Mobile-First Design**: Responsive layout optimized for mobile devices
- **Real-time Sync**: Supabase real-time subscriptions for live updates

### Technical

- React 19 with TypeScript
- Vite build system
- Supabase (Auth, PostgreSQL, Row Level Security)
- TanStack React Query for data fetching
- Tailwind CSS v4 with shadcn/ui components
- Recharts for analytics visualizations
- Framer Motion for animations

---

## Version History Reference

| Version | Date | Highlights |
|---------|------|------------|
| Beta | 2026-01-18 | AI features, theming, offline, accessibility |
| Alpha | 2025-12-21 | Initial Supabase release |
