# Spark Migration Audit Report

**Generated:** 21 December 2025  
**Project:** Baseline  
**Status:** Ready for migration

---

## 1. Spark Dependencies

### NPM Package

| Package         | Version       | File           |
| --------------- | ------------- | -------------- |
| `@github/spark` | `>=0.43.1 <1` | `package.json` |

### Import Locations

| File             | Line | Import/Usage                                                                    |
| ---------------- | ---- | ------------------------------------------------------------------------------- |
| `src/main.tsx`   | 3    | `import "@github/spark/spark"` (runtime side-effects)                           |
| `vite.config.ts` | 5    | `import sparkPlugin from "@github/spark/spark-vite-plugin"`                     |
| `vite.config.ts` | 6    | `import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin"` |

### Vite Plugin Usage

In `vite.config.ts`:

```typescript
plugins: [
  react(),
  tailwindcss(),
  createIconImportProxy() as PluginOption,  // Spark plugin - icon proxy
  sparkPlugin() as PluginOption,             // Spark plugin - main
],
```

---

## 2. Spark Configuration Files

| File                  | Purpose              | Content                                    |
| --------------------- | -------------------- | ------------------------------------------ |
| `spark.meta.json`     | Spark metadata       | `{ "templateVersion": 1, "dbType": "kv" }` |
| `runtime.config.json` | Spark runtime config | `{ "app": "c7e89c5e7985ed2047b3" }`        |

---

## 3. Dependency Graph Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        Build Time                            │
├─────────────────────────────────────────────────────────────┤
│  vite.config.ts                                              │
│      ├── sparkPlugin (Spark Vite plugin)                     │
│      └── createIconImportProxy (Phosphor icon proxy)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Runtime                               │
├─────────────────────────────────────────────────────────────┤
│  src/main.tsx                                                │
│      └── import "@github/spark/spark" (side-effects only)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Code                         │
├─────────────────────────────────────────────────────────────┤
│  src/App.tsx ──► src/lib/supabase.ts (NO Spark dependency)   │
│  src/components/* (NO Spark dependency)                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight:** Application code (App.tsx, components, lib) does NOT directly depend on Spark APIs.

---

## 4. Data Storage Usage Summary

### Current State: ✅ Already Migrated to Supabase

| Pattern    | Status      | Location              |
| ---------- | ----------- | --------------------- |
| `spark.kv` | ❌ Not used | —                     |
| Supabase   | ✅ Active   | `src/lib/supabase.ts` |

**Data flows:**

- `src/App.tsx` → `supabase.from("tracker_entries").select()` for loading
- `src/App.tsx` → `supabase.from("tracker_entries").insert()` for saving
- `src/App.tsx` → `supabase.from("tracker_entries").delete()` for removing

**No active `spark.kv` usage found in source code.**

---

## 5. Auth Usage Summary

### Current State: No Authentication

| Pattern       | Status            | Notes                |
| ------------- | ----------------- | -------------------- |
| `spark.user`  | ❌ Not used       | No calls found       |
| GitHub OAuth  | ❌ Not used       | No auth flow exists  |
| Supabase Auth | ❌ Not configured | Could be added later |

**The app operates without user authentication.** All data is accessible without login.

---

## 6. LLM Usage Summary

### Current State: No AI/LLM Features

| Pattern          | Status      |
| ---------------- | ----------- |
| `spark.llm`      | ❌ Not used |
| `spark.ai`       | ❌ Not used |
| Any AI inference | ❌ Not used |

---

## 7. Other Spark References

| File                    | Line | Reference                    | Action Required           |
| ----------------------- | ---- | ---------------------------- | ------------------------- |
| `src/ErrorFallback.tsx` | ~15  | Text mentions "spark author" | Update error message text |

---

## 8. Detox Plan Checklist

### Phase 1: Remove Build-Time Dependencies

1. [ ] Remove Spark Vite plugins from `vite.config.ts`
   - Remove `sparkPlugin` import and usage
   - Remove `createIconImportProxy` import and usage
2. [ ] Verify Phosphor icons work with direct imports (no proxy needed)

### Phase 2: Remove Runtime Dependencies

3. [ ] Remove `import "@github/spark/spark"` from `src/main.tsx`
4. [ ] Update error message in `src/ErrorFallback.tsx`

### Phase 3: Remove Package & Config Files

5. [ ] Remove `@github/spark` from `package.json`
6. [ ] Delete `spark.meta.json`
7. [ ] Delete `runtime.config.json`
8. [ ] Run `npm install` to update lockfile

### Phase 4: Verification

9. [ ] Run `npm run build` — confirm no errors
10. [ ] Run `npm run dev` — confirm app works locally
11. [ ] Test all CRUD operations (create, read, delete pain entries)
12. [ ] Verify icons render correctly

---

## 9. Migration Complexity Assessment

| Category        | Complexity | Notes                               |
| --------------- | ---------- | ----------------------------------- |
| **Overall**     | 🟢 LOW     | Minimal Spark integration remaining |
| Build tooling   | 🟢 LOW     | Just remove 2 Vite plugins          |
| Runtime imports | 🟢 LOW     | Single import to remove             |
| Data storage    | 🟢 DONE    | Already on Supabase                 |
| Authentication  | 🟢 N/A     | Not implemented                     |
| LLM/AI          | 🟢 N/A     | Not used                            |

**Estimated effort:** 30 minutes to 1 hour

---

## 10. Files Summary

### Must Modify

| File                    | Changes                               |
| ----------------------- | ------------------------------------- |
| `package.json`          | Remove `@github/spark` dependency     |
| `vite.config.ts`        | Remove Spark plugin imports and usage |
| `src/main.tsx`          | Remove Spark runtime import           |
| `src/ErrorFallback.tsx` | Update error message text             |

### Can Delete

| File                  | Reason                  |
| --------------------- | ----------------------- |
| `spark.meta.json`     | Spark-specific metadata |
| `runtime.config.json` | Spark runtime config    |

### No Changes Needed

| File                  | Reason                   |
| --------------------- | ------------------------ |
| `src/App.tsx`         | Already uses Supabase    |
| `src/lib/supabase.ts` | Standard Supabase client |
| `src/components/*`    | No Spark dependencies    |
