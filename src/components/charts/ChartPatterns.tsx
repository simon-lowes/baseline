/**
 * ChartPatterns - SVG Pattern Definitions for Colorblind Accessibility
 *
 * Provides visual patterns that can be overlaid on chart elements to make them
 * distinguishable without relying solely on color. This helps users with:
 * - Red-green color blindness (deuteranopia, protanopia) - ~8% of males
 * - Blue-yellow color blindness (tritanopia) - ~0.01% of population
 * - Monochromacy (complete color blindness) - rare
 *
 * Usage: Include <ChartPatternDefs /> once in your app, then use fill="url(#pattern-id)"
 * in SVG elements or Recharts components.
 */

interface ChartPatternDefsProps {
  /** Base color for patterns - should match chart colors */
  baseColor?: string
}

/**
 * Renders hidden SVG containing all pattern definitions.
 * Include this component once at the app root level.
 */
export function ChartPatternDefs({ baseColor = 'currentColor' }: ChartPatternDefsProps) {
  return (
    <svg
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <defs>
        {/* ═══════════════════════════════════════════════════════════════
            HEATMAP PATTERNS (5 levels: 0-4)
            Increasing density represents higher values
        ═══════════════════════════════════════════════════════════════ */}

        {/* Level 0: Empty/None - sparse dots */}
        <pattern
          id="heatmap-pattern-0"
          patternUnits="userSpaceOnUse"
          width="12"
          height="12"
        >
          <rect width="12" height="12" fill="var(--chart-heatmap-0, #f0f0f0)" />
          <circle cx="6" cy="6" r="1" fill={baseColor} opacity="0.3" />
        </pattern>

        {/* Level 1: Light - sparse diagonal lines */}
        <pattern
          id="heatmap-pattern-1"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
        >
          <rect width="8" height="8" fill="var(--chart-heatmap-1, #d0d0d0)" />
          <path
            d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2"
            stroke={baseColor}
            strokeWidth="1"
            opacity="0.4"
          />
        </pattern>

        {/* Level 2: Medium - diagonal lines */}
        <pattern
          id="heatmap-pattern-2"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <rect width="6" height="6" fill="var(--chart-heatmap-2, #a0a0a0)" />
          <path
            d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2"
            stroke={baseColor}
            strokeWidth="1.5"
            opacity="0.5"
          />
        </pattern>

        {/* Level 3: Dense - crosshatch */}
        <pattern
          id="heatmap-pattern-3"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <rect width="6" height="6" fill="var(--chart-heatmap-3, #707070)" />
          <path
            d="M0,0 l6,6 M6,0 l-6,6"
            stroke={baseColor}
            strokeWidth="1"
            opacity="0.6"
          />
        </pattern>

        {/* Level 4: Maximum - dense diagonal */}
        <pattern
          id="heatmap-pattern-4"
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <rect width="4" height="4" fill="var(--chart-heatmap-4, #404040)" />
          <path
            d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2"
            stroke={baseColor}
            strokeWidth="1.5"
            opacity="0.7"
          />
        </pattern>

        {/* ═══════════════════════════════════════════════════════════════
            INTENSITY PATTERNS (3 levels: low, medium, high)
            Different line directions for easy distinction
        ═══════════════════════════════════════════════════════════════ */}

        {/* Low intensity: Horizontal lines (calm, stable) */}
        <pattern
          id="intensity-pattern-low"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
        >
          <rect width="8" height="8" fill="var(--chart-intensity-low, #4a90d9)" />
          <line
            x1="0" y1="4" x2="8" y2="4"
            stroke={baseColor}
            strokeWidth="1.5"
            opacity="0.4"
          />
        </pattern>

        {/* Medium intensity: 45-degree diagonal (movement) */}
        <pattern
          id="intensity-pattern-medium"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
        >
          <rect width="8" height="8" fill="var(--chart-intensity-medium, #d4a574)" />
          <path
            d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2"
            stroke={baseColor}
            strokeWidth="1.5"
            opacity="0.5"
          />
        </pattern>

        {/* High intensity: -45-degree dense diagonal (urgency) */}
        <pattern
          id="intensity-pattern-high"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <rect width="6" height="6" fill="var(--chart-intensity-high, #d97a4a)" />
          <path
            d="M7,1 l-2,-2 M6,6 l-6,-6 M-1,5 l2,2"
            stroke={baseColor}
            strokeWidth="2"
            opacity="0.6"
          />
        </pattern>

        {/* ═══════════════════════════════════════════════════════════════
            CATEGORICAL PATTERNS (for pie/donut charts)
            8 distinct patterns for multi-series data
        ═══════════════════════════════════════════════════════════════ */}

        {/* Category 1: Horizontal lines */}
        <pattern
          id="category-pattern-1"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <line x1="0" y1="3" x2="6" y2="3" stroke={baseColor} strokeWidth="1" opacity="0.5" />
        </pattern>

        {/* Category 2: Vertical lines */}
        <pattern
          id="category-pattern-2"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <line x1="3" y1="0" x2="3" y2="6" stroke={baseColor} strokeWidth="1" opacity="0.5" />
        </pattern>

        {/* Category 3: 45-degree diagonal */}
        <pattern
          id="category-pattern-3"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <path d="M0,6 l6,-6" stroke={baseColor} strokeWidth="1" opacity="0.5" />
        </pattern>

        {/* Category 4: -45-degree diagonal */}
        <pattern
          id="category-pattern-4"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <path d="M0,0 l6,6" stroke={baseColor} strokeWidth="1" opacity="0.5" />
        </pattern>

        {/* Category 5: Crosshatch */}
        <pattern
          id="category-pattern-5"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <path d="M0,6 l6,-6 M0,0 l6,6" stroke={baseColor} strokeWidth="1" opacity="0.4" />
        </pattern>

        {/* Category 6: Dots */}
        <pattern
          id="category-pattern-6"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <circle cx="3" cy="3" r="1.5" fill={baseColor} opacity="0.5" />
        </pattern>

        {/* Category 7: Grid */}
        <pattern
          id="category-pattern-7"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <line x1="0" y1="3" x2="6" y2="3" stroke={baseColor} strokeWidth="0.5" opacity="0.4" />
          <line x1="3" y1="0" x2="3" y2="6" stroke={baseColor} strokeWidth="0.5" opacity="0.4" />
        </pattern>

        {/* Category 8: Dense dots */}
        <pattern
          id="category-pattern-8"
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <circle cx="2" cy="2" r="1" fill={baseColor} opacity="0.5" />
        </pattern>
      </defs>
    </svg>
  )
}

/**
 * Get the pattern ID for a heatmap level (0-4)
 */
export function getHeatmapPatternId(level: number): string {
  const clampedLevel = Math.max(0, Math.min(4, Math.round(level)))
  return `heatmap-pattern-${clampedLevel}`
}

/**
 * Get the pattern ID for an intensity level
 */
export function getIntensityPatternId(level: 'low' | 'medium' | 'high'): string {
  return `intensity-pattern-${level}`
}

/**
 * Get the pattern ID for a category index (1-8)
 */
export function getCategoryPatternId(index: number): string {
  const wrappedIndex = ((index - 1) % 8) + 1
  return `category-pattern-${wrappedIndex}`
}

/**
 * Get the fill value for use in SVG/Recharts (url reference)
 */
export function getPatternFill(patternId: string): string {
  return `url(#${patternId})`
}
