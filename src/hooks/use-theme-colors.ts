/**
 * Theme-Aware Colors Hook
 * 
 * Provides reactive access to theme colors that update when the theme changes.
 * Uses getComputedStyle to read resolved CSS custom property values at runtime.
 * 
 * Usage:
 *   const { heatmapColors, chartColors } = useThemeAwareColors()
 */

import { useMemo, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

export interface HeatmapColors {
  0: string
  1: string
  2: string
  3: string
  4: string
}

export interface ChartColors {
  primary: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
}

/**
 * Read heatmap colors from CSS custom properties
 */
function getHeatmapColorsFromCSS(): HeatmapColors {
  const styles = getComputedStyle(document.documentElement)
  return {
    0: styles.getPropertyValue('--chart-heatmap-0').trim() || 'oklch(0.92 0.02 250)',
    1: styles.getPropertyValue('--chart-heatmap-1').trim() || 'oklch(0.82 0.10 250)',
    2: styles.getPropertyValue('--chart-heatmap-2').trim() || 'oklch(0.65 0.15 250)',
    3: styles.getPropertyValue('--chart-heatmap-3').trim() || 'oklch(0.55 0.18 250)',
    4: styles.getPropertyValue('--chart-heatmap-4').trim() || 'oklch(0.45 0.20 250)',
  }
}

/**
 * Read chart colors from CSS custom properties
 */
function getChartColorsFromCSS(): ChartColors {
  const styles = getComputedStyle(document.documentElement)
  return {
    primary: styles.getPropertyValue('--primary').trim() || 'oklch(0.65 0.12 250)',
    chart1: styles.getPropertyValue('--chart-1').trim() || 'oklch(0.65 0.15 250)',
    chart2: styles.getPropertyValue('--chart-2').trim() || 'oklch(0.65 0.15 200)',
    chart3: styles.getPropertyValue('--chart-3').trim() || 'oklch(0.65 0.15 150)',
    chart4: styles.getPropertyValue('--chart-4').trim() || 'oklch(0.65 0.15 100)',
    chart5: styles.getPropertyValue('--chart-5').trim() || 'oklch(0.65 0.15 50)',
  }
}

/**
 * Hook that provides theme-aware colors that update reactively when theme changes.
 * 
 * This hook:
 * 1. Waits for component mount (SSR safety)
 * 2. Reads CSS custom properties after the theme class is applied to DOM
 * 3. Re-reads colors when resolvedTheme changes
 * 
 * @returns Object containing heatmapColors and chartColors, plus mounted state
 */
export function useThemeAwareColors() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [colorVersion, setColorVersion] = useState(0)
  
  // Track mount state
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Force color re-read when theme changes
  // Use a small delay to ensure DOM has updated with new theme class
  useEffect(() => {
    if (!mounted) return
    
    // Small delay to ensure CSS has been applied after theme class change
    const timer = setTimeout(() => {
      setColorVersion(v => v + 1)
    }, 50)
    
    return () => clearTimeout(timer)
  }, [resolvedTheme, mounted])
  
  // Compute heatmap colors reactively
  const heatmapColors = useMemo<HeatmapColors>(() => {
    if (!mounted) {
      return { 0: '', 1: '', 2: '', 3: '', 4: '' }
    }
    // colorVersion forces re-computation when theme changes
    return getHeatmapColorsFromCSS()
  }, [mounted, colorVersion])
  
  // Compute chart colors reactively
  const chartColors = useMemo<ChartColors>(() => {
    if (!mounted) {
      return { 
        primary: '', 
        chart1: '', 
        chart2: '', 
        chart3: '', 
        chart4: '', 
        chart5: '' 
      }
    }
    // colorVersion forces re-computation when theme changes
    return getChartColorsFromCSS()
  }, [mounted, colorVersion])
  
  return {
    heatmapColors,
    chartColors,
    mounted,
    resolvedTheme,
  }
}

/**
 * Get a single heatmap color by level.
 * Convenience function for use with the hook.
 */
export function getHeatmapColorByLevel(
  heatmapColors: HeatmapColors, 
  level: 0 | 1 | 2 | 3 | 4
): string {
  return heatmapColors[level]
}
