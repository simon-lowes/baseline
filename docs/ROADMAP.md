# Product Roadmap: From Chronic Pain Diary to Baseline

## Vision

Transform the Chronic Pain Diary into **Baseline** — a flexible, user-centric tracking platform that empowers users to monitor any aspect of their life—pain, mood, menstrual cycles, habits, or entirely custom metrics—with beautiful visualizations and actionable insights.

**Why "Baseline"?** Know your baseline, spot the changes. It captures the essence of tracking: understanding your normal so you can identify what's different.

---

## Phase 1: Foundation Refactor (Current → v2.0)

### Goal

Rename and restructure the app to support multiple tracking types while maintaining backward compatibility for existing pain diary users.

### Prompt for AI Assistant

```
I have a React + TypeScript + Supabase app called "Chronic Pain Diary" that I want to evolve into a universal tracking platform called "Baseline".

Current state:
- Users can log pain entries with: intensity (1-10), location, timestamp, notes, hashtags
- Supabase backend with RLS policies
- Email auth with confirmation

Phase 1 requirements:
1. Rename the app to "Baseline" throughout the codebase
2. Refactor the data model to support multiple "tracker types" per user
3. Create a new `trackers` table where each user can have multiple trackers
4. Each tracker has: id, user_id, name, type (preset or custom), icon, color, created_at
5. Migrate existing tracker_entries to belong to a default "Chronic Pain" tracker
6. Update the UI to show a tracker selector/switcher
7. Keep all existing pain diary functionality working
8. Integrate **shadcn/ui** for the design system
   - Install and configure Tailwind CSS + shadcn/ui
   - Replace core UI elements with shadcn components (Button, Input, Card, Dialog)
   - Ensure consistent theming and accessibility

Database schema changes needed:
- New `trackers` table
- Add `tracker_id` foreign key to entries table
- Migration script for existing users

Please provide:
1. The database migration SQL
2. Updated TypeScript types
3. Changes to the Supabase adapter
4. Setup steps for shadcn/ui and the updated UI component for tracker switching using shadcn components
```

---

## Phase 2: Preset Tracker Templates (v2.1)

### Goal

Offer curated preset trackers for common use cases with pre-configured fields, categories, and suggested keywords.

### Prompt for AI Assistant

````
Building on the universal tracker foundation, I need to implement preset tracker templates.

Current state:
- App supports multiple trackers per user
- Each tracker has entries with customizable fields

Phase 2 requirements:

1. Create a `tracker_templates` system with these presets:

   a) CHRONIC PAIN (existing)
      - Fields: intensity (1-10 scale), location (body map), duration
      - Categories: Migraine, Back Pain, Joint Pain, Nerve Pain, Muscle Pain
      - Suggested hashtags: #flareup, #manageable, #medication, #physio, #rest, #trigger

   b) MENSTRUAL CYCLE
      - Fields: flow (light/medium/heavy), symptoms checklist, mood
      - Categories: Period, Ovulation, PMS, Fertile Window
      - Suggested hashtags: #cramps, #bloating, #headache, #fatigue, #cravings, #emotional
      - Special: Cycle day calculator, period prediction

   c) MOOD & MENTAL HEALTH
      - Fields: mood (1-10 or emoji scale), energy level, anxiety level, sleep quality
      - Categories: Anxiety, Depression, Stress, Calm, Happy, Neutral
      - Suggested hashtags: #therapy, #meditation, #exercise, #socializing, #isolation, #trigger

   d) SLEEP
      - Fields: bedtime, wake time, quality (1-10), interruptions
      - Categories: Insomnia, Restful, Disturbed, Oversleep
      - Suggested hashtags: #nightmare, #restless, #refreshed, #nap, #caffeine, #screen

   e) MEDICATION & SUPPLEMENTS
      - Fields: name, dosage, time taken, with food (y/n)
      - Categories: Prescription, OTC, Supplement, Vitamin
      - Suggested hashtags: #sideeffect, #missed, #refill, #effective

   f) EXERCISE & MOVEMENT
      - Fields: activity type, duration, intensity, calories (optional)
      - Categories: Cardio, Strength, Flexibility, Walking, Sports
      - Suggested hashtags: #gym, #outdoor, #home, #personal_best, #recovery

2. Create an onboarding flow:
   - Welcome screen explaining the app
   - "What would you like to track?" with preset cards
   - Allow selecting multiple presets
   - Option to "Create Custom Tracker" (Phase 3)
   - Each preset shows preview of what it tracks

