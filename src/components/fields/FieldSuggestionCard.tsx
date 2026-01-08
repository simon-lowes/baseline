import { TrackerField } from '@/types/tracker-fields'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Pencil, X } from 'lucide-react'

interface FieldSuggestion extends TrackerField {
  reasoning: string
}

interface FieldSuggestionCardProps {
  suggestion: FieldSuggestion
  onAccept: () => void
  onCustomize: () => void
  onSkip: () => void
}

export function FieldSuggestionCard({
  suggestion,
  onAccept,
  onCustomize,
  onSkip,
}: FieldSuggestionCardProps) {
  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      number_scale: 'Number Scale',
      single_select: 'Single Select',
      multi_select: 'Multiple Select',
      text: 'Text',
      toggle: 'Toggle',
    }
    return labels[type] || type
  }

  const getFieldPreview = () => {
    switch (suggestion.type) {
      case 'number_scale':
        const scaleConfig = suggestion.config as any
        return `Scale from ${scaleConfig.min} to ${scaleConfig.max}`
      case 'single_select':
      case 'multi_select':
        const selectConfig = suggestion.config as any
        const optionCount = selectConfig.options?.length || 0
        return `${optionCount} option${optionCount !== 1 ? 's' : ''}`
      case 'text':
        const textConfig = suggestion.config as any
        return textConfig.multiline ? 'Multiline text' : 'Single line text'
      case 'toggle':
        return 'Yes/No toggle'
      default:
        return ''
    }
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">{suggestion.label}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{getFieldTypeLabel(suggestion.type)}</Badge>
              {suggestion.required && (
                <Badge variant="outline" className="text-xs">
                  Required
                </Badge>
              )}
            </div>
          </div>
        </div>
        <CardDescription className="text-sm pt-2">
          {suggestion.reasoning}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">{getFieldPreview()}</div>
          <div className="flex gap-2">
            <Button onClick={onAccept} size="sm" className="flex-1">
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button onClick={onCustomize} size="sm" variant="outline" className="flex-1">
              <Pencil className="h-4 w-4 mr-1" />
              Customize
            </Button>
            <Button onClick={onSkip} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
