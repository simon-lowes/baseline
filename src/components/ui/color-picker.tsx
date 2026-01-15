/**
 * Color Picker Component
 *
 * A simple color picker that uses the native browser color input
 * and converts between hex and OKLch color formats.
 */

import { useState, useEffect, useRef } from 'react'
import { hexToOklch, oklchToHex } from '@/lib/color-utils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ColorPickerProps {
  /** Current color value in OKLch format */
  value: string | null
  /** Called when color changes, with OKLch format string */
  onChange: (color: string) => void
  /** Called when user wants to clear/reset the custom color */
  onClear?: () => void
  /** Additional className for the container */
  className?: string
}

export function ColorPicker({
  value,
  onChange,
  onClear,
  className,
}: ColorPickerProps) {
  // Convert OKLch to hex for the native input
  const [hexValue, setHexValue] = useState('#6366f1')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync hex value when OKLch value changes
  useEffect(() => {
    if (value) {
      const hex = oklchToHex(value)
      if (hex) setHexValue(hex)
    }
  }, [value])

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value
    setHexValue(newHex)

    // Convert to OKLch and notify parent
    const oklch = hexToOklch(newHex)
    if (oklch) {
      onChange(oklch)
    }
  }

  const handleSwatchClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Color swatch button - clicking opens the native picker */}
      <button
        type="button"
        onClick={handleSwatchClick}
        className="w-8 h-8 rounded-md border-2 border-border shadow-sm cursor-pointer transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        style={{ backgroundColor: hexValue }}
        aria-label="Pick a custom accent color"
      />

      {/* Hidden native color input */}
      <input
        ref={inputRef}
        type="color"
        value={hexValue}
        onChange={handleColorChange}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Hex value display */}
      <span className="text-xs font-mono text-muted-foreground uppercase">
        {hexValue}
      </span>

      {/* Clear button */}
      {value && onClear && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClear}
          aria-label="Clear custom color"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
