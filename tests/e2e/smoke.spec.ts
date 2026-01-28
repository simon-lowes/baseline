import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE || 'http://localhost:5173';

test.describe('Smoke test', () => {
  test('app loads without fatal JS errors', async ({ page }) => {
    const fatalErrors: string[] = [];

    // Collect console errors that indicate a broken build
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          text.includes('Minified React error') ||
          text.includes('ChunkLoadError') ||
          text.includes('Uncaught') ||
          text.includes('Cannot read properties of undefined') ||
          text.includes('is not a function')
        ) {
          fatalErrors.push(text);
        }
      }
    });

    // Also catch unhandled page errors (thrown exceptions)
    page.on('pageerror', (error) => {
      fatalErrors.push(error.message);
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });

    // Page title should be set
    await expect(page).toHaveTitle('Baseline');

    // React should have rendered something into #root
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();

    // No fatal JS errors should have occurred
    expect(fatalErrors, 'Fatal JS errors detected').toEqual([]);
  });
});
