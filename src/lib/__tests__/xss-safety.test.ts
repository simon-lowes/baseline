/**
 * XSS Safety Tests
 *
 * Static analysis scanning src/ for dangerous DOM patterns.
 * These tests enforce an allowlist - new usages of raw HTML APIs break the test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { globSync } from "glob";

const SRC_DIR = resolve(__dirname, "..", "..");
const ROOT = resolve(SRC_DIR, "..");

const sourceFiles = globSync("**/*.{ts,tsx}", { cwd: SRC_DIR, absolute: true })
  .filter((f) => !f.includes("node_modules") && !f.includes("__tests__"));

function grepFiles(pattern: RegExp): Array<{ file: string; line: number; text: string }> {
  const hits: Array<{ file: string; line: number; text: string }> = [];
  for (const filePath of sourceFiles) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        hits.push({ file: relative(ROOT, filePath), line: i + 1, text: lines[i].trim() });
      }
    }
  }
  return hits;
}

function buildPattern(parts: string[]): RegExp {
  return new RegExp(parts.join(""));
}

// ---------------------------------------------------------------------------
// Raw HTML injection allowlist
// ---------------------------------------------------------------------------
describe("raw HTML injection allowlist", () => {
  const RAW_HTML_PATTERN = buildPattern(["danger", "ouslySetInner", "HTML"]);
  const ALLOWED_FILES = new Set(["src/components/ui/chart.tsx"]);

  it("only appears in allowlisted files", () => {
    const hits = grepFiles(RAW_HTML_PATTERN);
    const unauthorised = hits.filter((h) => !ALLOWED_FILES.has(h.file));
    expect(
      unauthorised,
      "Unexpected raw HTML in: " + unauthorised.map((h) => h.file + ":" + h.line).join(", "),
    ).toHaveLength(0);
  });

  it("chart.tsx usage is CSS-only (style tag)", () => {
    const chartPath = resolve(SRC_DIR, "components/ui/chart.tsx");
    const content = readFileSync(chartPath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (RAW_HTML_PATTERN.test(lines[i])) {
        const context = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
        expect(context).toMatch(/<style/i);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// innerHTML allowlist
// ---------------------------------------------------------------------------
describe("innerHTML allowlist", () => {
  const ALLOWED_FILES = new Set(["src/components/Dashboard.tsx"]);

  it("only appears in allowlisted files", () => {
    const hits = grepFiles(/\.innerHTML\s*=/);
    const unauthorised = hits.filter((h) => !ALLOWED_FILES.has(h.file));
    expect(
      unauthorised,
      "Unexpected innerHTML in: " + unauthorised.map((h) => h.file + ":" + h.line).join(", "),
    ).toHaveLength(0);
  });

  it("Dashboard.tsx usage is empty-string clear only", () => {
    const hits = grepFiles(/\.innerHTML\s*=/).filter(
      (h) => h.file === "src/components/Dashboard.tsx",
    );
    for (const hit of hits) {
      expect(hit.text).toMatch(/\.innerHTML\s*=\s*['"`]{2}/);
    }
  });
});

// ---------------------------------------------------------------------------
// Forbidden DOM patterns - zero occurrences expected
// ---------------------------------------------------------------------------
describe("forbidden DOM patterns", () => {
  const patterns: [string, RegExp][] = [
    ["document.write", buildPattern(["document\\.write", "\\s*\\("])],
    ["document.writeln", buildPattern(["document\\.writeln", "\\s*\\("])],
    ["dynamic code execution", buildPattern(["[^.]", "ev", "al", "\\s*\\("])],
    ["dynamic code via constructor", buildPattern(["new\\s+Func", "tion\\s*\\("])],
    ["setTimeout with string", buildPattern(["setTimeout\\s*\\(\\s*[\"'`]"])],
    ["setInterval with string", buildPattern(["setInterval\\s*\\(\\s*[\"'`]"])],
    ["outerHTML assignment", /\.outerHTML\s*=/],
    ["insertAdjacentHTML", /\.insertAdjacentHTML\s*\(/],
  ];

  it.each(patterns)("zero occurrences of %s", (_name, pattern) => {
    const hits = grepFiles(pattern);
    expect(
      hits,
      "Found " + _name + " in: " + hits.map((h) => h.file + ":" + h.line).join(", "),
    ).toHaveLength(0);
  });
});
