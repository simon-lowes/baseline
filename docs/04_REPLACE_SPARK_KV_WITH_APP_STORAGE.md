# 04 Translate `spark.kv` to Backend-Agnostic Storage (Copilot Prompt)

Paste this into Copilot Chat.

---

We need to replace any Spark KV usage with our own `KvPort` and optionally a relational DB.

## Task
1. Find all occurrences of:
   - `spark.kv.get(...)`
   - `spark.kv.set(...)`
   - `spark.kv.delete(...)`
   - `spark.kv.keys(...)` / list equivalents
2. Replace them with:
   - `import { kv } from "@/runtime/appRuntime"`
   - `await kv.get(key)`, `await kv.set(key, value)`, `await kv.delete(key)`, `await kv.list(prefix?)`
3. If the KV is being used to store:
   - collections of entities (arrays of records),
   - relational data,
   - or anything requiring queries,
   then refactor those call sites to use `db` instead of `kv`.
   - `kv` should only store small settings, caching, drafts, UI preferences, etc.

## “KV → DB” mapping rules
- If keys are patterned like `todos:<id>` or `user:<id>:settings`, map to tables:
  - `todos` table with `id`, `user_id`, fields
  - `user_settings` table with `user_id`, fields
- If values are JSON arrays, convert to normalized tables.

## Deliverables
- No remaining `spark.kv` usage.
- `kv` is only used for lightweight data.
- Create/update `MIGRATION_NOTES.md` describing what moved to DB vs KV.

Proceed and keep changes small with commits.
