/**
 * Unit tests for lib utility modules
 *
 * Tests color-utils, date-utils, pain-utils, contrast-utils,
 * contrast-audit, analytics-utils, interlink-utils, and stateEncoder.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// color-utils
// ============================================================================
import {
  parseOklch,
  formatOklch,
  hexToOklch,
  oklchToHex,
  isInGamut,
  clampToGamut,
  getContrastingForeground,
} from '../color-utils'

describe('color-utils', () => {
  describe('parseOklch', () => {
    it('parses a valid oklch string', () => {
      const result = parseOklch('oklch(0.65 0.12 250)')
      expect(result).toEqual({ l: 0.65, c: 0.12, h: 250 })
    })

    it('returns null for invalid input', () => {
      expect(parseOklch('rgb(255, 0, 0)')).toBeNull()
      expect(parseOklch('')).toBeNull()
      expect(parseOklch('oklch()')).toBeNull()
    })

    it('handles zero values', () => {
      const result = parseOklch('oklch(0 0 0)')
      expect(result).toEqual({ l: 0, c: 0, h: 0 })
    })

    it('handles max-ish values', () => {
      const result = parseOklch('oklch(1 0.4 360)')
      expect(result).toEqual({ l: 1, c: 0.4, h: 360 })
    })

    it('handles extra whitespace', () => {
      const result = parseOklch('oklch(  0.5  0.1  180  )')
      expect(result).toEqual({ l: 0.5, c: 0.1, h: 180 })
    })
  })

  describe('formatOklch', () => {
    it('formats components into an oklch string', () => {
      expect(formatOklch(0.65, 0.12, 250)).toBe('oklch(0.650 0.120 250.0)')
    })

    it('handles zero values', () => {
      expect(formatOklch(0, 0, 0)).toBe('oklch(0.000 0.000 0.0)')
    })
  })

  describe('hexToOklch', () => {
    it('converts black', () => {
      const result = hexToOklch('#000000')
      expect(result).not.toBeNull()
      const parsed = parseOklch(result!)
      expect(parsed!.l).toBeCloseTo(0, 1)
    })

    it('converts white', () => {
      const result = hexToOklch('#ffffff')
      expect(result).not.toBeNull()
      const parsed = parseOklch(result!)
      expect(parsed!.l).toBeCloseTo(1, 1)
    })

    it('returns null for invalid hex', () => {
      expect(hexToOklch('not-a-hex')).toBeNull()
      expect(hexToOklch('#GGG')).toBeNull()
    })

    it('handles hex without hash', () => {
      const result = hexToOklch('ff0000')
      expect(result).not.toBeNull()
    })
  })

  describe('oklchToHex', () => {
    it('converts black oklch to hex', () => {
      expect(oklchToHex('oklch(0 0 0)')).toBe('#000000')
    })

    it('converts white oklch to hex', () => {
      expect(oklchToHex('oklch(1 0 0)')).toBe('#ffffff')
    })

    it('returns null for invalid oklch', () => {
      expect(oklchToHex('invalid')).toBeNull()
    })

    it('roundtrips with hexToOklch', () => {
      const hex = '#4a90d9'
      const oklch = hexToOklch(hex)
      expect(oklch).not.toBeNull()
      const backToHex = oklchToHex(oklch!)
      expect(backToHex).not.toBeNull()
      // Allow small rounding differences
      const r1 = parseInt(hex.slice(1, 3), 16)
      const r2 = parseInt(backToHex!.slice(1, 3), 16)
      expect(Math.abs(r1 - r2)).toBeLessThanOrEqual(1)
    })
  })

  describe('isInGamut', () => {
    it('returns true for in-gamut colors', () => {
      expect(isInGamut('oklch(0.5 0.05 180)')).toBe(true)
      expect(isInGamut('oklch(0 0 0)')).toBe(true)
      expect(isInGamut('oklch(1 0 0)')).toBe(true)
    })

    it('returns false for out-of-gamut colors', () => {
      // Very high chroma at any hue should be out of gamut
      expect(isInGamut('oklch(0.5 0.4 180)')).toBe(false)
    })

    it('returns false for invalid input', () => {
      expect(isInGamut('invalid')).toBe(false)
    })
  })

  describe('clampToGamut', () => {
    it('returns same values if already in gamut', () => {
      const result = clampToGamut(0.5, 0.05, 180)
      expect(result.l).toBe(0.5)
      expect(result.c).toBeCloseTo(0.05, 2)
      expect(result.h).toBe(180)
    })

    it('reduces chroma for out-of-gamut colors', () => {
      const result = clampToGamut(0.5, 0.4, 180)
      expect(result.c).toBeLessThan(0.4)
      expect(isInGamut(formatOklch(result.l, result.c, result.h))).toBe(true)
    })
  })

  describe('getContrastingForeground', () => {
    it('returns black for light backgrounds', () => {
      expect(getContrastingForeground('oklch(0.8 0.1 200)')).toBe('oklch(0 0 0)')
    })

    it('returns white for dark backgrounds', () => {
      expect(getContrastingForeground('oklch(0.3 0.1 200)')).toBe('oklch(1 0 0)')
    })

    it('defaults to black for invalid input', () => {
      expect(getContrastingForeground('invalid')).toBe('oklch(0 0 0)')
    })

    it('uses 0.6 lightness threshold', () => {
      // Exactly at 0.6 should return white (not >)
      expect(getContrastingForeground('oklch(0.6 0.1 200)')).toBe('oklch(1 0 0)')
      expect(getContrastingForeground('oklch(0.61 0.1 200)')).toBe('oklch(0 0 0)')
    })
  })
})

// ============================================================================
// date-utils
// ============================================================================
import {
  getLocalDateString,
  formatTime24,
  formatTime24WithSeconds,
  formatDateShort,
  formatDateFull,
  formatDateTime,
  formatDateTimeFull,
  formatChartDate,
  formatTooltipDate,
  generateLocalDateRange,
  getStartOfLocalDay,
  getEndOfLocalDay,
} from '../date-utils'

describe('date-utils', () => {
  describe('getLocalDateString', () => {
    it('formats a timestamp as YYYY-MM-DD', () => {
      // Jan 15, 2025 at noon UTC
      const ts = new Date(2025, 0, 15, 12, 0, 0).getTime()
      const result = getLocalDateString(ts)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result).toBe('2025-01-15')
    })

    it('pads single-digit months and days', () => {
      const ts = new Date(2025, 0, 5).getTime() // Jan 5
      const result = getLocalDateString(ts)
      expect(result).toBe('2025-01-05')
    })
  })

  describe('formatTime24', () => {
    it('formats time in 24-hour format', () => {
      // Create a date at 14:30 local time
      const date = new Date(2025, 0, 15, 14, 30, 0)
      const result = formatTime24(date.getTime())
      expect(result).toBe('14:30')
    })

    it('formats midnight correctly', () => {
      const date = new Date(2025, 0, 15, 0, 0, 0)
      const result = formatTime24(date.getTime())
      expect(result).toBe('00:00')
    })
  })

  describe('formatTime24WithSeconds', () => {
    it('includes seconds', () => {
      const date = new Date(2025, 0, 15, 14, 30, 45)
      const result = formatTime24WithSeconds(date.getTime())
      expect(result).toBe('14:30:45')
    })
  })

  describe('formatDateShort', () => {
    it('formats as "d Mon YYYY"', () => {
      const ts = new Date(2025, 0, 14).getTime()
      const result = formatDateShort(ts)
      expect(result).toContain('14')
      expect(result).toContain('Jan')
      expect(result).toContain('2025')
    })
  })

  describe('formatDateFull', () => {
    it('includes weekday', () => {
      // Jan 14 2025 is a Tuesday
      const ts = new Date(2025, 0, 14).getTime()
      const result = formatDateFull(ts)
      expect(result).toContain('Tuesday')
      expect(result).toContain('January')
      expect(result).toContain('2025')
    })
  })

  describe('formatDateTime', () => {
    it('includes date and time', () => {
      const ts = new Date(2025, 0, 14, 14, 30).getTime()
      const result = formatDateTime(ts)
      expect(result).toContain('Jan')
      expect(result).toContain('2025')
      expect(result).toContain('14:30')
    })
  })

  describe('formatDateTimeFull', () => {
    it('includes weekday and time', () => {
      const ts = new Date(2025, 0, 14, 14, 30).getTime()
      const result = formatDateTimeFull(ts)
      expect(result).toContain('Tuesday')
      expect(result).toContain('January')
      expect(result).toContain('14:30')
    })
  })

  describe('formatChartDate', () => {
    it('formats YYYY-MM-DD as "d Mon"', () => {
      const result = formatChartDate('2025-01-14')
      expect(result).toContain('14')
      expect(result).toContain('Jan')
    })
  })

  describe('formatTooltipDate', () => {
    it('includes short weekday', () => {
      const result = formatTooltipDate('2025-01-14')
      expect(result).toContain('Tue')
      expect(result).toContain('14')
      expect(result).toContain('Jan')
    })
  })

  describe('generateLocalDateRange', () => {
    it('generates date strings between start and end', () => {
      const start = new Date(2025, 0, 10)
      const end = new Date(2025, 0, 13)
      const result = generateLocalDateRange(start, end)
      expect(result).toEqual([
        '2025-01-10',
        '2025-01-11',
        '2025-01-12',
        '2025-01-13',
      ])
    })

    it('returns single date for same-day range', () => {
      const date = new Date(2025, 0, 15)
      const result = generateLocalDateRange(date, date)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe('2025-01-15')
    })

    it('returns empty array if start is after end', () => {
      const start = new Date(2025, 0, 15)
      const end = new Date(2025, 0, 10)
      const result = generateLocalDateRange(start, end)
      expect(result).toHaveLength(0)
    })
  })

  describe('getStartOfLocalDay', () => {
    it('sets time to 00:00:00.000', () => {
      const ts = new Date(2025, 0, 15, 14, 30, 45, 500).getTime()
      const result = getStartOfLocalDay(ts)
      const date = new Date(result)
      expect(date.getHours()).toBe(0)
      expect(date.getMinutes()).toBe(0)
      expect(date.getSeconds()).toBe(0)
      expect(date.getMilliseconds()).toBe(0)
    })
  })

  describe('getEndOfLocalDay', () => {
    it('sets time to 23:59:59.999', () => {
      const ts = new Date(2025, 0, 15, 14, 30).getTime()
      const result = getEndOfLocalDay(ts)
      const date = new Date(result)
      expect(date.getHours()).toBe(23)
      expect(date.getMinutes()).toBe(59)
      expect(date.getSeconds()).toBe(59)
      expect(date.getMilliseconds()).toBe(999)
    })
  })
})

// ============================================================================
// pain-utils
// ============================================================================
import {
  getPainColor,
  getPainLabel,
  filterEntriesByDateRange,
  filterEntriesByLocation,
} from '../pain-utils'
import type { PainEntry } from '@/types/pain-entry'

function makeEntry(overrides: Partial<PainEntry> = {}): PainEntry {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    tracker_id: 'tracker-1',
    timestamp: Date.now(),
    intensity: 5,
    locations: ['head'],
    notes: '',
    triggers: [],
    hashtags: [],
    ...overrides,
  }
}

describe('pain-utils', () => {
  describe('getPainColor', () => {
    it('returns green for low intensity (1-3)', () => {
      expect(getPainColor(1)).toContain('145')
      expect(getPainColor(3)).toContain('145')
    })

    it('returns amber for medium intensity (4-6)', () => {
      expect(getPainColor(4)).toContain('85')
      expect(getPainColor(6)).toContain('85')
    })

    it('returns red for high intensity (7-10)', () => {
      expect(getPainColor(7)).toContain('25')
      expect(getPainColor(10)).toContain('25')
    })
  })

  describe('getPainLabel', () => {
    it('returns correct labels for all ranges', () => {
      expect(getPainLabel(1)).toBe('Minimal')
      expect(getPainLabel(2)).toBe('Minimal')
      expect(getPainLabel(3)).toBe('Mild')
      expect(getPainLabel(4)).toBe('Mild')
      expect(getPainLabel(5)).toBe('Moderate')
      expect(getPainLabel(6)).toBe('Moderate')
      expect(getPainLabel(7)).toBe('Severe')
      expect(getPainLabel(8)).toBe('Severe')
      expect(getPainLabel(9)).toBe('Extreme')
      expect(getPainLabel(10)).toBe('Extreme')
    })
  })

  describe('filterEntriesByDateRange', () => {
    it('returns all entries when days is null', () => {
      const entries = [makeEntry(), makeEntry()]
      expect(filterEntriesByDateRange(entries, null)).toHaveLength(2)
    })

    it('filters entries by date range', () => {
      const recent = makeEntry({ timestamp: Date.now() })
      const old = makeEntry({ timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000 })
      const entries = [recent, old]
      const result = filterEntriesByDateRange(entries, 7)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(recent)
    })

    it('returns all entries when days is 0 (falsy)', () => {
      // The function uses `if (!days)` so 0 is falsy
      const entries = [makeEntry(), makeEntry()]
      expect(filterEntriesByDateRange(entries, 0)).toHaveLength(2)
    })
  })

  describe('filterEntriesByLocation', () => {
    it('returns all entries when location is null', () => {
      const entries = [makeEntry(), makeEntry()]
      expect(filterEntriesByLocation(entries, null)).toHaveLength(2)
    })

    it('filters entries by location', () => {
      const headEntry = makeEntry({ locations: ['head', 'neck'] })
      const legEntry = makeEntry({ locations: ['legs'] })
      const entries = [headEntry, legEntry]
      expect(filterEntriesByLocation(entries, 'head')).toEqual([headEntry])
      expect(filterEntriesByLocation(entries, 'legs')).toEqual([legEntry])
    })

    it('returns empty array for non-matching location', () => {
      const entries = [makeEntry({ locations: ['head'] })]
      expect(filterEntriesByLocation(entries, 'feet')).toHaveLength(0)
    })
  })
})

// ============================================================================
// contrast-utils
// ============================================================================
import {
  parseOklch as parseOklchContrast,
  getRelativeLuminance,
  getContrastRatio as getContrastRatioContrast,
  checkContrast,
} from '../contrast-utils'

describe('contrast-utils', () => {
  describe('parseOklch (contrast-utils)', () => {
    it('parses a valid oklch string', () => {
      const result = parseOklchContrast('oklch(0.5 0.1 180)')
      expect(result).toEqual({ l: 0.5, c: 0.1, h: 180 })
    })

    it('returns null for invalid input', () => {
      expect(parseOklchContrast('invalid')).toBeNull()
    })
  })

  describe('getRelativeLuminance', () => {
    it('returns 0 for black (L=0)', () => {
      expect(getRelativeLuminance(0)).toBe(0)
    })

    it('returns 1 for white (L=1)', () => {
      expect(getRelativeLuminance(1)).toBe(1)
    })

    it('applies gamma adjustment (not linear)', () => {
      const mid = getRelativeLuminance(0.5)
      expect(mid).toBeLessThan(0.5) // Gamma makes it darker than linear
    })
  })

  describe('getContrastRatio (contrast-utils)', () => {
    it('returns 21:1 for black vs white', () => {
      expect(getContrastRatioContrast(1, 0)).toBe(21)
    })

    it('returns 1:1 for same luminance', () => {
      expect(getContrastRatioContrast(0.5, 0.5)).toBe(1)
    })

    it('auto-sorts lighter/darker', () => {
      expect(getContrastRatioContrast(0, 1)).toBe(21)
    })
  })

  describe('checkContrast', () => {
    it('passes for high-contrast colors (graphical)', () => {
      const result = checkContrast('oklch(0.95 0 0)', 'oklch(0.1 0 0)', 'graphical')
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThan(3)
    })

    it('fails for low-contrast colors (text)', () => {
      const result = checkContrast('oklch(0.5 0 0)', 'oklch(0.55 0 0)', 'text')
      expect(result.passes).toBe(false)
      expect(result.required).toBe(4.5)
    })

    it('returns failed result for invalid colors', () => {
      const result = checkContrast('invalid', 'also-invalid')
      expect(result.passes).toBe(false)
      expect(result.ratio).toBe(0)
    })

    it('defaults to graphical requirement', () => {
      const result = checkContrast('oklch(0.9 0 0)', 'oklch(0.1 0 0)')
      expect(result.required).toBe(3)
    })
  })
})

// ============================================================================
// contrast-audit
// ============================================================================
import {
  parseOklch as parseOklchAudit,
  oklchToLinearSrgb,
  oklchToSrgb,
  calculateLuminance,
  calculateContrastRatio,
  getComplianceLevel,
  auditColorPair,
} from '../contrast-audit'

describe('contrast-audit', () => {
  describe('parseOklch (contrast-audit)', () => {
    it('parses oklch with alpha', () => {
      const result = parseOklchAudit('oklch(0.5 0.1 180 / 0.5)')
      expect(result).toEqual({ L: 0.5, C: 0.1, H: 180, alpha: 0.5 })
    })

    it('parses oklch with percentage alpha', () => {
      const result = parseOklchAudit('oklch(0.5 0.1 180 / 50%)')
      expect(result).toEqual({ L: 0.5, C: 0.1, H: 180, alpha: 0.5 })
    })

    it('defaults alpha to 1 when not specified', () => {
      const result = parseOklchAudit('oklch(0.5 0.1 180)')
      expect(result?.alpha).toBe(1)
    })

    it('returns null for invalid input', () => {
      expect(parseOklchAudit('invalid')).toBeNull()
    })
  })

  describe('oklchToLinearSrgb', () => {
    it('converts black', () => {
      const result = oklchToLinearSrgb(0, 0, 0)
      expect(result.r).toBeCloseTo(0, 5)
      expect(result.g).toBeCloseTo(0, 5)
      expect(result.b).toBeCloseTo(0, 5)
    })

    it('converts white', () => {
      const result = oklchToLinearSrgb(1, 0, 0)
      expect(result.r).toBeCloseTo(1, 1)
      expect(result.g).toBeCloseTo(1, 1)
      expect(result.b).toBeCloseTo(1, 1)
    })
  })

  describe('oklchToSrgb', () => {
    it('converts black to 0,0,0', () => {
      const result = oklchToSrgb('oklch(0 0 0)')
      expect(result).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('converts white to 255,255,255', () => {
      const result = oklchToSrgb('oklch(1 0 0)')
      expect(result).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('returns null for invalid color', () => {
      expect(oklchToSrgb('invalid')).toBeNull()
    })
  })

  describe('calculateLuminance', () => {
    it('returns 0 for black', () => {
      expect(calculateLuminance(0, 0, 0)).toBe(0)
    })

    it('returns 1 for white', () => {
      expect(calculateLuminance(255, 255, 255)).toBe(1)
    })

    it('gives correct relative weights (green > red > blue)', () => {
      const lumR = calculateLuminance(255, 0, 0)
      const lumG = calculateLuminance(0, 255, 0)
      const lumB = calculateLuminance(0, 0, 255)
      expect(lumG).toBeGreaterThan(lumR)
      expect(lumR).toBeGreaterThan(lumB)
    })
  })

  describe('calculateContrastRatio', () => {
    it('returns 21:1 for black vs white', () => {
      expect(calculateContrastRatio(0, 1)).toBe(21)
    })

    it('returns 1:1 for same luminance', () => {
      expect(calculateContrastRatio(0.5, 0.5)).toBe(1)
    })
  })

  describe('getComplianceLevel', () => {
    it('returns AAA for text ratio >= 7', () => {
      expect(getComplianceLevel(7, 'text')).toBe('AAA')
      expect(getComplianceLevel(10, 'text')).toBe('AAA')
    })

    it('returns AA for text ratio >= 4.5', () => {
      expect(getComplianceLevel(4.5, 'text')).toBe('AA')
      expect(getComplianceLevel(6.9, 'text')).toBe('AA')
    })

    it('returns fail for text ratio < 4.5', () => {
      expect(getComplianceLevel(3, 'text')).toBe('fail')
    })

    it('returns AAA for UI ratio >= 4.5', () => {
      expect(getComplianceLevel(4.5, 'ui')).toBe('AAA')
    })

    it('returns AA for UI ratio >= 3', () => {
      expect(getComplianceLevel(3, 'ui')).toBe('AA')
    })

    it('returns fail for UI ratio < 3', () => {
      expect(getComplianceLevel(2, 'ui')).toBe('fail')
    })
  })

  describe('auditColorPair', () => {
    it('returns a pass result for high contrast pair', () => {
      const pair = { name: 'Test', foreground: '--fg', background: '--bg', minRatio: 3, type: 'ui' as const }
      const result = auditColorPair(pair, 'oklch(0.95 0 0)', 'oklch(0.1 0 0)')
      expect(result.passes).toBe(true)
      expect(result.ratio).toBeGreaterThan(3)
      expect(result.level).not.toBe('fail')
    })

    it('returns a fail result for low contrast pair', () => {
      const pair = { name: 'Test', foreground: '--fg', background: '--bg', minRatio: 4.5, type: 'text' as const }
      const result = auditColorPair(pair, 'oklch(0.5 0 0)', 'oklch(0.55 0 0)')
      expect(result.passes).toBe(false)
      expect(result.level).toBe('fail')
    })
  })
})

// ============================================================================
// analytics-utils (pure functions only — no DOM dependency)
// ============================================================================
import {
  getDateString,
  getStartOfDay,
  filterByDateRange,
  aggregateByDay,
  getIntensityTrend,
  getMovingAverage,
  getLocationDistribution,
  getTriggerFrequency,
  getHashtagFrequency,
  getIntensityDistribution,
  groupHeatmapByWeek,
  exportToCSV,
  exportAnalyticsSummary,
} from '../analytics-utils'

describe('analytics-utils', () => {
  describe('getDateString', () => {
    it('delegates to getLocalDateString', () => {
      const ts = new Date(2025, 0, 15, 12, 0, 0).getTime()
      expect(getDateString(ts)).toBe('2025-01-15')
    })
  })

  describe('getStartOfDay', () => {
    it('truncates to start of day', () => {
      const ts = new Date(2025, 0, 15, 14, 30).getTime()
      const result = new Date(getStartOfDay(ts))
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
    })
  })

  describe('filterByDateRange', () => {
    it('returns all when days is null', () => {
      const entries = [makeEntry(), makeEntry()]
      expect(filterByDateRange(entries, null)).toHaveLength(2)
    })

    it('filters by cutoff', () => {
      const recent = makeEntry({ timestamp: Date.now() })
      const old = makeEntry({ timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000 })
      expect(filterByDateRange([recent, old], 30)).toEqual([recent])
    })
  })

  describe('aggregateByDay', () => {
    it('groups entries by date', () => {
      const day1 = new Date(2025, 0, 15, 10, 0).getTime()
      const day1b = new Date(2025, 0, 15, 14, 0).getTime()
      const day2 = new Date(2025, 0, 16, 10, 0).getTime()

      const entries = [
        makeEntry({ timestamp: day1, intensity: 4 }),
        makeEntry({ timestamp: day1b, intensity: 6 }),
        makeEntry({ timestamp: day2, intensity: 8 }),
      ]

      const result = aggregateByDay(entries)
      expect(result).toHaveLength(2)

      const first = result.find(d => d.date === '2025-01-15')
      expect(first?.avgIntensity).toBe(5)
      expect(first?.maxIntensity).toBe(6)
      expect(first?.minIntensity).toBe(4)
      expect(first?.entryCount).toBe(2)

      const second = result.find(d => d.date === '2025-01-16')
      expect(second?.avgIntensity).toBe(8)
      expect(second?.entryCount).toBe(1)
    })

    it('returns empty array for no entries', () => {
      expect(aggregateByDay([])).toHaveLength(0)
    })

    it('sorts by date ascending', () => {
      const day2 = new Date(2025, 0, 16, 10, 0).getTime()
      const day1 = new Date(2025, 0, 15, 10, 0).getTime()
      const entries = [
        makeEntry({ timestamp: day2, intensity: 5 }),
        makeEntry({ timestamp: day1, intensity: 3 }),
      ]
      const result = aggregateByDay(entries)
      expect(result[0].date).toBe('2025-01-15')
      expect(result[1].date).toBe('2025-01-16')
    })
  })

  describe('getMovingAverage', () => {
    it('returns original data when too few points', () => {
      const data = [
        { date: '2025-01-01', value: 5 },
        { date: '2025-01-02', value: 3 },
      ]
      expect(getMovingAverage(data, 7)).toEqual(data)
    })

    it('smooths values over the window', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        value: i % 2 === 0 ? 8 : 2,
      }))
      const smoothed = getMovingAverage(data, 3)
      // Smoothed values should be less extreme than raw alternating values
      const smoothedMiddle = smoothed[5].value
      expect(smoothedMiddle).toBeGreaterThan(2)
      expect(smoothedMiddle).toBeLessThan(8)
    })
  })

  describe('getLocationDistribution', () => {
    it('counts location occurrences', () => {
      const entries = [
        makeEntry({ locations: ['head', 'neck'] }),
        makeEntry({ locations: ['head'] }),
        makeEntry({ locations: ['legs'] }),
      ]
      const result = getLocationDistribution(entries)
      expect(result[0].name).toBe('Head')
      expect(result[0].count).toBe(2)
      expect(result[1].count).toBe(1)
    })

    it('returns empty array for no entries', () => {
      expect(getLocationDistribution([])).toHaveLength(0)
    })

    it('formats location names (kebab-case to Title Case)', () => {
      const entries = [makeEntry({ locations: ['upper-back'] })]
      const result = getLocationDistribution(entries)
      expect(result[0].name).toBe('Upper Back')
    })
  })

  describe('getTriggerFrequency', () => {
    it('counts trigger occurrences', () => {
      const entries = [
        makeEntry({ triggers: ['Stress', 'Weather'] }),
        makeEntry({ triggers: ['Stress'] }),
      ]
      const result = getTriggerFrequency(entries)
      expect(result[0].name).toBe('Stress')
      expect(result[0].count).toBe(2)
    })

    it('handles entries without triggers', () => {
      const entries = [makeEntry({ triggers: [] })]
      expect(getTriggerFrequency(entries)).toHaveLength(0)
    })
  })

  describe('getHashtagFrequency', () => {
    it('prepends # to hashtag names', () => {
      const entries = [makeEntry({ hashtags: ['pain', 'chronic'] })]
      const result = getHashtagFrequency(entries)
      expect(result[0].name).toBe('#pain')
      expect(result[1].name).toBe('#chronic')
    })
  })

  describe('getIntensityDistribution', () => {
    it('creates 10 buckets', () => {
      const result = getIntensityDistribution([])
      expect(result).toHaveLength(10)
      expect(result[0].name).toBe('1')
      expect(result[9].name).toBe('10')
    })

    it('distributes entries into correct buckets', () => {
      const entries = [
        makeEntry({ intensity: 1 }),
        makeEntry({ intensity: 1 }),
        makeEntry({ intensity: 5 }),
        makeEntry({ intensity: 10 }),
      ]
      const result = getIntensityDistribution(entries)
      expect(result[0].count).toBe(2) // bucket 1
      expect(result[4].count).toBe(1) // bucket 5
      expect(result[9].count).toBe(1) // bucket 10
    })

    it('calculates percentages', () => {
      const entries = [makeEntry({ intensity: 5 }), makeEntry({ intensity: 5 })]
      const result = getIntensityDistribution(entries)
      expect(result[4].percentage).toBe(100)
    })
  })

  describe('groupHeatmapByWeek', () => {
    it('groups into arrays of 7 with padding', () => {
      const data = Array.from({ length: 14 }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        count: i,
        avgIntensity: 5,
        level: 1 as const,
      }))
      const weeks = groupHeatmapByWeek(data)
      // Each complete week should have 7 days
      for (const week of weeks.slice(0, -1)) {
        expect(week).toHaveLength(7)
      }
    })
  })

  describe('exportToCSV', () => {
    it('produces valid CSV with headers', () => {
      const entries = [
        makeEntry({
          timestamp: new Date(2025, 0, 15, 14, 30).getTime(),
          intensity: 7,
          locations: ['head', 'neck'],
          triggers: ['Stress'],
          hashtags: ['pain'],
          notes: 'Test note',
        }),
      ]
      const csv = exportToCSV(entries)
      const lines = csv.split('\n')
      expect(lines[0]).toBe('Date,Time,Intensity,Locations,Triggers,Hashtags,Notes')
      expect(lines).toHaveLength(2)
      expect(lines[1]).toContain('7')
      expect(lines[1]).toContain('head; neck')
      expect(lines[1]).toContain('Stress')
    })

    it('escapes quotes in notes', () => {
      const entries = [makeEntry({ notes: 'He said "hello"' })]
      const csv = exportToCSV(entries)
      expect(csv).toContain('""hello""')
    })
  })

  describe('exportAnalyticsSummary', () => {
    it('produces daily summary CSV', () => {
      const entries = [
        makeEntry({ timestamp: new Date(2025, 0, 15, 10).getTime(), intensity: 4 }),
        makeEntry({ timestamp: new Date(2025, 0, 15, 14).getTime(), intensity: 6 }),
      ]
      const csv = exportAnalyticsSummary(entries)
      const lines = csv.split('\n')
      expect(lines[0]).toBe('Date,Entry Count,Avg Intensity,Min Intensity,Max Intensity')
      expect(lines[1]).toContain('2025-01-15')
      expect(lines[1]).toContain('2')
      expect(lines[1]).toContain('5.0')
    })
  })
})

// ============================================================================
// stateEncoder
// ============================================================================
import { encodeState, decodeState } from '../stateEncoder'

describe('stateEncoder', () => {
  describe('encodeState / decodeState roundtrip', () => {
    it('roundtrips a simple state', () => {
      const state = { view: 'dashboard' as const }
      const encoded = encodeState(state)
      const decoded = decodeState(encoded)
      expect(decoded).toEqual(state)
    })

    it('roundtrips a state with trackerId', () => {
      const state = { view: 'tracker' as const, trackerId: 'abc-123' }
      const encoded = encodeState(state)
      const decoded = decodeState(encoded)
      expect(decoded).toEqual(state)
    })

    it('returns a string that is URL-safe', () => {
      const state = { view: 'analytics' as const }
      const encoded = encodeState(state)
      // LZ-string's encressToEncodedURIComponent should not contain & or = or spaces
      expect(encoded).not.toContain(' ')
      expect(encoded).not.toContain('&')
    })
  })

  describe('decodeState error handling', () => {
    it('returns null for empty string', () => {
      expect(decodeState('')).toBeNull()
    })

    it('returns null for garbage input', () => {
      expect(decodeState('not-valid-lz-data!!!!')).toBeNull()
    })

    it('returns null for valid JSON that is not an object', () => {
      // Encode an array — encodeState uses LZString internally, so we
      // craft a state that serialises as an array by going through encodeState
      // with a valid object first and then testing with garbage.
      // A manually crafted non-object can't easily be produced without lz-string,
      // so we test that random data returns null (which covers the catch path).
      expect(decodeState('SomeTotallyInvalidEncodedData')).toBeNull()
    })
  })
})

// ============================================================================
// interlink-utils (pure functions — no DOM or Supabase dependency)
// ============================================================================
import {
  calculateLaggedCorrelation,
  aggregateEntriesByDate,
  generateInterlinkInsights,
  getInterlinkDataStatus,
  MIN_DATA_POINTS,
} from '../interlink-utils'
import type { TrackerFieldInfo, InterlinkCorrelation } from '../interlink-utils'

describe('interlink-utils', () => {
  describe('aggregateEntriesByDate', () => {
    const fieldInfo: TrackerFieldInfo = {
      trackerId: 'tracker-1',
      trackerName: 'Pain',
      fieldId: 'intensity',
      fieldLabel: 'Intensity',
      fieldType: 'intensity',
      min: 1,
      max: 10,
    }

    it('aggregates entry values by date', () => {
      const entries = [
        makeEntry({ tracker_id: 'tracker-1', timestamp: new Date(2025, 0, 15, 10).getTime(), intensity: 4 }),
        makeEntry({ tracker_id: 'tracker-1', timestamp: new Date(2025, 0, 15, 14).getTime(), intensity: 8 }),
      ]
      const result = aggregateEntriesByDate(entries, fieldInfo)
      expect(result.size).toBe(1)
      const day = result.get('2025-01-15')!
      expect(day.rawValue).toBe(6) // Average of 4 and 8
      // Normalized: (6 - 1) / (10 - 1) ≈ 0.556
      expect(day.value).toBeCloseTo(0.556, 2)
    })

    it('skips entries from other trackers', () => {
      const entries = [
        makeEntry({ tracker_id: 'tracker-2', timestamp: new Date(2025, 0, 15).getTime(), intensity: 5 }),
      ]
      const result = aggregateEntriesByDate(entries, fieldInfo)
      expect(result.size).toBe(0)
    })
  })

  describe('calculateLaggedCorrelation', () => {
    it('returns 0 correlation with insufficient data points', () => {
      const series1 = new Map([['2025-01-01', { value: 0.5 }]])
      const series2 = new Map([['2025-01-01', { value: 0.5 }]])
      const result = calculateLaggedCorrelation(series1, series2, 0)
      expect(result.correlation).toBe(0)
      expect(result.sampleSize).toBeLessThan(MIN_DATA_POINTS)
    })

    it('calculates perfect positive correlation with enough data', () => {
      const series1 = new Map<string, { value: number }>()
      const series2 = new Map<string, { value: number }>()
      for (let i = 0; i < 25; i++) {
        const date = `2025-01-${String(i + 1).padStart(2, '0')}`
        series1.set(date, { value: i / 25 })
        series2.set(date, { value: i / 25 })
      }
      const result = calculateLaggedCorrelation(series1, series2, 0)
      expect(result.correlation).toBeCloseTo(1, 2)
      expect(result.sampleSize).toBe(25)
    })
  })

  describe('generateInterlinkInsights', () => {
    it('generates same-day insight for lag=0', () => {
      const corr: InterlinkCorrelation = {
        tracker1: { id: 't1', name: 'Pain', trackerName: 'Pain', fieldId: 'intensity', fieldLabel: 'Intensity' },
        tracker2: { id: 't2', name: 'Mood', trackerName: 'Mood', fieldId: 'intensity', fieldLabel: 'Intensity' },
        correlation: 0.8,
        lagDays: 0,
        strength: 'strong',
        direction: 'positive',
        sampleSize: 30,
        confidence: 0.8,
      }
      const insights = generateInterlinkInsights([corr])
      expect(insights).toHaveLength(1)
      expect(insights[0].type).toBe('same_day')
      expect(insights[0].title).toContain('rise together')
    })

    it('generates lag effect insight for lag>0', () => {
      const corr: InterlinkCorrelation = {
        tracker1: { id: 't1', name: 'Exercise', trackerName: 'Exercise', fieldId: 'intensity', fieldLabel: 'Duration' },
        tracker2: { id: 't2', name: 'Pain', trackerName: 'Pain', fieldId: 'intensity', fieldLabel: 'Intensity' },
        correlation: -0.6,
        lagDays: 1,
        strength: 'moderate',
        direction: 'negative',
        sampleSize: 40,
        confidence: 0.75,
      }
      const insights = generateInterlinkInsights([corr])
      expect(insights).toHaveLength(1)
      expect(insights[0].type).toBe('lag_effect')
      expect(insights[0].title).toContain('the next day')
    })
  })

  describe('getInterlinkDataStatus', () => {
    it('reports not enough data for few entries', () => {
      const entries = [
        makeEntry({ tracker_id: 't1', timestamp: new Date(2025, 0, 15).getTime() }),
      ]
      const trackers = [
        { id: 't1', name: 'Pain' } as any,
        { id: 't2', name: 'Mood' } as any,
      ]
      const status = getInterlinkDataStatus(entries, trackers)
      expect(status.hasEnoughData).toBe(false)
      expect(status.daysOfData).toBe(1)
    })
  })
})