3. Template data structure:
   ```typescript
   interface TrackerTemplate {
     id: string
     name: string
     description: string
     icon: string
     color: string
     fields: FieldDefinition[]
     categories: string[]
     suggestedHashtags: string[]
     features?: string[] // special features like "cycle prediction"
   }
````

Please provide:

1. The template definitions as TypeScript constants
2. Onboarding UI components (multi-step wizard)
3. Logic to instantiate a tracker from a template
4. Category and hashtag suggestion components

```

---

## Phase 3: Custom Tracker Builder (v2.2)

### Goal
Empower users to create completely custom trackers with their own fields, categories, and keywords.

### Prompt for AI Assistant

```

I need to implement a custom tracker builder that lets users create bespoke tracking profiles.

Current state:

- App has preset tracker templates
- Each tracker has fields, categories, and hashtags

Phase 3 requirements:

1. Custom Tracker Creation Wizard:

   Step 1: Basic Info
   - Tracker name (e.g., "My Allergies", "Water Intake", "Gratitude")
   - Icon picker (from a curated set)
   - Color picker

   Step 2: Field Builder
   - Add custom fields with types:
     - Number scale (1-10, 1-5, custom range)
     - Single select (dropdown)
     - Multi-select (checkboxes)
     - Text (short/long)
     - Time
     - Duration
     - Yes/No toggle
     - Emoji picker
   - Drag to reorder fields
   - Mark fields as required/optional

   Step 3: Categories
   - Option A: "Generate suggestions based on tracker name" (AI-powered)
   - Option B: "I'll create my own"
   - Option C: Both (start with AI suggestions, customize)
   - Add/remove/reorder categories

   Step 4: Keywords/Hashtags
   - Same options as categories (AI-generated, custom, or both)
   - Show as tag pills that can be toggled on/off
   - "Add custom keyword" input

   Step 5: Preview & Create
   - Show how an entry will look
   - Create tracker button

2. AI Keyword Generation:
   - When user enters tracker name like "Allergies"
   - Call an edge function or use client-side logic to suggest:
     - Categories: Pollen, Food, Pet, Dust, Seasonal, Contact
     - Hashtags: #reaction, #antihistamine, #avoidance, #mild, #severe, #hives

3. Data model for custom fields:

   ```typescript
   interface CustomField {
     id: string;
     name: string;
     type: FieldType;
     required: boolean;
     order: number;
     config: {
       min?: number;
       max?: number;
       options?: string[];
       placeholder?: string;
     };
   }
   ```

4. Dynamic form renderer that builds the entry form from field definitions

Please provide:

1. The custom tracker wizard UI components
2. Field type definitions and configurations
3. Dynamic form renderer component
4. Database schema for storing custom field definitions
5. Keyword/category generation logic (can be rule-based initially, AI later)

```

---

## Phase 4: Visual Analytics Dashboard (v3.0)

### Goal
Provide beautiful, insightful visualizations of tracked data with multiple chart types and trend analysis.

### Prompt for AI Assistant

```

I need to implement a visual analytics dashboard for the tracking app.

Current state:

- Users have multiple trackers with entries over time
- Each entry has numeric fields, categories, hashtags, timestamps

Phase 4 requirements:

1. Dashboard Overview:
   - Summary cards for each active tracker
   - "Last 7 days at a glance" quick stats
   - Recent entries feed

2. Chart Types (using Recharts or similar):

   a) LINE CHARTS
   - Trend over time for any numeric field
   - Multiple series overlay (e.g., pain vs. mood)
   - Smoothing options (daily average, 7-day rolling)

   b) BAR CHARTS
   - Entries per day/week/month
   - Comparison between categories
   - Stacked bars for multiple fields

   c) PIE/DONUT CHARTS
   - Distribution by category
   - Hashtag frequency
   - Time of day distribution

   d) HEATMAP CALENDAR
   - GitHub-style contribution graph
   - Color intensity based on numeric field
   - Click to drill down to that day

   e) SCATTER PLOTS
   - Correlation between two fields
   - E.g., sleep quality vs. pain level

   f) RADAR/SPIDER CHARTS
   - Multi-dimensional view of a single entry
   - Compare averages across time periods

3. Time Range Controls:
   - Presets: Today, 7 days, 30 days, 90 days, Year, All time
   - Custom date range picker
   - Compare periods (this month vs. last month)

4. Insights Engine:
   - Auto-detect patterns: "Your pain tends to be higher on Mondays"
   - Correlation alerts: "High stress entries often precede migraines"
   - Streaks: "You've logged every day for 14 days!"
   - Anomaly detection: "Yesterday's entry was unusually high"

5. Export Options:
   - Download chart as PNG
   - Export data as CSV
   - Generate PDF report

Please provide:

1. Dashboard layout component
2. Reusable chart components for each type
3. Data aggregation utilities (daily/weekly/monthly)
4. Time range selector component
5. Basic insights detection logic

```

