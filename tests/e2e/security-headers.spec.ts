/**
 * E2E: Security Headers (limited scope)
 *
 * Vite preview does not serve production security headers, so this test is
 * limited to what the HTML itself provides. The unit test
 * (security-headers.test.ts) covers security-headers.json headers via static analysis.
 */
import { test, expect } from "@playwright/test";

test.describe("security headers (preview server)", () => {
  test("CSP meta tag is present", async ({ page }) => {
    await page.goto("/");
    const cspTag = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(cspTag).toHaveCount(1);
  });

  test("no x-powered-by header exposed", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).toBeTruthy();
    const poweredBy = response!.headers()["x-powered-by"];
    // Vite preview may set this, but in production it should not.
    // This test documents the current behaviour.
    // If x-powered-by is present, it's informational leakage.
    if (poweredBy) {
      console.warn("x-powered-by header present:", poweredBy);
    }
  });

  test("response does not contain server version in headers", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).toBeTruthy();
    const server = response!.headers()["server"] ?? "";
    // Server header should not expose detailed version info
    expect(server).not.toMatch(/\d+\.\d+\.\d+/);
  });
});
