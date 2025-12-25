# Baseline

> Know your baseline, spot the changes.

A flexible, user-centric tracking platform that empowers users to monitor any aspect of their life—pain, mood, menstrual cycles, habits, or entirely custom metrics—with beautiful visualizations and actionable insights.

## Features

- **Multiple Trackers** - Track chronic pain, mood, sleep, medications, or create your own custom trackers
- **Preset Templates** - Quick setup with curated presets for common use cases
- **Secure & Private** - Your data is stored securely with Supabase and protected by Row Level Security
- **shadcn/ui Design** - Beautiful, accessible UI components

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI**: shadcn/ui (Tailwind CSS + Radix UI)
- **Backend**: Supabase (Auth, PostgreSQL, RLS)
- **Architecture**: Ports & Adapters pattern for clean separation

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Database Migrations

Apply the trackers migration to your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or manually via SQL Editor with:
# supabase/migrations/20251225_001_create_trackers.sql
```

## License

MIT

---

_Evolved from Chronic Pain Diary. Started 22/12/25._
