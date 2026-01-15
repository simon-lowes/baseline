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
import { useEffect, useState, useRef } from 'react'
import { Palette, Check, Moon, Sun, Monitor } from 'lucide-react'
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
import { ColorPicker } from '@/components/ui/color-picker'
import { useCustomAccent } from '@/hooks/use-custom-accent'
import { useUserPreferences } from '@/hooks/use-user-preferences'

const ONBOARDING_KEY = 'baseline-theme-onboarded'
const THEME_MODE_KEY = 'baseline-theme-mode'

type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Get the system's preferred color scheme
 */
function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

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
 * DarkModeToggle - Cycles between light, dark, and system mode
 * - Sun icon: Light mode
 * - Moon icon: Dark mode
 * - Monitor icon: System mode (follows OS preference)
 */
export function DarkModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<ThemeMode>('light')
  const { updatePreferences, isAuthenticated } = useUserPreferences()

  const { color: currentColor, isDark } = parseTheme(theme)

  // Load mode from localStorage on mount
  useEffect(() => {
    const storedMode = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null
    if (storedMode && ['light', 'dark', 'system'].includes(storedMode)) {
      setMode(storedMode)
    } else {
      // Infer mode from current theme
      setMode(isDark ? 'dark' : 'light')
    }
    setMounted(true)
  }, [isDark])

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (!mounted || mode !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(buildTheme(currentColor, e.matches))
    }

    // Apply current system preference
    setTheme(buildTheme(currentColor, mediaQuery.matches))

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mode, mounted, currentColor, setTheme])

  const cycleMode = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system']
    const currentIndex = modes.indexOf(mode)
    const nextMode = modes[(currentIndex + 1) % modes.length]

    setMode(nextMode)
    localStorage.setItem(THEME_MODE_KEY, nextMode)

    // Apply the theme based on new mode
    if (nextMode === 'system') {
      const prefersDark = getSystemPrefersDark()
      setTheme(buildTheme(currentColor, prefersDark))
    } else {
      setTheme(buildTheme(currentColor, nextMode === 'dark'))
    }

    // Sync to server for authenticated users
    if (isAuthenticated) {
      updatePreferences({ themeMode: nextMode })
    }
  }

  const getIcon = () => {
    switch (mode) {
      case 'light':
        return <Sun className="h-4 w-4 transition-transform duration-200" />
      case 'dark':
        return <Moon className="h-4 w-4 transition-transform duration-200" />
      case 'system':
        return <Monitor className="h-4 w-4 transition-transform duration-200" />
    }
  }

  const getLabel = () => {
    switch (mode) {
      case 'light':
        return 'Light mode (click for dark)'
      case 'dark':
        return 'Dark mode (click for system)'
      case 'system':
        return 'System mode (click for light)'
    }
  }

  if (!mounted) {
    // Return placeholder to avoid layout shift
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme mode</span>
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
            onClick={cycleMode}
            aria-label={getLabel()}
          >
            {getIcon()}
            <span className="sr-only">{getLabel()}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {mode === 'light' && 'Light mode'}
          {mode === 'dark' && 'Dark mode'}
          {mode === 'system' && `System mode (${isDark ? 'dark' : 'light'})`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * ColorThemePicker - Dropdown for selecting color palette (Zinc, Nature, Rose)
 * Includes first-visit onboarding animation and server sync for logged-in users
 */
export function ColorThemePicker() {
  const { theme, setTheme } = useTheme()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { patternsEnabled, setPatternsEnabled } = useAccessibility()
  const { customAccent, setCustomAccent, clearCustomAccent } = useCustomAccent()
  const {
    preferences,
    updatePreferences,
    isAuthenticated,
    isLoading: prefsLoading,
  } = useUserPreferences()

  // Track if we've applied server preferences
  const hasAppliedServerPrefs = useRef(false)

  const { color: currentColor, isDark } = parseTheme(theme)

  // Apply server preferences when user logs in
  useEffect(() => {
    if (isAuthenticated && !prefsLoading && !hasAppliedServerPrefs.current) {
      hasAppliedServerPrefs.current = true

      // Apply theme mode from server (store in localStorage for DarkModeToggle)
      const serverMode = preferences.themeMode as ThemeMode
      localStorage.setItem(THEME_MODE_KEY, serverMode)

      // Apply theme color and mode from server
      let isDarkForTheme = preferences.themeMode === 'dark'
      if (preferences.themeMode === 'system') {
        isDarkForTheme = getSystemPrefersDark()
      }

      const serverTheme = buildTheme(
        preferences.themeColor as ColorTheme,
        isDarkForTheme
      )
      if (serverTheme !== theme) {
        setTheme(serverTheme)
      }

      // Apply custom accent from server
      if (preferences.customAccent && preferences.customAccent !== customAccent) {
        setCustomAccent(preferences.customAccent)
      }

      // Apply patterns from server
      if (preferences.patternsEnabled !== patternsEnabled) {
        setPatternsEnabled(preferences.patternsEnabled)
      }
    }
  }, [
    isAuthenticated,
    prefsLoading,
    preferences,
    theme,
    customAccent,
    patternsEnabled,
    setTheme,
    setCustomAccent,
    setPatternsEnabled,
  ])

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

    // Sync to server for authenticated users
    if (isAuthenticated) {
      updatePreferences({ themeColor: newColor })
    }
  }

  const handleCustomAccentChange = (oklch: string) => {
    setCustomAccent(oklch)

    // Sync to server for authenticated users
    if (isAuthenticated) {
      updatePreferences({ customAccent: oklch })
    }
  }

  const handleCustomAccentClear = () => {
    clearCustomAccent()

    // Sync to server for authenticated users
    if (isAuthenticated) {
      updatePreferences({ customAccent: null })
    }
  }

  const handlePatternsChange = (enabled: boolean) => {
    setPatternsEnabled(enabled)

    // Sync to server for authenticated users
    if (isAuthenticated) {
      updatePreferences({ patternsEnabled: enabled })
    }
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

          {/* Custom accent color */}
          <DropdownMenuSeparator className="my-2" />
          <div className="px-2 py-1.5">
            <Label className="text-xs font-medium block mb-2">
              Custom accent
              <span className="block text-[10px] text-muted-foreground font-normal">
                Override theme accent color
              </span>
            </Label>
            <ColorPicker
              value={customAccent}
              onChange={handleCustomAccentChange}
              onClear={handleCustomAccentClear}
            />
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
                onCheckedChange={handlePatternsChange}
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
