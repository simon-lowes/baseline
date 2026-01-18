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

## Key Commands
```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run test         # Run unit tests
npm run test:e2e     # Run Playwright tests
npm run lint         # ESLint check
```

## Architecture
- **Ports & Adapters pattern** - Clean separation of concerns
- Components in `src/components/ui/` (shadcn)
- Pages/features in `src/components/`
- Supabase client in `src/lib/supabase.ts`
- Types in `src/types/`

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
2. Create preset in `src/data/presets.ts`
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

## When Making Changes
1. Check existing patterns in codebase first
2. Maintain TypeScript strict mode compliance
3. Ensure RLS policies are respected
4. Keep the calming, accessible UX
5. **Update CHANGELOG.md** before every commit (add to Unreleased section)
6. Run `npm run lint` and `npm run test` before committing
