# Spark Migration TODO

**Project:** Baseline  
**Created:** 21 December 2025

---

## Priority 1: Build Configuration

- [ ] **Remove Spark Vite plugins from `vite.config.ts`**
  - Remove `import sparkPlugin from "@github/spark/spark-vite-plugin"`
  - Remove `import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin"`
  - Remove `createIconImportProxy() as PluginOption` from plugins array
  - Remove `sparkPlugin() as PluginOption` from plugins array

- [ ] **Verify Phosphor icons work without proxy**
  - Check that `@phosphor-icons/react` imports resolve correctly
  - Test icon rendering in the app

---

## Priority 2: Runtime Code

- [ ] **Remove Spark runtime import from `src/main.tsx`**
  - Remove `import "@github/spark/spark"` (line 3)

- [ ] **Update error message in `src/ErrorFallback.tsx`**
  - Find and update any text referencing "spark author"
  - Replace with generic/appropriate error messaging

---

## Priority 3: Package & Config Cleanup

- [ ] **Remove `@github/spark` from `package.json`**
  - Remove from dependencies section

- [ ] **Delete Spark configuration files**
  - Delete `spark.meta.json`
  - Delete `runtime.config.json`

- [ ] **Update lockfile**
  - Run `npm install` after removing dependency

---

## Priority 4: Verification

- [ ] **Build verification**
  - Run `npm run build`
  - Confirm zero errors
  - Check bundle size (should decrease)

- [ ] **Development verification**
  - Run `npm run dev`
  - Confirm app starts without errors
  - Check browser console for warnings

- [ ] **Functional testing**
  - [ ] Load existing pain entries
  - [ ] Create new pain entry
  - [ ] Delete pain entry
  - [ ] Verify all icons display correctly

---

## Priority 5: Documentation (Optional)

- [ ] **Update README.md**
  - Remove any Spark references
  - Update setup instructions if needed

- [ ] **Clean up docs/ folder**
  - Review migration docs for accuracy
  - Archive or update completed migration guides

---

## Completed Items

_Move items here as they are completed_

---

## Notes

- **Data storage:** Already migrated to Supabase ✅
- **Authentication:** Not implemented (out of scope for this migration)
- **LLM/AI features:** Not used (no action needed)
- **Estimated time:** 30 minutes to 1 hour
