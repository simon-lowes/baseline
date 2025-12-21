# 03 Create Backend Ports + Adapters Architecture (Copilot Prompt)

Paste this into Copilot Chat.

---

We will formalize a backend-agnostic architecture using Ports & Adapters.

## Requirements
1. Ensure there is exactly ONE place the app imports backend services: `src/runtime/appRuntime.ts`.
2. All UI/components must call `kv`, `db`, `auth`, `files`, `ai` via that module only.
3. Keep provider-specific logic inside `src/adapters/<provider>/...`.

## Implement
### A) Ports (interfaces)
Create/confirm these interfaces:

#### `src/ports/AuthPort.ts`
- `signUp(params)`
- `signIn(params)`
- `signOut()`
- `getSession()`
- `onAuthStateChange(cb)`
- `getUser()` (returns `{ id, email?, roles? } | null`)

#### `src/ports/KvPort.ts`
- `get<T>(key): Promise<T | null>`
- `set<T>(key, value): Promise<void>`
- `delete(key): Promise<void>`
- `list(prefix?): Promise<string[]>`

#### `src/ports/DbPort.ts`
We want a minimal CRUD style:
- `select(table, options)`
- `insert(table, values)`
- `update(table, where, values)`
- `delete(table, where)`
Also support “raw” SQL optionally:
- `sql<T>(query, params?)` (optional, only for SQL backends)

### B) Adapters (implementations)
Add:
- `src/adapters/local/localKv.ts` (localStorage implementation)
- `src/adapters/noop/noopAuth.ts` (signed-out stub)
- `src/adapters/noop/noopDb.ts` (throws “DB not configured”)

### C) Runtime wiring
In `src/runtime/appRuntime.ts`, wire:
- `kv = localKv`
- `auth = noopAuth`
- `db = noopDb`

### D) Testing hooks
Add a simple development-only diagnostics page:
- `src/pages/Diagnostics.tsx` (or route component)
Show:
- env status (which provider configured)
- current auth user
- basic KV set/get roundtrip

## Output
Implement everything above with clean TypeScript types and minimal dependencies.
