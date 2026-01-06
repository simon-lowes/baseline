# Product Roadmap: From Chronic Pain Diary to Baseline

## Vision

Transform the Chronic Pain Diary into **Baseline** — a flexible, user-centric tracking platform that empowers users to monitor any aspect of their life—pain, mood, menstrual cycles, habits, or entirely custom metrics—with beautiful visualizations and actionable insights.

**Why "Baseline"?** Know your baseline, spot the changes. It captures the essence of tracking: understanding your normal so you can identify what's different.

---

## Phase 1: Foundation Refactor (Current → v2.0) ✅ COMPLETE

### Goal

~~Rename and restructure the app to support multiple tracking types while maintaining backward compatibility for existing pain diary users.~~

### Completed Items

- ~~Rename the app to "Baseline" throughout the codebase~~ ✅
- ~~Refactor the data model to support multiple "tracker types" per user~~ ✅
- ~~Create a new `trackers` table where each user can have multiple trackers~~ ✅
- ~~Each tracker has: id, user_id, name, type (preset or custom), icon, color, created_at~~ ✅
- ~~Migrate existing tracker_entries to belong to a default "Chronic Pain" tracker~~ ✅
- ~~Update the UI to show a tracker selector/switcher~~ ✅
- ~~Keep all existing pain diary functionality working~~ ✅
- ~~Integrate **shadcn/ui** for the design system~~ ✅
  - ~~Install and configure Tailwind CSS + shadcn/ui~~ ✅
  - ~~Replace core UI elements with shadcn components (Button, Input, Card, Dialog)~~ ✅
  - ~~Ensure consistent theming and accessibility~~ ✅

---

## Phase 2: Preset Tracker Templates (v2.1) ✅ COMPLETE

### Goal

~~Offer curated preset trackers for common use cases with pre-configured fields, categories, and suggested keywords.~~

### Completed Items

- ~~Create a `tracker_templates` system with presets:~~ ✅
  - ~~CHRONIC PAIN~~ ✅
  - ~~MENSTRUAL CYCLE~~ ✅
  - ~~MOOD & MENTAL HEALTH~~ ✅
  - ~~SLEEP~~ ✅
  - ~~MEDICATION & SUPPLEMENTS~~ ✅
  - ~~EXERCISE & MOVEMENT~~ ✅

- ~~Create an onboarding flow:~~ ✅
  - ~~Welcome screen explaining the app~~ ✅
  - ~~"What would you like to track?" with preset cards~~ ✅
  - ~~Allow selecting multiple presets~~ ✅
  - ~~Option to "Create Custom Tracker"~~ ✅

- ~~Template data structure implemented~~ ✅
- ~~Category and hashtag suggestion components~~ ✅

---

## Phase 3: Custom Tracker Builder (v2.2) ✅ MOSTLY COMPLETE

### Goal

~~Empower users to create completely custom trackers with their own fields, categories, and keywords.~~

### Completed Items

- ~~Custom Tracker Creation Wizard~~ ✅
- ~~AI Keyword Generation (via Gemini edge functions)~~ ✅
- ~~Dynamic form renderer that builds the entry form from field definitions~~ ✅
- ~~Ambiguity detection for tracker names~~ ✅
- ~~Disambiguation UI with interpretation selection~~ ✅
- ~~Spell-check / typo detection (Levenshtein distance)~~ ✅

### Remaining Items

- Field Builder with drag-to-reorder (partial)
- Full custom field type coverage (Number scale, Single select, Multi-select, Text, Time, Duration, Yes/No toggle, Emoji picker)

---

## Phase 4: Visual Analytics Dashboard (v3.0) ✅ COMPLETE

### Goal

Provide beautiful, insightful visualizations of tracked data with multiple chart types and trend analysis.

### Completed Items

