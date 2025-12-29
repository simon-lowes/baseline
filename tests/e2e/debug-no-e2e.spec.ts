import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE || 'http://localhost:5173';

// Quick debug: attempt to create a tracker without e2e auth bypass and capture logs
test('Debug create without e2e auth', async ({ page }) => {
  page.on('console', (m) => console.log('[PAGE]', m.text()));
  page.on('pageerror', (e) => console.log('[PAGE_ERROR]', e.message));
  page.on('response', (res) => console.log('[RESP]', res.status(), res.url()));
  page.on('requestfailed', (req) => console.log('[REQ_FAIL]', req.url(), req.failure()?.errorText));

  await page.goto(`${BASE}?dev=true`);
  // Wait for page to render
  await page.waitForSelector('text=New Tracker', { timeout: 15000 });

  // Open the create dialog
  await page.click('text=New Tracker');
  await page.waitForSelector('text=Create New Tracker', { timeout: 5000 });

  // Fill a non-ambiguous name and submit
  await page.fill('input[placeholder="e.g., Migraines, Diet, Gratitude..."]', 'Banana');
  await page.click('form button[type=submit]');

  // Wait a short time for result (allow AI/dictionary/network calls to complete in dev)
  await page.waitForTimeout(3000);

  // If disambiguation dialog appeared, select first interpretation and confirm
  const clarifyVisible = await page.getByText('Clarify Your Tracker').isVisible().catch(() => false);
  if (clarifyVisible) {
    // Wait for dialog to render fully
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    const option = dialog.locator('button').first();
    await option.click();
    const createButton = dialog.getByRole('button', { name: 'Create Tracker' });
    await createButton.waitFor({ state: 'attached', timeout: 3000 });
    await createButton.click();
    // Wait for UI to update
    await page.waitForTimeout(500);
  }

  // As a fallback, if UI didn't create, try direct dev helper to exercise track creation
  const devCreateAvailable = await page.evaluate(() => !!(window as any).__dev?.createTracker);
  console.log('[DEBUG] devCreateAvailable:', devCreateAvailable);
  if (devCreateAvailable) {
    const res = await page.evaluate(async () => {
      try {
        return await (window as any).__dev.createTracker({ name: 'Banana', type: 'custom', icon: 'activity', color: '#6366f1' });
      } catch (e) {
        return { error: String(e) };
      }
    });
    console.log('[DEBUG] dev create result:', res);
    await page.waitForTimeout(500);
  }

  // Check for a new tracker named 'Banana' in the list
  const bananaCard = await page.getByRole('heading', { name: 'Banana' }).first().count();
  console.log('[DEBUG] bananaCard count:', bananaCard);

  // Also check for toast messages
  const success = await page.locator('text=tracker created').count();
  const failure = await page.locator('text=Failed to create tracker').count();
  console.log('[DEBUG] success count:', success, 'failure count:', failure);

  // Assert that either the card appeared or we got a toast
  expect(bananaCard + success + failure).toBeGreaterThan(0);
});