---

## Phase 5: Correlations & Cross-Tracker Insights (v3.1)

### Goal
Help users discover connections between different trackers (e.g., sleep affecting pain, exercise affecting mood).

### Prompt for AI Assistant

```

I need to implement cross-tracker correlation analysis.

Current state:

- Users have multiple trackers with overlapping time periods
- Visual analytics dashboard with various chart types

Phase 5 requirements:

1. Correlation Dashboard:
   - Select two trackers to compare
   - Overlay their trends on the same timeline
   - Calculate Pearson correlation coefficient
   - Show "Possible connection" or "No clear connection"

2. Automatic Correlation Discovery:
   - Background analysis of all tracker pairs
   - Surface interesting correlations to the user
   - Example insights:
     - "When your sleep quality is below 5, pain intensity is 40% higher the next day"
     - "Exercise entries are followed by better mood scores within 24 hours"
     - "Your menstrual cycle day 21-28 correlates with increased anxiety"

3. Lag Analysis:
   - Check correlations with time offsets
   - "Does today's X affect tomorrow's Y?"
   - Adjustable lag period (same day, +1 day, +2 days, etc.)

4. Trigger Identification:
   - Based on hashtags and categories
   - "Entries tagged #caffeine are often followed by #insomnia"
   - "Pain flare-ups frequently mention #weather or #stress"

5. UI Components:
   - Correlation matrix heatmap
   - Dual-axis comparison charts
   - Insight cards with explanations
   - "Dig deeper" drill-down options

Please provide:

1. Correlation calculation utilities
2. Cross-tracker comparison components
3. Insight generation logic
4. UI for displaying discovered correlations
5. Settings for users to enable/disable correlation tracking

```

---

## Phase 6: Smart Reminders & Predictions (v3.2)

### Goal
Proactive notifications and predictions based on historical patterns.

### Prompt for AI Assistant

```

I need to implement smart reminders and predictions.

Current state:

- Rich historical data across multiple trackers
- Correlation analysis between trackers

Phase 6 requirements:

1. Reminder System:
   - Daily logging reminders (customizable time)
   - Medication reminders with dosage
   - Cycle predictions (period start date)
   - Custom recurring reminders

2. Predictive Alerts:
   - "Based on your patterns, you may experience a pain flare-up tomorrow"
   - "Your cycle suggests PMS symptoms may start in 2 days"
   - "Sleep quality has been declining - consider adjusting your routine"

3. Streak & Motivation:
   - Logging streaks with badges
   - Weekly summary notifications
   - Gentle nudges after missed days

4. Implementation:
   - Service worker for push notifications
   - Supabase scheduled functions for predictions
   - User notification preferences

Please provide:

1. Notification permission flow
2. Reminder scheduling system
3. Prediction algorithm based on historical patterns
4. Push notification implementation
5. User preferences UI for notifications

```

---

## Phase 7: Data Export, Sharing & Doctor Reports (v4.0)

### Goal
Enable users to share their data with healthcare providers or export for personal use.

### Prompt for AI Assistant

```

I need to implement comprehensive data export and sharing features.

Current state:

- Full tracking history with visualizations
- Insights and correlations

Phase 7 requirements:

1. Export Formats:
   - CSV (raw data)
   - PDF report (formatted with charts)
   - JSON (for backup/migration)

2. Doctor Report Generator:
   - Select tracker(s) and date range
   - Professional PDF layout
   - Summary statistics
   - Key charts and trends
   - Symptom frequency analysis
   - Medication adherence (if tracked)
   - Notes section for context

3. Sharing Options:
   - Generate shareable read-only link (time-limited)
   - Email report directly
   - Print-friendly view

4. Data Portability:
   - Full account export (GDPR compliance)
   - Import from common formats
   - Backup to cloud storage (Google Drive, iCloud)

Please provide:

1. PDF generation using a library like jsPDF or react-pdf
2. Report template components
3. Shareable link generation with Supabase
4. Export utilities for all formats
5. Import wizard for data migration

```

---

## Phase 8: Publish to Blog (v5.0)

