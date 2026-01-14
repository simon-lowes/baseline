/**
 * ThemeSwitcher Component
 * 
 * Consists of two parts:
 * 1. Dark/Light mode toggle button (immediately visible)
 * 2. Color theme dropdown (Zinc, Nature, Rose)
 * 
 * Best practice: Separate appearance mode (dark/light) from color palette choice.
 * Includes first-visit onboarding animation on the color picker.
 */

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Palette, Check, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAccessibility } from '@/contexts/AccessibilityContext'

const ONBOARDING_KEY = 'baseline-theme-onboarded'

const colorThemes = [
  {
    id: 'zinc',
    name: 'Zinc',
    description: 'Neutral & Modern',
    accent: 'bg-blue-500',
    accentStyle: 'background-color: oklch(0.55 0.18 250);',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Soft Greens',
    accent: 'bg-emerald-500',
    accentStyle: 'background-color: oklch(0.55 0.15 155);',
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Warm & Soft',
    accent: 'bg-pink-500',
    accentStyle: 'background-color: oklch(0.60 0.18 350);',
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Creative & Modern',
    accent: 'bg-violet-500',
    accentStyle: 'background-color: oklch(0.55 0.25 293);',
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Warm & Energetic',
    accent: 'bg-amber-500',
    accentStyle: 'background-color: oklch(0.77 0.19 84);',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    description: 'Professional & Bold',
    accent: 'bg-indigo-500',
    accentStyle: 'background-color: oklch(0.51 0.26 277);',
  },
  {
    id: 'cyan',
    name: 'Cyan',
    description: 'Fresh & Techy',
    accent: 'bg-cyan-500',
    accentStyle: 'background-color: oklch(0.72 0.14 215);',
  },
  {
    id: 'orange',
    name: 'Orange',
    description: 'Bold & Playful',
    accent: 'bg-orange-500',
    accentStyle: 'background-color: oklch(0.70 0.21 48);',
  },
  {
    id: 'plum',
    name: 'Plum',
    description: 'Elegant & Rich',
    accent: 'bg-purple-800',
    accentStyle: 'background-color: oklch(0.50 0.22 320);',
  },
  {
    id: 'highcontrast',
    name: 'High Contrast',
    description: 'Maximum Visibility',
    accent: 'bg-black',
    accentStyle: 'background: linear-gradient(135deg, #000 50%, #fff 50%);',
  },
] as const

type ColorTheme = typeof colorThemes[number]['id']

function parseTheme(theme: string | undefined): { color: ColorTheme; isDark: boolean } {
  if (!theme) return { color: 'zinc', isDark: false }
  const [color, mode] = theme.split('-') as [ColorTheme, 'light' | 'dark']
  return {
    color: color || 'zinc',
    isDark: mode === 'dark',
  }
}

function buildTheme(color: ColorTheme, isDark: boolean): string {
  return `${color}-${isDark ? 'dark' : 'light'}`
}

/**
 * DarkModeToggle - Simple button to toggle between light and dark mode
 * Shows Sun icon in dark mode (click to switch to light)
 * Shows Moon icon in light mode (click to switch to dark)
 */
export function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  const { color: currentColor, isDark } = parseTheme(theme)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleDarkMode = () => {
    setTheme(buildTheme(currentColor, !isDark))
  }

  if (!mounted) {
    // Return placeholder to avoid layout shift
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle dark mode</span>
      </Button>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={toggleDarkMode}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="h-4 w-4 transition-transform duration-200" />
            ) : (
              <Moon className="h-4 w-4 transition-transform duration-200" />
            )}
            <span className="sr-only">
              {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isDark ? 'Light mode' : 'Dark mode'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * ColorThemePicker - Dropdown for selecting color palette (Zinc, Nature, Rose)
 * Includes first-visit onboarding animation
 */
export function ColorThemePicker() {
  const { theme, setTheme } = useTheme()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { patternsEnabled, setPatternsEnabled } = useAccessibility()

  const { color: currentColor, isDark } = parseTheme(theme)

  // Check for first visit onboarding
  useEffect(() => {
    const hasOnboarded = localStorage.getItem(ONBOARDING_KEY)
    if (!hasOnboarded) {
      // Delay showing onboarding to let page load
      const timer = setTimeout(() => {
        setShowOnboarding(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && showOnboarding) {
      // Mark as onboarded when they first open the menu
      localStorage.setItem(ONBOARDING_KEY, 'true')
      setShowOnboarding(false)
    }
  }

  const handleColorChange = (newColor: ColorTheme) => {
    setTheme(buildTheme(newColor, isDark))
  }

  const triggerButton = (
    <Button 
      variant="ghost" 
      size="icon" 
      className={`h-9 w-9 relative ${showOnboarding ? 'animate-pulse' : ''}`}
    >
      <Palette className="h-4 w-4" />
      <span className="sr-only">Choose color theme</span>
      {/* Pulse ring for onboarding */}
      {showOnboarding && (
        <span className="absolute inset-0 rounded-md ring-2 ring-primary/50 animate-ping" />
      )}
    </Button>
  )

  return (
    <TooltipProvider>
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        {showOnboarding ? (
          <Tooltip open={showOnboarding} delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                {triggerButton}
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-medium">
              Pick your theme! 🎨
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>
            {triggerButton}
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="end" className="w-auto p-2">
          <DropdownMenuLabel className="pb-2">Color Theme</DropdownMenuLabel>
          <DropdownMenuSeparator className="mb-2" />
          {/* Mobile: scrollable list, Desktop: 3x3 grid */}
          <div className="md:hidden max-h-64 overflow-y-auto space-y-1">
            {colorThemes.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => handleColorChange(t.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: t.accentStyle.match(/oklch\([^)]+\)/)?.[0] || '' }}
                  />
                  <div>
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </div>
                </div>
                {currentColor === t.id && (
                  <Check className="h-4 w-4 text-primary ml-2" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
          {/* Desktop: grid layout */}
          <div className="hidden md:grid grid-cols-3 gap-1">
            {colorThemes.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => handleColorChange(t.id)}
                className="flex flex-col items-center gap-1.5 cursor-pointer p-3 rounded-md min-w-[80px]"
              >
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-border"
                    style={{ backgroundColor: t.accentStyle.match(/oklch\([^)]+\)/)?.[0] || '' }}
                  />
                  {currentColor === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium">{t.name}</span>
              </DropdownMenuItem>
            ))}
          </div>

          {/* Accessibility: Patterns toggle */}
          <DropdownMenuSeparator className="my-2" />
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="patterns-toggle"
                className="text-xs font-medium cursor-pointer"
              >
                Chart patterns
                <span className="block text-[10px] text-muted-foreground font-normal">
                  Colorblind friendly
                </span>
              </Label>
              <Switch
                id="patterns-toggle"
                checked={patternsEnabled}
                onCheckedChange={setPatternsEnabled}
                aria-label="Enable chart patterns for colorblind accessibility"
              />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}

/**
 * ThemeSwitcher - Combined component with both dark mode toggle and color picker
 * Use this for a complete theme control in a single location
 */
export function ThemeSwitcher() {
  return (
    <div className="flex items-center gap-1">
      <DarkModeToggle />
      <ColorThemePicker />
    </div>
  )
}
