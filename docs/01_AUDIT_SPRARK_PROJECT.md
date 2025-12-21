# 01 Audit the Spark Project (Copilot Prompt)

Paste this into Copilot Chat **in the repo root**.

---

You are my migration assistant. I have a GitHub Spark-generated app (React + TypeScript). I want a complete audit of Spark-specific lock-in and a plan to remove it.

## Tasks
1. Scan the repo to find **all** Spark-specific dependencies and APIs:
   - `@github/spark` imports
   - `spark.*` usage (e.g., `spark.kv`, `spark.user`, `spark.llm`, `spark.*`)
   - any Spark runtime assumptions (e.g., GitHub auth, Spark-only env vars)
   - any Spark-only build tooling or scripts
2. Create an **Audit Report** in `MIGRATION_AUDIT.md` containing:
   - Detected Spark files, modules, imports, and call sites (with file paths + line numbers if possible)
   - A dependency graph summary: what components depend on Spark APIs
   - Data storage usage summary: which data flows go through `spark.kv`
   - Auth usage summary: any assumptions about “GitHub user required”
   - LLM usage summary: any calls that rely on Spark inference
   - A “Detox Plan” checklist, ordered steps to remove lock-in safely
3. Create a `MIGRATION_TODO.md` as a task list with checkboxes.

## Constraints
- Do NOT refactor yet.
- Do NOT remove packages yet.
- Only generate reports and TODOs.

## Output format
- Produce the two markdown files: `MIGRATION_AUDIT.md` and `MIGRATION_TODO.md`.
- Keep the plan backend-agnostic.

Now do the audit.
