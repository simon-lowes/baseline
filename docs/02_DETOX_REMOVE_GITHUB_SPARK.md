# 02 Remove `@github/spark` and Spark Runtime Coupling (Copilot Prompt)

Paste this into Copilot Chat.

---

You are performing “Spark Detox” to remove Spark lock-in.

## Goal
Remove **all** reliance on the proprietary Spark SDK/runtime:
- Delete `@github/spark` usage and replace with our own abstractions.
- Replace `spark.*` APIs with local equivalents (ports/adapters).
- Ensure the app can run on standard tooling (Vite or Next.js or CRA—whatever it currently uses).

## Step-by-step tasks
### A) Create backend-agnostic interfaces (“ports”)
1. Create `src/ports/` with TypeScript interfaces:
   - `AuthPort` (signIn, signOut, signUp, getSession, onAuthStateChange)
   - `DbPort` (query/insert/update/delete abstractions)
   - `KvPort` (get/set/delete/list) **for simple KV replacements**
   - `FilesPort` (upload/download/list) optional
   - `AiPort` (generateText / classify / etc.) optional
2. Add a `src/adapters/` folder that will hold provider-specific implementations later.

### B) Replace Spark imports with an app-level runtime module
1. Create `src/runtime/appRuntime.ts` that exports:
   - `auth: AuthPort`
   - `db: DbPort`
   - `kv: KvPort`
   - `files?: FilesPort`
   - `ai?: AiPort`
2. For now, provide **temporary local implementations** (no network calls):
   - `kv` backed by `localStorage` (namespaced)
   - `auth` as a stub that always returns “signed out”
   - `db` as a stub that throws “Not configured” with helpful error messages

### C) Remove Spark package and references
1. Remove `@github/spark` from `package.json`.
2. Replace every `import ... from "@github/spark"` and every `spark.*` usage with:
   - `import { kv, auth, db } from "@/runtime/appRuntime"` (or relative imports)
3. Make the app compile and run with stubs.

### D) Environment variables
1. Add `.env.example` with placeholders for multiple providers:
   - `VITE_...` or `NEXT_PUBLIC_...` depending on framework
2. Add a small helper `src/runtime/env.ts` to safely read env vars and throw clear errors when missing.

### E) Build sanity
- Ensure `npm run dev` works.
- Ensure TypeScript builds.

## Non-goals (for this step)
- Do not integrate Supabase/Neon/etc yet.
- Do not implement real auth yet.
- Just make it run without Spark.

## Deliverables
- New `src/ports/*` and `src/runtime/*`
- All Spark imports removed
- App runs locally with stubbed runtime

Proceed carefully, commit in small steps, and show diffs as you go.