### Goal

Enable users to publish their tracking diary as a beautiful public blog, powered by Astro and deployed on Netlify—with zero technical skills required.

### Vision

Transform private tracking data into a shareable narrative. Users might want to:
- Share their chronic illness journey to help others
- Document a health transformation publicly
- Create awareness about conditions they live with
- Build community around shared experiences

### Prompt for AI Assistant

```

I need to implement a "Publish to Blog" feature that lets users turn their tracking diary into a public Astro-based blog, deployed on Netlify.

Current state:

- Users have rich tracking history with entries, categories, hashtags
- Export functionality exists (CSV, PDF, JSON)
- Users may or may not have technical skills

Phase 8 requirements:

1. BLOG PUBLISHING FLOW (No-Code for End Users):

   Step 1: Publish Settings
   - Choose which tracker(s) to publish
   - Select date range (or "everything")
   - Privacy controls:
     - Redact specific entries
     - Hide certain hashtags/categories
     - Anonymize dates (show "Day 1, Day 2" instead of real dates)
   - Blog metadata: title, description, author name (or anonymous)

   Step 2: Template Selection
   - Pre-built Astro blog themes:
     - "Minimal" - clean, text-focused
     - "Visual" - emphasizes charts and trends
     - "Timeline" - chronological story format
     - "Magazine" - feature articles with highlights
   - Preview with sample data

   Step 3: GitHub Repository Setup (No-Code Approach)
   - Option A: "One-Click Setup" (recommended for non-technical users)
     - User authorizes GitHub OAuth
     - App automatically creates a new repo from Astro template
     - App pushes initial content
     - App configures Netlify deployment via Netlify API
     - User gets a live URL (e.g., my-health-journey.netlify.app)
   - Option B: "Connect Existing Repo" (for technical users)
     - User provides repo URL
     - App pushes content to specified branch

   Step 4: Publish Confirmation
   - Show preview URL
   - Explain what was published
   - Link to manage/update

2. SMART INCREMENTAL PUBLISHING:

   The system must track what's already published and only add new content:

   ```typescript
   interface PublishState {
     userId: string;
     repoUrl: string;
     lastPublishedAt: Date;
     publishedEntryIds: string[]; // Track which entries are already live
     publishedDateRange: {
       start: Date;
       end: Date;
     };
   }
   ```

   When user publishes again:
   - Fetch entries newer than lastPublishedAt
   - Compare entry IDs to avoid duplicates
   - Generate only new markdown files
   - Commit with message: "Add entries from [date] to [date]"
   - Update PublishState in database

   Handle edge cases:
   - User edits an already-published entry → detect and update
   - User deletes an entry → optionally remove from blog or mark as "[removed]"
   - User changes privacy settings → regenerate affected entries

3. ASTRO BLOG TEMPLATE STRUCTURE:

   ```
   blog-template/
   ├── src/
   │   ├── content/
   │   │   └── entries/           # Generated markdown files
   │   │       ├── 2025-01-15.md
   │   │       ├── 2025-01-16.md
   │   │       └── ...
   │   ├── pages/
   │   │   ├── index.astro        # Homepage with recent entries
   │   │   ├── archive.astro      # All entries by date
   │   │   ├── insights.astro     # Charts and statistics
   │   │   └── about.astro        # User's story/bio
   │   └── components/
   │       ├── EntryCard.astro
   │       ├── PainScale.astro    # Visual pain indicator
   │       ├── TrendChart.astro   # Embedded chart
   │       └── TagCloud.astro     # Hashtag visualization
   ├── public/
   │   └── charts/                # Pre-rendered chart images
   ├── astro.config.mjs
   └── netlify.toml
   ```

4. ENTRY-TO-MARKDOWN CONVERSION:

   Transform tracking entries into readable blog posts:

   Input (database entry):

   ```json
   {
     "timestamp": "2025-01-15T14:30:00Z",
     "intensity": 7,
     "location": "Lower Back",
     "notes": "Flare-up after sitting too long at desk. Took ibuprofen.",
     "hashtags": ["#flareup", "#medication", "#work"]
   }
   ```

   Output (markdown):

   ```markdown
   ---
   title: 'January 15, 2025'
   date: 2025-01-15
   intensity: 7
   location: 'Lower Back'
   tags: ['flareup', 'medication', 'work']
   ---

   ## Pain Level: 7/10 | Lower Back

   Flare-up after sitting too long at desk. Took ibuprofen.

   _Tagged: #flareup #medication #work_
   ```

5. NO-CODE DEPLOYMENT FOR NON-TECHNICAL USERS:

   The challenge: How does someone with zero GitHub/Netlify experience publish?

   Solution approach:

   a) FULLY MANAGED (Recommended)
   - User never sees GitHub or Netlify
   - App uses service account to create repos in an org (e.g., "baseline-blogs")
   - Repos named: baseline-blogs/user-[hash]
   - Netlify site auto-created via API
   - User only sees their public URL
   - "Update Blog" button in app handles everything

   b) GUIDED SETUP (For users who want their own accounts)
   - Step-by-step wizard with screenshots
   - "Click this button, then come back and paste the token"
   - OAuth flows where possible
   - Fallback to clear manual instructions

   c) EXPORT ONLY (Fallback)
   - Download a ZIP file with full Astro project
   - Include README with deployment instructions
   - User can deploy manually or get help

6. BLOG MANAGEMENT DASHBOARD:

   In the Baseline app, users can:
   - See their published blog URL
   - View publish history (when, how many entries)
   - "Sync Now" button for manual updates
   - Auto-publish toggle (publish new entries weekly/monthly)
   - Unpublish / delete blog entirely
   - Edit blog settings (title, theme, privacy)

7. DATABASE SCHEMA:

   ```sql
   CREATE TABLE blog_publications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     repo_url TEXT NOT NULL,
     netlify_site_id TEXT,
     public_url TEXT,
     blog_title TEXT,
     blog_theme TEXT DEFAULT 'minimal',
     privacy_settings JSONB DEFAULT '{}',
     last_published_at TIMESTAMPTZ,
     published_entry_ids UUID[] DEFAULT '{}',
     auto_publish_frequency TEXT, -- 'weekly', 'monthly', null
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

