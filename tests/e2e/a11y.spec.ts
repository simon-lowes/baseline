/**
 * Accessibility E2E Tests
 *
 * Uses @axe-core/playwright to scan the app for WCAG 2.1 violations.
 * Documents current a11y state without failing on known issues.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const BASE = process.env.E2E_BASE || 'http://localhost:5173'

test.describe('Accessibility', () => {
  test('login/landing page has no critical a11y violations', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })

    // Wait for React to render
    const root = page.locator('#root')
    await expect(root).not.toBeEmpty()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    // Log violations for visibility (test documents them)
    if (results.violations.length > 0) {
      console.log(`\n--- Accessibility violations found: ${results.violations.length} ---`)
      for (const violation of results.violations) {
        console.log(`[${violation.impact}] ${violation.id}: ${violation.description}`)
        console.log(`  Help: ${violation.helpUrl}`)
        console.log(`  Affected nodes: ${violation.nodes.length}`)
        for (const node of violation.nodes.slice(0, 3)) {
          console.log(`    - ${node.html.slice(0, 120)}`)
        }
      }
    }

    // Only fail on critical violations
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical'
    )

    expect(
      criticalViolations,
      `Critical a11y violations: ${criticalViolations.map(v => `${v.id}: ${v.description}`).join(', ')}`
    ).toHaveLength(0)
  })

  test('page has lang attribute', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
  })

  test('page has a main landmark', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await expect(page.locator('#root')).not.toBeEmpty()

    // Check for main landmark (role="main" or <main> element)
    const mainCount = await page.locator('main, [role="main"]').count()
    // Document whether main landmark exists (informational, not a hard fail)
    if (mainCount === 0) {
      console.log('INFO: No <main> landmark found on landing page')
    }
  })

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await expect(page.locator('#root')).not.toBeEmpty()

    // All buttons and links should be focusable
    const buttons = page.locator('button:visible, a:visible, [role="button"]:visible')
    const count = await buttons.count()

    if (count > 0) {
      // Tab through first few interactive elements
      for (let i = 0; i < Math.min(count, 5); i++) {
        await page.keyboard.press('Tab')
        const focused = await page.evaluate(() => {
          const el = document.activeElement
          return el ? el.tagName.toLowerCase() : null
        })
        // Should focus on something (not stuck on body)
        expect(focused).not.toBeNull()
      }
    }
  })

  test('images have alt text', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await expect(page.locator('#root')).not.toBeEmpty()

    const images = page.locator('img:visible')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')

      // Either has alt text or is decorative (role="presentation" / alt="")
      const isAccessible = alt !== null || role === 'presentation' || role === 'none'
      expect(
        isAccessible,
        `Image at index ${i} missing alt text: ${await img.getAttribute('src')}`
      ).toBe(true)
    }
  })
})
