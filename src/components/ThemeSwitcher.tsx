/**
 * ThemeSwitcher Component
 * 
 * Dropdown menu for switching between color themes (Zinc, Nature, Rose).
 * Persists selection in localStorage via next-themes.
 */

import { useTheme } from 'next-themes'
import { Palette, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const themes = [
  {
    id: 'zinc',
    name: 'Zinc',
    description: 'Neutral & Modern',
    preview: {
      neutral: 'bg-slate-200',
      accent: 'bg-blue-500',
    },
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Soft Greens',
    preview: {
      neutral: 'bg-[#e5e6e1]', // sage-3 approximation
      accent: 'bg-emerald-500',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Warm & Soft',
    preview: {
      neutral: 'bg-[#f5f4f0]', // sand-2 approximation
      accent: 'bg-pink-500',
    },
  },
] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Switch theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {/* Color preview dots */}
              <div className="flex -space-x-1">
                <div className={`w-4 h-4 rounded-full border border-border ${t.preview.neutral}`} />
                <div className={`w-4 h-4 rounded-full border border-border ${t.preview.accent}`} />
              </div>
              <div>
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.description}</div>
              </div>
            </div>
            {theme === t.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