- ~~Dashboard Overview with summary cards~~ ✅
- ~~Recent entries feed~~ ✅
- ~~Basic chart components (using Recharts)~~ ✅
- ~~Time range controls~~ ✅
- ~~LINE CHARTS with intensity trend over time~~ ✅
- ~~BAR CHARTS for trigger frequency & intensity distribution~~ ✅
- ~~PIE/DONUT CHARTS for location distribution~~ ✅
- ~~HEATMAP CALENDAR (GitHub-style activity calendar)~~ ✅
- ~~Hashtag cloud visualization~~ ✅
- ~~Insights Engine (pattern detection, trend analysis, streaks, anomaly detection, trigger correlations, peak day analysis)~~ ✅
- ~~Export Options (PNG, CSV, PDF)~~ ✅
- ~~Cross-tracker analytics dashboard with accordion layout~~ ✅
- ~~Interactive drill-down from charts to entries~~ ✅
- ~~Responsive mobile-first design~~ ✅
- ~~Theme-reactive chart colors~~ ✅ (v3.0.1)
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

## Phase 5: Correlations & Cross-Tracker Insights (v3.1) ❌ NOT STARTED

### Goal

Help users discover connections between different trackers (e.g., sleep affecting pain, exercise affecting mood).

_(No changes - not yet implemented)_

---

## Phase 6: Smart Reminders & Predictions (v3.2) ❌ NOT STARTED

### Goal

Proactive notifications and predictions based on historical patterns.

_(No changes - not yet implemented)_

---

## Phase 7: Data Export, Sharing & Doctor Reports (v4.0) ❌ NOT STARTED

### Goal

Enable users to share their data with healthcare providers or export for personal use.

_(No changes - not yet implemented)_

---

## Phase 8: Publish to Blog (v5.0) ❌ NOT STARTED

### Goal

Enable users to publish their tracking diary as a beautiful public blog, powered by Astro and deployed on Netlify—with zero technical skills required.

_(No changes - not yet implemented)_

---

## Technical Debt to Address

Before major feature work, consider:

1. ~~**Code splitting**~~ - Partially addressed (lazy loading in some areas)
2. ~~**Testing**~~ - Unit tests added (Vitest), E2E tests added (Playwright) ✅
3. ~~**Error boundaries**~~ - Some error handling added ✅
4. **Offline support** - Service worker for offline entry creation ❌
5. **Accessibility** - WCAG 2.1 AA compliance audit ❌
6. **Performance** - Virtualized lists for large entry counts ❌

---

## Priority Matrix

| Phase                  | Effort | Impact    | Priority | Status  |
| ---------------------- | ------ | --------- | -------- | ------- |
| 1. Foundation Refactor | Medium | Critical  | 🔴 P0    | ✅ DONE |
| 2. Preset Templates    | Medium | High      | 🟠 P1    | ✅ DONE |
| 3. Custom Builder      | High   | High      | 🟠 P1    | ⚠️ 90%  |
| 4. Visual Analytics    | High   | Very High | 🟠 P1    | ✅ DONE |
| 5. Correlations        | Medium | Medium    | 🟡 P2    | ❌      |
| 6. Smart Reminders     | Medium | Medium    | 🟡 P2    | ❌      |
| 7. Export & Sharing    | Low    | High      | 🟢 P3    | ❌      |
| 8. Publish to Blog     | High   | Medium    | 🟢 P3    | ❌      |

---

## Status

- **Current Version**: v3.0.1 (Baseline with Visual Analytics + Theme Reactivity)
- **Next Milestone**: Complete Phase 3 Custom Builder (field reordering, full field type support)
- **Recent Additions**:
  - 9 color themes with light/dark variants ✅
  - Theme-reactive chart colors (heatmap calendar, trigger bars) ✅
  - Centralized `useThemeAwareColors` hook ✅

---

## Future Considerations

### Theme System (v3.x)

- Consider extending theme reactivity to other chart types (IntensityTrendLine, LocationDistributionPie, IntensityDistributionBar)
- Add user-customizable accent color picker (beyond the 9 presets)
- Persist theme preference to user profile (currently localStorage only)
- System theme auto-detection with manual override option

### Performance (v3.x)

- The `useThemeAwareColors` hook uses a 50ms delay to ensure CSS variables are read after DOM updates; this could be optimized with `MutationObserver` or `requestAnimationFrame`
- Chart remounting via `key={resolvedTheme}` works but causes full re-render; consider more granular color updates for complex charts

### Accessibility (v3.x)

- Ensure all 9 themes meet WCAG 2.1 AA contrast requirements
- Add high-contrast theme option for users with visual impairments
- Test heatmap color scales for colorblind accessibility (consider adding patterns/textures)

---

_Last updated: January 2026_