8. IMPLEMENTATION TECHNOLOGIES:
   - GitHub API (Octokit) for repo creation and commits
   - Netlify API for site deployment
   - Supabase Edge Functions for background publishing
   - Astro Content Collections for blog structure

Please provide:

1. Blog publishing wizard UI components
2. GitHub integration service (repo creation, commits)
3. Netlify deployment automation
4. Entry-to-markdown conversion utilities
5. Incremental publish diffing logic
6. Astro blog template repository structure
7. Database migrations for publish state
8. No-code user flow documentation

```

### Speculation: No-Code Publishing for Non-Technical Users

The biggest challenge is enabling users with zero technical skills to publish. Here are potential approaches:

| Approach | Pros | Cons |
|----------|------|------|
| **Fully Managed** (app owns repos) | Zero friction, just click "Publish" | You host/manage all blogs, potential costs |
| **Subdomain Hosting** (baseline.app/username) | Simplest UX, no external accounts | You become a hosting provider |
| **GitHub OAuth + Netlify API** | User owns their content, free hosting | Still requires account creation |
| **Export ZIP + Instructions** | No integration complexity | High friction, many will fail |
| **Partner with Netlify/Vercel** | Possible "deploy" button integration | Dependency on third party |

**Recommended Hybrid Approach:**
1. Default: Fully managed under your org (free tier limits apply)
2. Power users: Connect their own GitHub/Netlify
3. Future: Partner integration for seamless "Deploy to Netlify" button

---

## Technical Debt to Address

Before major feature work, consider:

1. **Code splitting** - Bundle size is >500KB, implement lazy loading
2. **Testing** - Add unit tests for critical paths (auth, data)
3. **Error boundaries** - Graceful error handling throughout
4. **Offline support** - Service worker for offline entry creation
5. **Accessibility** - WCAG 2.1 AA compliance audit
6. **Performance** - Virtualized lists for large entry counts

---

## Priority Matrix

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| 1. Foundation Refactor | Medium | Critical | 🔴 P0 |
| 2. Preset Templates | Medium | High | 🟠 P1 |
| 3. Custom Builder | High | High | 🟠 P1 |
| 4. Visual Analytics | High | Very High | 🟠 P1 |
| 5. Correlations | Medium | Medium | 🟡 P2 |
| 6. Smart Reminders | Medium | Medium | 🟡 P2 |
| 7. Export & Sharing | Low | High | 🟢 P3 |
| 8. Publish to Blog | High | Medium | 🟢 P3 |

---

## Status

- **Current Version**: v1.0 (Chronic Pain Diary)
- **Next Milestone**: Friend testing, then Phase 1
- **Target Name**: Baseline

---

*Last updated: December 2025*
```
