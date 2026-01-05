/**
 * Contrast Utilities
 * 
 * Functions for validating color contrast ratios according to WCAG 2.1 guidelines.
 * WCAG 1.4.11 Non-text Contrast requires 3:1 ratio for graphical objects.
 * 
 * @see https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html
 */

/**
 * Parse oklch color string to components
 */
export function parseOklch(color: string): { l: number; c: number; h: number } | null {
  const match = color.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!match) return null
  return {
    l: parseFloat(match[1]), // Lightness (0-1)
    c: parseFloat(match[2]), // Chroma (0-0.4 typically)
    h: parseFloat(match[3]), // Hue (0-360)
  }
}

/**
 * Approximate relative luminance from oklch lightness
 * 
 * OKLCH lightness is perceptually uniform but not exactly sRGB relative luminance.
 * This approximation is good enough for contrast checking purposes.
 * For precise WCAG calculations, colors should be converted to sRGB first.
 */
export function getRelativeLuminance(oklchL: number): number {
  // OKLCH L is roughly linear to perceived luminance
  // Apply a slight gamma adjustment for better accuracy
  return Math.pow(oklchL, 2.2)
}

/**
 * Calculate contrast ratio between two colors
 * 
 * @param l1 - Relative luminance of lighter color
 * @param l2 - Relative luminance of darker color
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if two oklch colors meet WCAG AA contrast requirements
 * 
 * @param color1 - First oklch color string
 * @param color2 - Second oklch color string
 * @param requirement - 'text' (4.5:1) or 'graphical' (3:1)
 * @returns Pass/fail result with contrast ratio
 */
export function checkContrast(
  color1: string,
  color2: string,
  requirement: 'text' | 'graphical' = 'graphical'
): { passes: boolean; ratio: number; required: number } {
  const c1 = parseOklch(color1)
  const c2 = parseOklch(color2)
  
  if (!c1 || !c2) {
    console.warn('Could not parse oklch colors:', { color1, color2 })
    return { passes: false, ratio: 0, required: requirement === 'text' ? 4.5 : 3 }
  }
  
  const l1 = getRelativeLuminance(c1.l)
  const l2 = getRelativeLuminance(c2.l)
  const ratio = getContrastRatio(l1, l2)
  const required = requirement === 'text' ? 4.5 : 3
  
  return {
    passes: ratio >= required,
    ratio: Math.round(ratio * 100) / 100,
    required,
  }
}

/**
 * Validate all chart color tokens for a given theme
 * 
 * Checks that chart colors have sufficient contrast against
 * their respective backgrounds (card background for charts).
 */
export function validateChartColors(): void {
  if (typeof window === 'undefined') return
  
  const root = document.documentElement
  const style = getComputedStyle(root)
  
  const getVar = (name: string) => style.getPropertyValue(name).trim()
  
  // Get background color (charts are typically on cards)
  const cardBg = getVar('--card') || getVar('--background')
  
  // Colors to validate
  const chartColors = {
    'chart-intensity-low': getVar('--chart-intensity-low'),
    'chart-intensity-medium': getVar('--chart-intensity-medium'),
    'chart-intensity-high': getVar('--chart-intensity-high'),
    'chart-heatmap-1': getVar('--chart-heatmap-1'),
    'chart-heatmap-2': getVar('--chart-heatmap-2'),
    'chart-heatmap-3': getVar('--chart-heatmap-3'),
    'chart-heatmap-4': getVar('--chart-heatmap-4'),
    'chart-bar': getVar('--chart-bar'),
    'chart-dot': getVar('--chart-dot'),
    'primary': getVar('--primary'),
  }
  
  console.group('🎨 Chart Color Contrast Validation')
  console.log('Background:', cardBg)
  
  let allPass = true
  
  Object.entries(chartColors).forEach(([name, value]) => {
    if (!value) {
      console.warn(`⚠️ ${name}: not defined`)
      return
    }
    
    const bgOklch = `oklch(${cardBg})`
    const colorOklch = `oklch(${value})`
    
    const result = checkContrast(colorOklch, bgOklch, 'graphical')
    
    if (result.passes) {
      console.log(`✅ ${name}: ${result.ratio}:1 (≥${result.required}:1)`)
    } else {
      console.error(`❌ ${name}: ${result.ratio}:1 (requires ${result.required}:1)`)
      allPass = false
    }
  })
  
  console.log(allPass ? '✅ All colors pass contrast requirements' : '❌ Some colors need attention')
  console.groupEnd()
}

/**
 * Run contrast validation on theme change
 * 
 * Call this from a useEffect in development to continuously monitor contrast.
 */
export function setupContrastMonitoring(): () => void {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return () => {}
  }
  
  const observer = new MutationObserver((mutations) => {
    const classChanged = mutations.some(
      m => m.type === 'attributes' && m.attributeName === 'class'
    )
    if (classChanged) {
      // Delay to allow CSS variables to update
      setTimeout(validateChartColors, 100)
    }
  })
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  
  // Initial validation
  validateChartColors()
  
  return () => observer.disconnect()
}
