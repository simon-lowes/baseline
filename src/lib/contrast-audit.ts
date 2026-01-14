/**
 * WCAG 2.1 Contrast Ratio Audit Utility
 *
 * Provides tools to validate color contrast ratios for accessibility compliance.
 * Supports OKLch color format used throughout the app's theme system.
 *
 * WCAG 2.1 AA Requirements:
 * - Normal text (<18pt): 4.5:1 minimum
 * - Large text (>=18pt or 14pt bold): 3:1 minimum
 * - UI components & graphical objects: 3:1 minimum
 */

// Color pair definitions for auditing
export interface ColorPair {
  name: string
  foreground: string // CSS variable name
  background: string // CSS variable name
  minRatio: number // WCAG minimum ratio
  type: 'text' | 'ui' // text = 4.5:1, ui = 3:1
}

export interface ContrastResult {
  pair: ColorPair
  foregroundValue: string
  backgroundValue: string
  ratio: number
  passes: boolean
  level: 'AAA' | 'AA' | 'fail'
}

export interface ThemeAuditResult {
  theme: string
  results: ContrastResult[]
  passCount: number
  failCount: number
}

// Standard color pairs to audit for each theme
export const COLOR_PAIRS: ColorPair[] = [
  { name: 'Body text', foreground: '--foreground', background: '--background', minRatio: 4.5, type: 'text' },
  { name: 'Muted text', foreground: '--muted-foreground', background: '--background', minRatio: 4.5, type: 'text' },
  { name: 'Card text', foreground: '--card-foreground', background: '--card', minRatio: 4.5, type: 'text' },
  { name: 'Primary button', foreground: '--primary-foreground', background: '--primary', minRatio: 4.5, type: 'text' },
  { name: 'Accent button', foreground: '--accent-foreground', background: '--accent', minRatio: 4.5, type: 'text' },
  { name: 'Destructive button', foreground: '--destructive-foreground', background: '--destructive', minRatio: 4.5, type: 'text' },
  { name: 'Border visibility', foreground: '--border', background: '--background', minRatio: 3, type: 'ui' },
  { name: 'Muted text on card', foreground: '--muted-foreground', background: '--card', minRatio: 4.5, type: 'text' },
  { name: 'Popover text', foreground: '--popover-foreground', background: '--popover', minRatio: 4.5, type: 'text' },
]

// All theme variants to audit
export const THEME_VARIANTS = [
  'zinc-light', 'zinc-dark',
  'nature-light', 'nature-dark',
  'rose-light', 'rose-dark',
  'violet-light', 'violet-dark',
  'amber-light', 'amber-dark',
  'indigo-light', 'indigo-dark',
  'cyan-light', 'cyan-dark',
  'orange-light', 'orange-dark',
  'plum-light', 'plum-dark',
]

/**
 * Parse OKLch color string to components
 * Handles formats: oklch(L C H), oklch(L C H / alpha)
 */
export function parseOklch(color: string): { L: number; C: number; H: number; alpha: number } | null {
  // Handle oklch format
  const oklchMatch = color.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/)
  if (oklchMatch) {
    const alpha = oklchMatch[4]
      ? oklchMatch[4].endsWith('%')
        ? parseFloat(oklchMatch[4]) / 100
        : parseFloat(oklchMatch[4])
      : 1
    return {
      L: parseFloat(oklchMatch[1]),
      C: parseFloat(oklchMatch[2]),
      H: parseFloat(oklchMatch[3]),
      alpha,
    }
  }
  return null
}

/**
 * Convert OKLch to linear sRGB
 * Based on CSS Color Level 4 specification
 */
export function oklchToLinearSrgb(L: number, C: number, H: number): { r: number; g: number; b: number } {
  // Convert to OKLab first
  const hRad = (H * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)

  // OKLab to LMS (approximate)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  // LMS to linear sRGB
  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  }
}

/**
 * Convert linear RGB to sRGB (apply gamma correction)
 */
function linearToSrgb(value: number): number {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
}

/**
 * Convert OKLch color to sRGB values (0-255)
 */
