# Baseline: Completed Roadmap Items

This document archives all completed phases and features from the product roadmap.

---

## Phase 1: Foundation Refactor (v2.0) ✅ COMPLETE

### Goal

Rename and restructure the app to support multiple tracking types while maintaining backward compatibility for existing pain diary users.

### Completed Items

- Rename the app to "Baseline" throughout the codebase ✅
- Refactor the data model to support multiple "tracker types" per user ✅
- Create a new `trackers` table where each user can have multiple trackers ✅
- Each tracker has: id, user_id, name, type (preset or custom), icon, color, created_at ✅
- Migrate existing tracker_entries to belong to a default "Chronic Pain" tracker ✅
- Update the UI to show a tracker selector/switcher ✅
- Keep all existing pain diary functionality working ✅
- Integrate **shadcn/ui** for the design system ✅
  - Install and configure Tailwind CSS + shadcn/ui ✅
  - Replace core UI elements with shadcn components (Button, Input, Card, Dialog) ✅
  - Ensure consistent theming and accessibility ✅

---

## Phase 2: Preset Tracker Templates (v2.1) ✅ COMPLETE

### Goal

Offer curated preset trackers for common use cases with pre-configured fields, categories, and suggested keywords.

### Completed Items

- Create a `tracker_templates` system with presets: ✅
  - CHRONIC PAIN ✅
  - MENSTRUAL CYCLE ✅
  - MOOD & MENTAL HEALTH ✅
  - SLEEP ✅
  - MEDICATION & SUPPLEMENTS ✅
  - EXERCISE & MOVEMENT ✅

- Create an onboarding flow: ✅
  - Welcome screen explaining the app ✅
  - "What would you like to track?" with preset cards ✅
  - Allow selecting multiple presets ✅
  - Option to "Create Custom Tracker" ✅

- Template data structure implemented ✅
- Category and hashtag suggestion components ✅

---

## Phase 3: Custom Tracker Builder (v2.2) - Completed Items

### Completed Items

- Custom Tracker Creation Wizard ✅
- AI Keyword Generation (via Gemini edge functions) ✅
- Dynamic form renderer that builds the entry form from field definitions ✅
- Ambiguity detection for tracker names ✅
- Disambiguation UI with interpretation selection ✅
- Spell-check / typo detection (Levenshtein distance) ✅

---

## Phase 4: Visual Analytics Dashboard (v3.0) ✅ COMPLETE

### Goal

Provide beautiful, insightful visualizations of tracked data with multiple chart types and trend analysis.

### Completed Items

- Dashboard Overview with summary cards ✅
- Recent entries feed ✅
- Basic chart components (using Recharts) ✅
- Time range controls ✅
- LINE CHARTS with intensity trend over time ✅
- BAR CHARTS for trigger frequency & intensity distribution ✅
- PIE/DONUT CHARTS for location distribution ✅
- HEATMAP CALENDAR (GitHub-style activity calendar) ✅
- Hashtag cloud visualization ✅
- Insights Engine (pattern detection, trend analysis, streaks, anomaly detection, trigger correlations, peak day analysis) ✅
- Export Options (PNG, CSV, PDF) ✅
- Cross-tracker analytics dashboard with accordion layout ✅
- Interactive drill-down from charts to entries ✅
- Responsive mobile-first design ✅
- Theme-reactive chart colors ✅ (v3.0.1)
  - 9 color themes with light/dark variants (Zinc, Nature, Rose, Violet, Amber, Indigo, Cyan, Orange, Plum)
  - Heatmap calendar and trigger bar charts update instantly on theme change
  - Centralized `useThemeAwareColors` hook for reactive CSS variable access

### Implementation Details

- Analytics utilities in `src/lib/analytics-utils.ts`
- Theme-aware colors hook in `src/hooks/use-theme-colors.ts`
- Chart components in `src/components/analytics/`:
  - `IntensityTrendLine.tsx` - Line chart with moving average
  - `LocationDistributionPie.tsx` - Donut chart for body locations
  - `TriggerFrequencyBar.tsx` - Bar chart with horizontal/vertical layouts
  - `IntensityDistributionBar.tsx` - Histogram of intensity levels
  - `HashtagCloud.tsx` - Weighted tag cloud
  - `EntryHeatmapCalendar.tsx` - GitHub-style contribution calendar
  - `InsightsPanel.tsx` - AI-generated pattern insights
  - `AnalyticsDashboard.tsx` - Main dashboard with all visualizations
- Export powered by html2canvas + jsPDF

---

## Technical Debt Addressed

- **Code splitting** - Partially addressed (lazy loading in some areas)
- **Testing** - Unit tests added (Vitest), E2E tests added (Playwright) ✅
- **Error boundaries** - Some error handling added ✅

---

_Archived: January 2026_
