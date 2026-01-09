# Product Roadmap: Baseline

## Vision

Transform the Chronic Pain Diary into **Baseline** — a flexible, user-centric tracking platform that empowers users to monitor any aspect of their life—pain, mood, menstrual cycles, habits, or entirely custom metrics—with beautiful visualizations and actionable insights.

**Why "Baseline"?** Know your baseline, spot the changes. It captures the essence of tracking: understanding your normal so you can identify what's different.

---

## Current Status

- **Current Version**: v4.0.0 (Baseline with Data Export & Doctor Reports)
- **Completed Phases**: 1, 2, 3, 3b, 4, 5, 7 (see [ROADMAP_COMPLETED.md](ROADMAP_COMPLETED.md))
- **Next Up**: Phase 6 (Smart Reminders) or Phase 8 (Publish to Blog)

---

## Phase 6: Smart Reminders & Predictions (v3.2) ❌ NOT STARTED

### Goal

Proactive notifications and predictions based on historical patterns.

_(No changes - not yet implemented)_

---

## Phase 7: Data Export & Doctor Reports (v4.0) ✅ COMPLETE

### Goal

Enable users to export their data for personal use or to share with healthcare providers.

_(See [ROADMAP_COMPLETED.md](ROADMAP_COMPLETED.md) for implementation details)_

---

## Phase 8: Publish to Blog (v5.0) ❌ NOT STARTED

### Goal

Enable users to publish their tracking diary as a beautiful public blog, powered by Astro and deployed on Vercel—with zero technical skills required.

_(No changes - not yet implemented)_

---

## Technical Debt to Address

- **Offline support** - Service worker for offline entry creation ❌
- **Accessibility** - WCAG 2.1 AA compliance audit ❌
- **Performance** - Virtualized lists for large entry counts ❌

---

## Priority Matrix

| Phase               | Effort | Impact | Priority | Status      |
| ------------------- | ------ | ------ | -------- | ----------- |
| 6. Smart Reminders  | Medium | Medium | 🟡 P2    | Not Started |
| 7. Export & Sharing | Low    | High   | 🟠 P1    | ✅ Complete |
| 8. Publish to Blog  | High   | Medium | 🟢 P3    | Not Started |

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

_Last updated: January 9, 2026_
