# Product Roadmap: Baseline

## Vision

Transform the Chronic Pain Diary into **Baseline** — a flexible, user-centric tracking platform that empowers users to monitor any aspect of their life—pain, mood, menstrual cycles, habits, or entirely custom metrics—with beautiful visualizations and actionable insights.

**Why "Baseline"?** Know your baseline, spot the changes. It captures the essence of tracking: understanding your normal so you can identify what's different.

---

## Current Status

- **Current Version**: v4.1.0 (Account Settings & GDPR Compliance)
- **Completed Phases**: 1, 2, 3, 3b, 4, 5, 7, Account Settings (see [ROADMAP_COMPLETED.md](ROADMAP_COMPLETED.md))
- **Next Up**: Phase 6 (Smart Reminders) or Phase 8 (Publish to Blog)

---

## Phase 6: Smart Reminders & Predictions (v3.2) ❌ NOT STARTED

### Goal

Proactive notifications and predictions based on historical patterns.

_(No changes - not yet implemented)_

---

## Phase 8: Publish to Blog (v5.0) ❌ NOT STARTED

### Goal

Enable users to publish their tracking diary as a beautiful public blog, powered by Astro and deployed on Vercel—with zero technical skills required.

_(No changes - not yet implemented)_

---

## Technical Debt

All previously identified technical debt (offline support, accessibility, performance) has been addressed. See [ROADMAP_COMPLETED.md](ROADMAP_COMPLETED.md) for details.

---

## Priority Matrix

| Phase              | Effort | Impact | Priority | Status      |
| ------------------ | ------ | ------ | -------- | ----------- |
| 6. Smart Reminders | Medium | Medium | 🟡 P2    | Not Started |
| 8. Publish to Blog | High   | Medium | 🟢 P3    | Not Started |

---

## Future Considerations

### Theme System (v3.x) ✅ MOVED TO COMPLETED

See [ROADMAP_COMPLETED.md](ROADMAP_COMPLETED.md) for implemented theme system enhancements.

### Performance (v3.x)

- The `useThemeAwareColors` hook uses a 50ms delay to ensure CSS variables are read after DOM updates; this could be optimized with `MutationObserver` or `requestAnimationFrame`
- Chart remounting via `key={resolvedTheme}` works but causes full re-render; consider more granular color updates for complex charts

### Accessibility (v3.x) ✅ MOVED TO COMPLETED

See [ROADMAP_COMPLETED.md](ROADMAP_COMPLETED.md) for implemented accessibility features.

---

_Last updated: January 15, 2026_
