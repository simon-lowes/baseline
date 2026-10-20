/**
 * Data API grants in migrations (static analysis).
 *
 * From 30 Oct 2026 Supabase no longer auto-grants Data API access to new
 * tables in the public schema. A table created by a migration without explicit
 * grants answers every supabase-js / PostgREST request with "permission
 * denied", and a schema rebuilt from migrations (new project, preview branch,
 * `supabase db reset`) loses access to every table.
 *
 * This test reads every migration and checks that each public table created
 * (or renamed into place) has GRANTs to `authenticated` and `service_role`
 * somewhere in the migration history. Grant `anon` only where an RLS policy
 * lets unauthenticated users in; it is not required here.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(__dirname, '..', '..', 'migrations');
const REQUIRED_ROLES = ['authenticated', 'service_role'] as const;

function stripComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** "public.foo", "\"foo\"" or "foo" -> "foo"; null for tables in other schemas. */
function publicTableName(raw: string): string | null {
  const parts = raw.trim().replace(/"/g, '').toLowerCase().split('.');
  if (parts.length === 1) return parts[0];
  return parts[0] === 'public' ? parts[1] : null;
}

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((file) => ({
    file,
    sql: stripComments(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8')),
  }));

/** Tables that end up in public: created by a migration, or renamed into place. */
function collectTables(): Map<string, string> {
  const tables = new Map<string, string>(); // name -> migration that introduced it
  const create = /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi;
  const rename = /alter\s+table\s+(?:if\s+exists\s+)?([\w."]+)\s+rename\s+to\s+([\w"]+)/gi;
  for (const { file, sql } of migrations) {
    for (const m of sql.matchAll(create)) {
      const name = publicTableName(m[1]);
      if (name) tables.set(name, file);
    }
    for (const m of sql.matchAll(rename)) {
      const from = publicTableName(m[1]);
      const to = publicTableName(m[2]);
      if (from === null || to === null) continue;
      tables.delete(from);
      tables.set(to, file);
    }
  }
  return tables;
}

/** table -> set of roles granted any privilege on it, across all migrations. */
function collectGrants(): Map<string, Set<string>> {
  const grants = new Map<string, Set<string>>();
  const grant = /grant\s+[\w\s,]+?\s+on\s+(?:table\s+)?([\w.",\s]+?)\s+to\s+([\w,\s]+?)\s*;/gi;
  for (const { sql } of migrations) {
    for (const m of sql.matchAll(grant)) {
      const roles = m[2].split(',').map((r) => r.trim().toLowerCase());
      for (const rawTable of m[1].split(',')) {
        const name = publicTableName(rawTable);
        if (!name) continue;
        const set = grants.get(name) ?? new Set<string>();
        roles.forEach((r) => set.add(r));
        grants.set(name, set);
      }
    }
  }
  return grants;
}

describe('Data API grants in migrations', () => {
  const tables = collectTables();
  const grants = collectGrants();

  it('finds the tables created by migrations', () => {
    // Guards against the parser silently matching nothing.
    expect([...tables.keys()]).toEqual(
      expect.arrayContaining(['profiles', 'trackers', 'tracker_entries', 'dictionary_cache']),
    );
  });

  it.each([...tables.entries()])(
    'public.%s (from %s) is granted to authenticated and service_role',
    (table) => {
      const roles = grants.get(table) ?? new Set<string>();
      const missing = REQUIRED_ROLES.filter((r) => !roles.has(r));
      expect(
        missing,
        `Add "grant ... on public.${table} to ${missing.join(', ')};" in the migration that creates it`,
      ).toEqual([]);
    },
  );
});
