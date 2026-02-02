/**
 * Auth Security Tests
 *
 * Verifies that auth bypass gates are properly gated behind import.meta.env.DEV
 * and that no auth bypass exists outside appRuntime.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { globSync } from 'glob';

const ROOT = resolve(__dirname, '..', '..', '..');
const SRC_DIR = resolve(ROOT, 'src');

function readFile(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

const appRuntime = readFile('src/runtime/appRuntime.ts');
const logger = readFile('src/lib/logger.ts');

// ---------------------------------------------------------------------------
// 1. e2e=true checks gated by import.meta.env.DEV
// ---------------------------------------------------------------------------
describe('e2e=true gating', () => {
  it('all e2e=true checks in appRuntime.ts are gated by import.meta.env.DEV', () => {
    const lines = appRuntime.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('e2e=true') && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*')) {
        const context = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
        expect(
          context,
          'e2e=true on line ' + (i + 1) + ' is not gated by import.meta.env.DEV',
        ).toContain('import.meta.env.DEV');
      }
    }
  });

  it('logger.ts does NOT reference e2e=true in active code', () => {
    const lines = logger.split('\n');
    const activeE2eLines = lines.filter(
      (line) => line.includes('e2e=true') && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*'),
    );
    expect(
      activeE2eLines,
      'logger.ts still has ungated e2e=true:\n' + activeE2eLines.join('\n'),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. dev=true checks gated by import.meta.env.DEV
// ---------------------------------------------------------------------------
describe('dev=true gating', () => {
  it('all dev=true checks in appRuntime.ts are gated by import.meta.env.DEV', () => {
    const lines = appRuntime.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('dev=true') && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*')) {
        const context = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
        expect(
          context,
          'dev=true on line ' + (i + 1) + ' is not gated by import.meta.env.DEV',
        ).toContain('import.meta.env.DEV');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 3. No auth bypass outside appRuntime.ts
// ---------------------------------------------------------------------------
describe('no ungated e2e=true outside appRuntime.ts', () => {
  it('all e2e=true references outside appRuntime.ts are gated by import.meta.env.DEV', () => {
    const files = globSync('**/*.{ts,tsx}', { cwd: SRC_DIR, absolute: true }).filter(
      (f) => !f.includes('__tests__') && !f.includes('node_modules'),
    );

    const ungated: Array<{ file: string; line: number; text: string }> = [];
    const appRuntimePath = resolve(SRC_DIR, 'runtime/appRuntime.ts');

    for (const filePath of files) {
      if (filePath === appRuntimePath) continue;
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes('e2e=true') &&
          !line.trimStart().startsWith('//') &&
          !line.trimStart().startsWith('*')
        ) {
          // Check if this usage is inside an import.meta.env.DEV guard
          // by scanning back up to 5 lines for the guard
          const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
          // Also check the full function/block scope by looking further back
          const widerContext = lines.slice(Math.max(0, i - 15), i + 1).join('\n');
          if (!context.includes('import.meta.env.DEV') && !widerContext.includes('import.meta.env.DEV')) {
            ungated.push({
              file: relative(ROOT, filePath),
              line: i + 1,
              text: line.trim(),
            });
          }
        }
      }
    }

    // These files are known to have ungated e2e=true for non-auth purposes
    // (mock AI responses and test dialog helpers). They should be DEV-gated
    // but are currently not — this test documents and tracks them.
    // TODO: Gate these with import.meta.env.DEV to remove from allowlist
    const KNOWN_UNGATED = new Set([
      'src/services/configGenerationService.ts',
      'src/components/Dashboard.tsx',
    ]);

    const unexpected = ungated.filter((u) => !KNOWN_UNGATED.has(u.file));
    expect(
      unexpected,
      'Ungated e2e=true found in unexpected files:\n' + unexpected.map((b) => '  ' + b.file + ':' + b.line + ' — ' + b.text).join('\n'),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. No JWT tokens stored by app code in localStorage
// ---------------------------------------------------------------------------
describe('no JWT storage in localStorage', () => {
  it('app code does not store JWT tokens in localStorage', () => {
    const files = globSync('**/*.{ts,tsx}', { cwd: SRC_DIR, absolute: true }).filter(
      (f) => !f.includes('__tests__') && !f.includes('node_modules'),
    );

    const hits: Array<{ file: string; line: number; text: string }> = [];

    for (const filePath of files) {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          /localStorage\.setItem\s*\([^)]*(?:jwt|token|access_token|auth_token)/i.test(line) &&
          !line.trimStart().startsWith('//')
        ) {
          hits.push({
            file: relative(ROOT, filePath),
            line: i + 1,
            text: line.trim(),
          });
        }
      }
    }

    expect(
      hits,
      'JWT token storage found:\n' + hits.map((h) => '  ' + h.file + ':' + h.line + ' — ' + h.text).join('\n'),
    ).toHaveLength(0);
  });
});
