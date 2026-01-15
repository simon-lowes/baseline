/**
 * Color Conversion Utilities
 *
 * Provides conversion between hex colors and OKLch color space.
 * OKLch is a perceptually uniform color space ideal for UI theming.
 *
 * OKLch components:
 * - L (Lightness): 0-1, where 0 is black and 1 is white
 * - C (Chroma): 0-0.4, colorfulness (0 is gray)
 * - H (Hue): 0-360, color wheel angle
 */

/**
 * Parse an OKLch string into its components
 * @example parseOklch('oklch(0.65 0.12 250)') → { l: 0.65, c: 0.12, h: 250 }
 */
export function parseOklch(oklch: string): { l: number; c: number; h: number } | null {
  const match = oklch.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!match) return null

  return {
    l: parseFloat(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3]),
  }
}

/**
 * Format OKLch components into a CSS string
 * @example formatOklch(0.65, 0.12, 250) → 'oklch(0.65 0.12 250)'
 */
export function formatOklch(l: number, c: number, h: number): string {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`
}

/**
 * Convert a hex color to sRGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null

  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  }
}

/**
 * Convert sRGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(1, n))
    const hex = Math.round(clamped * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Convert sRGB to linear RGB (gamma correction)
 */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * Convert linear RGB to sRGB (inverse gamma)
 */
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

/**
 * Convert linear RGB to OKLab
 * Based on https://bottosson.github.io/posts/oklab/
 */
function linearRgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  }
}

/**
 * Convert OKLab to linear RGB
 */
function oklabToLinearRgb(L: number, a: number, b: number): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  }
}

/**
 * Convert OKLab to OKLch (polar form)
 */
function oklabToOklch(L: number, a: number, b: number): { l: number; c: number; h: number } {
  const c = Math.sqrt(a * a + b * b)
  let h = Math.atan2(b, a) * (180 / Math.PI)
  if (h < 0) h += 360

  return { l: L, c, h }
}

/**
 * Convert OKLch to OKLab (cartesian form)
 */
function oklchToOklab(l: number, c: number, h: number): { L: number; a: number; b: number } {
  const hRad = h * (Math.PI / 180)
  return {
    L: l,
    a: c * Math.cos(hRad),
    b: c * Math.sin(hRad),
  }
}

/**
 * Convert a hex color to OKLch
 * @example hexToOklch('#4a90d9') → 'oklch(0.650 0.120 250.0)'
 */
export function hexToOklch(hex: string): string | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null

  const linearR = srgbToLinear(rgb.r)
  const linearG = srgbToLinear(rgb.g)
  const linearB = srgbToLinear(rgb.b)

  const lab = linearRgbToOklab(linearR, linearG, linearB)
  const lch = oklabToOklch(lab.L, lab.a, lab.b)

  return formatOklch(lch.l, lch.c, lch.h)
}

/**
 * Convert an OKLch color to hex
 * @example oklchToHex('oklch(0.65 0.12 250)') → '#4a90d9'
 */
export function oklchToHex(oklch: string): string | null {
  const lch = parseOklch(oklch)
  if (!lch) return null

  const lab = oklchToOklab(lch.l, lch.c, lch.h)
  const linearRgb = oklabToLinearRgb(lab.L, lab.a, lab.b)

  const r = linearToSrgb(linearRgb.r)
  const g = linearToSrgb(linearRgb.g)
  const b = linearToSrgb(linearRgb.b)

  return rgbToHex(r, g, b)
}

/**
 * Check if an OKLch color is within the sRGB gamut
 */
export function isInGamut(oklch: string): boolean {
  const lch = parseOklch(oklch)
  if (!lch) return false

  const lab = oklchToOklab(lch.l, lch.c, lch.h)
  const rgb = oklabToLinearRgb(lab.L, lab.a, lab.b)

  // Check if RGB values are within [0, 1]
  const epsilon = 0.001
  return (
    rgb.r >= -epsilon && rgb.r <= 1 + epsilon &&
    rgb.g >= -epsilon && rgb.g <= 1 + epsilon &&
    rgb.b >= -epsilon && rgb.b <= 1 + epsilon
  )
}

/**
 * Clamp an OKLch color to the sRGB gamut by reducing chroma
 */
export function clampToGamut(l: number, c: number, h: number): { l: number; c: number; h: number } {
  let low = 0
  let high = c

  // Binary search for the maximum chroma that's in gamut
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    const test = formatOklch(l, mid, h)

    if (isInGamut(test)) {
      low = mid
    } else {
      high = mid
    }
  }

  return { l, c: low, h }
}

/**
 * Generate a suitable foreground color (black or white) for a given background
 */
export function getContrastingForeground(backgroundOklch: string): string {
  const lch = parseOklch(backgroundOklch)
  if (!lch) return 'oklch(0 0 0)' // Default to black

  // Use lightness to determine if we need light or dark foreground
  // Threshold at 0.6 works well for most cases
  return lch.l > 0.6 ? 'oklch(0 0 0)' : 'oklch(1 0 0)'
}
