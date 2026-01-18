# Changelog

All notable changes to **Baseline** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Legal documents updated to British English spelling
- Terms of Service liability cap simplified for free app (£100 flat cap)

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
