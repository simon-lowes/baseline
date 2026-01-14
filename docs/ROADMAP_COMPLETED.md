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
- Conversational Gemini-powered tracker builder ✅
  - Multi-turn conversation flow with Gemini
  - Intelligent question generation based on context
  - Confidence-based completion detection
  - "Anything else?" final confirmation step
- AI-generated tracker images (Gemini 2.5 Flash) ✅
- Tracker naming from selected interpretation (e.g., "Sleep Debt" not "Debt") ✅
- Tracker deletion with proper navigation to dashboard ✅
- CORS security hardening (exact origin matching) ✅
- Edge function deployment for all AI features ✅

---

## Phase 3b: Advanced Field Builder ✅ COMPLETE

### Goal

Extend the custom tracker builder with advanced field types and drag-to-reorder capability.

### Completed Items

- Drag-to-reorder fields with grip handles (dnd-kit) ✅
- Number scale field type (slider with min/max/step) ✅
- Single select field type (radio buttons) ✅
- Multi-select field type (checkboxes) ✅
- Text field type (single line or multiline) ✅
- Toggle field type (Yes/No with custom labels) ✅
- Time picker field type ✅
  - 12-hour format with AM/PM selector
  - 24-hour format option
- Duration picker field type ✅
  - Hours and minutes inputs
  - Optional seconds input
- Emoji picker field type ✅
  - Preset categories: mood, health, activity, weather
  - Custom emoji selection
  - Visual grid selector in forms
- Field configuration panel with type-specific settings ✅
- Backend validation for all field types (edge function) ✅

### Implementation Details

- Field type definitions in `src/types/tracker-fields.ts`
- Field components in `src/components/fields/`:
  - `TimeField.tsx` - Time picker with 12/24 hour support
  - `DurationField.tsx` - Duration input (hours/minutes/seconds)
  - `EmojiField.tsx` - Visual emoji grid selector
  - `FieldConfigPanel.tsx` - Configuration UI for all field types
  - `DynamicFieldForm.tsx` - Runtime form renderer
  - `FieldList.tsx` - Drag-to-reorder field list

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

## Phase 5: Interlinked Tracker Insights (v3.1) ✅ COMPLETE

### Goal

Help users discover how their trackers are interlinked—revealing patterns like how sleep quality affects next-day pain levels, or how exercise impacts mood over time.

### Completed Items

- Correlation engine with Pearson correlation coefficient ✅
- Lag effect analysis (0-3 day delays) ✅
  - Tests correlations with time shifts (e.g., sleep today → pain tomorrow)
  - Automatically finds optimal lag for strongest correlation
- Timeline overlay visualization ✅
  - Multiple trackers on one chart
  - Normalized 0-100% scale for comparison
  - Theme-aware colors
- Interlink insights panel ✅
  - Human-readable insight cards
  - Correlation strength indicators (strong/moderate/weak)
  - Lag day badges ("Next day", "2-day delay")
  - Actionable suggestions for strong correlations
- Manual pair selector ✅
  - Auto-suggested pairs from detected correlations
  - Custom pair selection with dropdowns
  - Limit of 5 manual pairs
- Data threshold enforcement ✅
  - 30 days minimum before showing insights
  - Progress bar showing data collection status
- Both auto-detection AND user-selected pairs ✅
- Hidden in single-tracker mode (only shows in "All Trackers" view) ✅

### Implementation Details

- Correlation utilities in `src/lib/interlink-utils.ts`
- Data hook in `src/hooks/use-interlink-data.ts`
- Components in `src/components/analytics/`:
  - `InterlinkInsightsPanel.tsx` - Pattern discovery display
  - `InterlinkTimelineChart.tsx` - Multi-tracker overlay
  - `InterlinkPairSelector.tsx` - Manual pair selection UI
- Integrated into `AnalyticsDashboard.tsx` as "Interlinked Insights" accordion section

---

## Phase 7: Data Export & Doctor Reports (v4.0) ✅ COMPLETE

### Goal

Enable users to export their tracking data as CSV for personal analysis or as professional PDF reports for healthcare providers.

### Completed Items

- Export dialog with format selection ✅
  - CSV or PDF format choice
  - Date range picker with presets (7d, 30d, 90d, 1y, all, custom)
  - Entry count preview for selected range
- CSV export functionality ✅
  - Schema v1 support (fixed fields: intensity, locations, triggers)
  - Schema v2 support (custom fields from field_values JSONB)
  - Auto-detection of tracker schema version
  - Daily summary CSV option
- PDF report generation ✅
  - Professional A4 layout for healthcare providers
  - Summary statistics section
  - Optional chart inclusion (trend, heatmap)
  - Optional insights section
  - Watermarked footer with generation date
- Chart capture utilities ✅
  - html2canvas integration for chart screenshots
  - Data attributes on chart sections for targeting
- Integration into Analytics Dashboard ✅
  - "Export Data..." option in export dropdown
  - Quick export options preserved (CSV, PNG, PDF screenshot)

### Implementation Details

- Type definitions in `src/types/export.ts`
- Export components in `src/components/export/`:
  - `DateRangePicker.tsx` - Date range selection with presets
  - `ExportDialog.tsx` - Main export modal
  - `index.ts` - Barrel export
- Export utilities in `src/lib/export/`:
  - `csv-export.ts` - CSV generation for both schema versions
  - `pdf-report.ts` - Professional PDF report generator
  - `report-charts.ts` - Chart capture utilities
  - `index.ts` - Barrel export
- Integrated into `AnalyticsDashboard.tsx` with `handleAdvancedExport` callback

---

## Technical Debt Addressed

- **Code splitting** - Partially addressed (lazy loading in some areas)
- **Testing** - Unit tests added (Vitest), E2E tests added (Playwright) ✅
- **Error boundaries** - Some error handling added ✅
- **Offline support** - Service worker for offline entry creation ✅
  - PWA configured with Vite PWA plugin
  - Background sync for offline entries
  - Install prompt and update notifications
- **Accessibility** - WCAG 2.1 AA compliance ✅
  - Skip links for keyboard navigation
  - ARIA labels and live regions
  - Reduced motion support
  - Focus management in dialogs
- **Performance** - Virtualized lists for large entry counts ✅
  - VirtualizedEntryList component with TanStack Virtual
  - Efficient rendering for 1000+ entries

---

## Account Settings & GDPR Compliance (v4.1) ✅ COMPLETE

### Goal

Provide user account management with GDPR-compliant data export and account deletion.

### Completed Items

- Account Settings dialog accessible from header ✅
- Profile section with email display ✅
- Data Export section (GDPR Article 20 - Right to Data Portability) ✅
  - CSV export for spreadsheets
  - JSON export with full metadata
  - Shows entry/tracker counts with loading state
- Danger Zone with account deletion (GDPR Article 17 - Right to Erasure) ✅
  - Multi-step confirmation flow
  - Data export offer before deletion
  - Type "DELETE" to confirm
  - Progress indicator during deletion

### Implementation Details

- Components in `src/components/settings/`:
  - `ProfileSection.tsx` - Email display, display name editing
  - `DataExportSection.tsx` - Self-contained data fetching with export options
  - `DangerZoneSection.tsx` - Warning section with deletion trigger
  - `DeleteAccountDialog.tsx` - Multi-step deletion confirmation
- Main dialog: `src/components/AccountSettings.tsx`
- Auth port extended with `deleteAccount()` method
- Supabase Edge Function for server-side account deletion

---

_Last updated: January 14, 2026 (Account Settings complete)_