export function oklchToSrgb(color: string): { r: number; g: number; b: number } | null {
  const parsed = parseOklch(color)
  if (!parsed) return null

  const linear = oklchToLinearSrgb(parsed.L, parsed.C, parsed.H)

  return {
    r: Math.round(linearToSrgb(linear.r) * 255),
    g: Math.round(linearToSrgb(linear.g) * 255),
    b: Math.round(linearToSrgb(linear.b) * 255),
  }
}

/**
 * Calculate relative luminance per WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  const sR = r / 255
  const sG = g / 255
  const sB = b / 255

  const rLinear = sR <= 0.04045 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4)
  const gLinear = sG <= 0.04045 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4)
  const bLinear = sB <= 0.04045 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4)

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * Calculate contrast ratio between two luminance values
 * Returns ratio between 1:1 and 21:1
 */
export function calculateContrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Get contrast ratio between two OKLch colors
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = oklchToSrgb(color1)
  const rgb2 = oklchToSrgb(color2)

  if (!rgb1 || !rgb2) return null

  const lum1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b)

  return calculateContrastRatio(lum1, lum2)
}

/**
 * Determine WCAG compliance level
 */
export function getComplianceLevel(ratio: number, type: 'text' | 'ui'): 'AAA' | 'AA' | 'fail' {
  if (type === 'text') {
    if (ratio >= 7) return 'AAA'
    if (ratio >= 4.5) return 'AA'
    return 'fail'
  } else {
    // UI components only need 3:1
    if (ratio >= 4.5) return 'AAA'
    if (ratio >= 3) return 'AA'
    return 'fail'
  }
}

/**
 * Audit a single color pair
 */
export function auditColorPair(
  pair: ColorPair,
  foregroundValue: string,
  backgroundValue: string
): ContrastResult {
  const ratio = getContrastRatio(foregroundValue, backgroundValue) ?? 0
  const passes = ratio >= pair.minRatio
  const level = getComplianceLevel(ratio, pair.type)

  return {
    pair,
    foregroundValue,
    backgroundValue,
    ratio: Math.round(ratio * 100) / 100,
    passes,
    level,
  }
}

/**
 * Audit a theme by applying it and reading CSS variables
 * Must be run in browser context
 */
export function auditTheme(themeClass: string): ThemeAuditResult {
  // Save current classes
  const originalClasses = document.documentElement.className

  // Apply theme
  document.documentElement.className = themeClass

  const results: ContrastResult[] = []
  const styles = getComputedStyle(document.documentElement)

  for (const pair of COLOR_PAIRS) {
    const foregroundValue = styles.getPropertyValue(pair.foreground).trim()
    const backgroundValue = styles.getPropertyValue(pair.background).trim()

    if (foregroundValue && backgroundValue) {
      results.push(auditColorPair(pair, foregroundValue, backgroundValue))
    }
  }

  // Restore original classes
  document.documentElement.className = originalClasses

  return {
    theme: themeClass,
    results,
    passCount: results.filter((r) => r.passes).length,
    failCount: results.filter((r) => !r.passes).length,
  }
}

/**
 * Audit all theme variants
 * Must be run in browser context
 */
export function auditAllThemes(): ThemeAuditResult[] {
  return THEME_VARIANTS.map((theme) => auditTheme(theme))
}

/**
 * Format audit results as a readable report
 */
export function formatAuditReport(results: ThemeAuditResult[]): string {
  let report = '# WCAG 2.1 AA Contrast Audit Report\n\n'

  const totalFails = results.reduce((sum, r) => sum + r.failCount, 0)
  report += `## Summary\n`
  report += `- Themes audited: ${results.length}\n`
  report += `- Total failures: ${totalFails}\n\n`

  for (const themeResult of results) {
    report += `## ${themeResult.theme}\n`
    report += `Pass: ${themeResult.passCount} | Fail: ${themeResult.failCount}\n\n`

    if (themeResult.failCount > 0) {
      report += '### Failures:\n'
      for (const result of themeResult.results.filter((r) => !r.passes)) {
        report += `- **${result.pair.name}**: ${result.ratio}:1 (needs ${result.pair.minRatio}:1)\n`
        report += `  - Foreground: \`${result.foregroundValue}\`\n`
        report += `  - Background: \`${result.backgroundValue}\`\n`
      }
      report += '\n'
    }
  }

  return report
}
