/**
 * E2E: Auth Security in Production Build
 *
 * Verifies that e2e=true and dev=true query params are ignored in production
 * builds, the login UI is shown, and window.__dev is undefined.
 */
import { test, expect } from "@playwright/test";

test.describe("auth security in production build", () => {
  test("?e2e=true is ignored — login UI shown", async ({ page }) => {
    await page.goto("/?e2e=true");
    // In production, e2e=true should have no effect.
    // The app should show the sign-in page (not a dashboard or test UI).
    // Look for the sign-in form or "sign in" text.
    const signIn = page.getByText(/sign in|log in|email/i).first();
    await expect(signIn).toBeVisible({ timeout: 10_000 });
  });

  test("?dev=true is ignored — login UI shown", async ({ page }) => {
    await page.goto("/?dev=true");
    const signIn = page.getByText(/sign in|log in|email/i).first();
    await expect(signIn).toBeVisible({ timeout: 10_000 });
  });

  test("window.__dev is undefined in production", async ({ page }) => {
    await page.goto("/");
    const devHelper = await page.evaluate(() => (window as any).__dev);
    expect(devHelper).toBeUndefined();
  });
});
