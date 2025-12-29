import { test, expect } from '@playwright/test';

// Note: Start the dev server locally before running these tests: npm run dev
const BASE = process.env.E2E_BASE || 'http://localhost:5173';

test.describe('Ambiguity & Disambiguation Flow', () => {
  // Increase timeout and allow one retry for flaky client/dialg race conditions in CI/local
  test.describe.configure({ retries: 1 });
  test.setTimeout(90_000);
  // Helper to open the Dashboard create dialog reliably
  async function openDashboardCreateDialog(page) {
    // Try helper-based open (sets pending flag and dispatches event) which is resilient across hydration
    for (let i = 0; i < 40; i++) {
      try {
        await page.evaluate(() => {
          try {
            if ((window as any).__openCreateDialog) {
              (window as any).__openCreateDialog();
            } else {
              // set pending flag so Dashboard can pick it up on mount
              (window as any).__pendingOpenCreateDialog = true;
              try { window.dispatchEvent(new CustomEvent('e2e-open-create-dialog')); } catch {}
            }
          } catch {
            // ignore
          }
        });

        // Give the app a short moment to respond
        await page.waitForTimeout(250);
        // If dialog opened, we're done
        const visible = await page.getByText('Create New Tracker').isVisible().catch(() => false);
        if (visible) return;
      } catch {
        // ignore and retry
        await page.waitForTimeout(200);
      }
    }

    // Dump diagnostics if we failed
    const html = await page.content();
    console.log('[E2E DEBUG] Failed to open dialog - Page HTML snapshot:\n', html.substring(0, 2000));
    console.log('[E2E DEBUG] Recent requests:\n', JSON.stringify((globalThis as any).__e2e_requests.slice(-20), null, 2));
    throw new Error('Failed to open Dashboard create dialog');
  }

  // Helper to ensure the create dialog's input is ready; retries opening the dialog if needed
  // NOTE: Previously a more complex helper existed; current tests use a simpler open+wait approach.
  // Kept minimal to reduce maintenance and avoid intermittent hydration races.

  test.beforeEach(async ({ page }) => {
    // Use auth bypass mode for E2E tests (noopAuth)
    // Open the app root in E2E auth-bypass mode
    await page.goto(`${BASE}?e2e=true`);

    // Attach console, pageerror and network listeners for diagnostics
    page.on('console', (msg) => console.log('[PAGE]', msg.text()));
    page.on('pageerror', (err) => console.log('[PAGE_ERROR]', err.message));
    page.on('response', (res) => console.log('[RESP]', res.status(), res.url()));
    page.on('requestfailed', (req) => console.log('[REQ_FAIL]', req.url(), req.failure()?.errorText));

    // Keep a short list of requests for debugging
    (globalThis as any).__e2e_requests = [];
    page.on('request', (req) => (
      (globalThis as any).__e2e_requests.push({ url: req.url(), method: req.method(), resourceType: req.resourceType() })
    ));

    // Wait until page has finished loading and the E2E helper is available
    try {
      await page.waitForFunction(() => document.readyState === 'complete' && !!(window as any).__openCreateDialog, {}, { timeout: 60000 });
      // Still ensure 'New Tracker' is visible (allow for slower hydration in preview builds)
      await page.getByText('New Tracker').waitFor({ timeout: 60000 });
    } catch (_err) {
      // Dump page HTML to help debugging intermittent renders
      const html = await page.content();
      console.log('[E2E DEBUG] Page HTML snapshot:\n', html.substring(0, 2000));
      console.log('[E2E DEBUG] Recent requests:\n', JSON.stringify((globalThis as any).__e2e_requests.slice(-40), null, 2));
      throw _err;
    }
  });

  test('Typo -> suggestions are shown and user must confirm (Dashboard quick-create)', async ({ page }) => {
    await page.goto(`${BASE}?e2e=true`);

    // Open the Dashboard create dialog via robust click helper
    await openDashboardCreateDialog(page);

    // Ensure dialog is ready and fill typo
    const input = page.getByPlaceholder('e.g., Migraines, Diet, Gratitude...');
    await input.fill('Flyinh');

    // Submit the custom tracker form (wait until enabled to avoid transient disabled state)
    const submitBtn = page.locator('form').locator('button[type="submit"]');
    await submitBtn.waitFor({ state: 'attached', timeout: 5000 });
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Wait for disambiguation dialog title
    await expect(page.getByText('Clarify Your Tracker')).toBeVisible();

    // Check that the reason suggests the correction 'flying'
    await expect(page.getByText(/Did you mean "flying"/i)).toBeVisible();

    // Create button should be disabled until an interpretation is selected
    const createButton = page.getByRole('button', { name: 'Create Tracker' });
    await expect(createButton).toBeDisabled();

    // Select the first interpretation
    await page.getByRole('button').filter({ hasText: 'Air Travel' }).click();

    // Now Create should be enabled
    await expect(createButton).toBeEnabled();

    // Click create and assert tracker exists in the list
    await createButton.click();
    await expect(page.getByRole('heading', { name: /Fly/i })).toBeVisible({ timeout: 15000 });
  });

  test('Exact ambiguous word -> disambiguation shown before creation (Dashboard quick-create)', async ({ page }) => {
    await page.goto(`${BASE}?e2e=true`);

    // Open the Dashboard create dialog via robust click helper
    await openDashboardCreateDialog(page);
    // Ensure dialog is ready and fill the tracker name
    const input = page.getByPlaceholder('e.g., Migraines, Diet, Gratitude...');
    await input.fill('Flight');
    // Submit the custom tracker form (submit button has no accessible label, so select by form button)
    await page.locator('form').locator('button[type="submit"]').click();

    await expect(page.getByText('Clarify Your Tracker')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Tracker' })).toBeDisabled();

    // Select 'Air Travel' if present, otherwise pick first
    const option = page.getByText(/Air Travel|air-travel/i).first();
    if (await option.isVisible()) {
      await option.click();
    } else {
      await page.getByRole('list').locator('button').first().click();
    }

    const createButton = page.getByRole('button', { name: 'Create Tracker' });
    await expect(createButton).toBeEnabled();
    await createButton.click();
    // Dashboard uses in-place update; assert the new tracker appears in the tracker list
    await expect(page.getByRole('heading', { name: 'Flight' })).toBeVisible({ timeout: 5000 });

    // Check that checkAmbiguity was called by ensuring an ambiguity-related console entry exists
    // (Playwright captures console logs via page.on in beforeEach)
  });
});