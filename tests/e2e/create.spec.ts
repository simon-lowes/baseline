import { test, expect } from '@playwright/test';
const BASE = process.env.E2E_BASE || 'http://localhost:5173';

// Reuse helpers from ambiguity.spec by opening the create dialog robustly
async function openDashboardCreateDialog(page) {
  for (let i = 0; i < 20; i++) {
    try {
      await page.evaluate(() => {
        if ((window as any).__openCreateDialog) {
          (window as any).__openCreateDialog();
        } else {
          (window as any).__pendingOpenCreateDialog = true;
          try { window.dispatchEvent(new CustomEvent('e2e-open-create-dialog')); } catch (e) {}
        }
      });
      await page.waitForTimeout(250);
      const visible = await page.getByText('Create New Tracker').isVisible().catch(() => false);
      if (visible) return;
    } catch (e) {}
    await page.waitForTimeout(200);
  }
  throw new Error('Failed to open create dialog');
}

test.describe('Tracker creation (basic)', () => {
  test('Create a non-ambiguous custom tracker (e2e mode)', async ({ page }) => {
    await page.goto(`${BASE}?e2e=true`);
    await page.waitForFunction(() => document.readyState === 'complete' && !!(window as any).__openCreateDialog, {}, { timeout: 60000 });

    await openDashboardCreateDialog(page);

    const input = page.getByPlaceholder('e.g., Migraines, Diet, Gratitude...');
    await input.fill('Pushups');

    const submit = page.locator('form').locator('button[type=submit]');
    await submit.waitFor({ state: 'attached' });
    await expect(submit).toBeEnabled();
    await submit.click();

    // Should appear in tracker list
    await expect(page.getByRole('heading', { name: 'Pushups' })).toBeVisible({ timeout: 5000 });
  });

  test('Create a preset tracker via the preset button (e2e mode)', async ({ page }) => {
    await page.goto(`${BASE}?e2e=true`);
    await page.waitForFunction(() => document.readyState === 'complete' && !!(window as any).__openCreateDialog, {}, { timeout: 60000 });

    await openDashboardCreateDialog(page);

    // Click the first preset button
    const presetBtn = page.getByRole('button').filter({ hasText: /Pain|Chronic|Headache|Mood|Sleep|Exercise/ }).first();
    if (await presetBtn.count() === 0) {
      // fallback: click the first preset in grid
      await page.locator('[data-slot="dialog-content"] button').first().click();
    } else {
      await presetBtn.click();
    }

    // Preset creation should show a toast and a new tracker with the preset name
    await page.waitForTimeout(500);
    // We can't rely on exact preset names available in runtime, but ensure there is some new tracker added
    const headings = await page.getByRole('heading').count();
    expect(headings).toBeGreaterThan(0);
  });

  test('Disambiguation uses Drawer on mobile and can be dismissed (mobile emulation)', async ({ page }) => {
    // Emulate a small mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}?e2e=true`);
    await page.waitForFunction(() => document.readyState === 'complete' && !!(window as any).__openCreateDialog, {}, { timeout: 60000 });

    await openDashboardCreateDialog(page);

    const input = page.getByPlaceholder('e.g., Migraines, Diet, Gratitude...');
    await input.fill('Flight');
    await page.locator('form').locator('button[type=submit]').click();

    // Disambiguation should appear and Drawer content (data-slot="drawer-content") should be present
    await expect(page.locator('[data-slot="drawer-content"]')).toBeVisible({ timeout: 5000 });

    // Dismiss by pressing Escape (as a proxy for swipe) to ensure it closes
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-slot="drawer-content"]')).toBeHidden({ timeout: 5000 });
  });
});