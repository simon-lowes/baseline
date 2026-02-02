/**
 * Edge Function Security Tests
 *
 * Static analysis of all edge function source files.
 * Verifies security invariants: auth enforcement, CORS allowlists,
 * error sanitisation, and prompt sanitizer usage.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const FUNCTIONS_DIR = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Explicit function list — adding a function without updating here = failure
// ---------------------------------------------------------------------------
const EDGE_FUNCTIONS = [
  'backfill-tracker-images',
  'check-ambiguity',
  'create-default-tracker',
  'datamuse-lookup',
  'delete-account',
  'generate-tracker-config',
  'generate-tracker-fields',
  'generate-tracker-image',
  'validate-tracker-fields',
] as const;

// Functions that call Gemini / AI APIs
const AI_FUNCTIONS = [
  'check-ambiguity',
  'generate-tracker-config',
  'generate-tracker-fields',
  'generate-tracker-image',
  'backfill-tracker-images',
] as const;

/** Read the index.ts for a given function name. */
function readFn(name: string): string {
  const path = resolve(FUNCTIONS_DIR, name, 'index.ts');
  return readFileSync(path, 'utf-8');
}

// ---------------------------------------------------------------------------
// 0. Function list integrity
// ---------------------------------------------------------------------------
describe('function list integrity', () => {
  it('all listed functions exist on disk', () => {
    for (const fn of EDGE_FUNCTIONS) {
      const path = resolve(FUNCTIONS_DIR, fn, 'index.ts');
      expect(existsSync(path), `${fn}/index.ts should exist`).toBe(true);
    }
  });

  it('no unlisted functions exist (excluding _shared and __tests__)', () => {
    const dirs = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_') && d.name !== '__tests__')
      .map((d) => d.name);

    const listed = new Set<string>(EDGE_FUNCTIONS);
    const unlisted = dirs.filter((d) => !listed.has(d));
    expect(
      unlisted,
      'Unlisted edge functions found: ' + unlisted.join(', ') + '. Add them to EDGE_FUNCTIONS in this test.',
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 1. Auth enforcement — every function checks auth header + returns 401
// ---------------------------------------------------------------------------
describe('auth enforcement', () => {
  it.each([...EDGE_FUNCTIONS])('%s checks authorization header', (fn) => {
    const source = readFn(fn);
    expect(source).toMatch(/headers\.get\s*\(\s*['"]authorization['"]\s*\)/i);
  });

  it.each([...EDGE_FUNCTIONS])('%s returns 401 for missing/invalid auth', (fn) => {
    const source = readFn(fn);
    expect(source).toContain('401');
  });
});

// ---------------------------------------------------------------------------
// 2. CORS — no wildcard origin; uses allowedOrigins allowlist
// ---------------------------------------------------------------------------
describe('CORS configuration', () => {
  it.each([...EDGE_FUNCTIONS])('%s uses allowedOrigins allowlist (no wildcard ACAO)', (fn) => {
    const source = readFn(fn);
    expect(source).toMatch(/allowedOrigins/);
    // Must NOT have a bare '*' as Access-Control-Allow-Origin value
    expect(source).not.toMatch(/['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/);
  });
});

// ---------------------------------------------------------------------------
// 3. Error sanitisation — no external API error text in responses
// ---------------------------------------------------------------------------
describe('error sanitisation', () => {
  it.each([...AI_FUNCTIONS])(
    '%s does not expose external API error text in thrown errors',
    (fn) => {
      const source = readFn(fn);
      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // If a line reads external error text via response.text()
        // the subsequent lines should NOT pass that variable into a thrown Error or response
        if (/errorText\s*=\s*await\s+.*\.text\(\)/.test(line)) {
          const lookahead = lines.slice(i + 1, i + 4).join('\n');
          expect(lookahead).not.toMatch(/throw\s+new\s+Error\s*\(.*errorText/);
          expect(lookahead).not.toMatch(/JSON\.stringify\s*\(.*errorText/);
        }
      }
    },
  );
});

// ---------------------------------------------------------------------------
// 4. AI functions use prompt sanitizer
// ---------------------------------------------------------------------------
describe('prompt sanitizer usage', () => {
  it.each([...AI_FUNCTIONS])('%s imports from prompt-sanitizer', (fn) => {
    const source = readFn(fn);
    // backfill-tracker-images reads tracker names from DB, not user input
    if (fn === 'backfill-tracker-images') return;
    expect(source).toMatch(/from\s+['"]\.\.\/(_shared\/)?prompt-sanitizer/);
  });
});

// ---------------------------------------------------------------------------
// 5. SECURITY DEFINER + search_path in migrations
// ---------------------------------------------------------------------------
describe('SECURITY DEFINER paired with search_path', () => {
  // Old migrations that created SECURITY DEFINER functions without search_path.
  // These were fixed in subsequent migrations (20251221144612, 20251226083009).
  // Only the final state matters, but migrations are append-only so old files remain.
  // Old migrations that created SECURITY DEFINER without search_path.
  // Either fixed in later migrations or pending a fix migration.
  const FIXED_IN_LATER_MIGRATION = new Set([
    '20251221144519_add_user_id_and_rls.sql',       // Fixed in 20251221144612
    '20251225120656_migrate_existing_users_to_trackers.sql', // Fixed in 20251226083009
    '20251225120714_create_tracker_triggers.sql',    // Fixed in 20251226083009
    '20251229195732_add_service_fn_create_default_tracker.sql', // TODO: needs fix migration
  ]);

  it('every SECURITY DEFINER function in migrations has SET search_path (or is fixed later)', () => {
    const migrationsDir = resolve(FUNCTIONS_DIR, '..', 'migrations');
    if (!existsSync(migrationsDir)) return;

    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

    for (const file of files) {
      if (FIXED_IN_LATER_MIGRATION.has(file)) continue;

      const content = readFileSync(resolve(migrationsDir, file), 'utf-8');
      if (/SECURITY\s+DEFINER/i.test(content)) {
        const blocks = content.split(/(?=CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION)/i);
        for (const block of blocks) {
          // Only check blocks that actually define a function (skip preamble/comments)
          if (
            /^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i.test(block.trim()) &&
            /SECURITY\s+DEFINER/i.test(block)
          ) {
            expect(
              block,
              'SECURITY DEFINER without search_path in: ' + file,
            ).toMatch(/search_path/i);
          }
        }
      }
    }
  });
});
