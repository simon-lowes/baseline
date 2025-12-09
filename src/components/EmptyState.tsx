import { ClockCounterClockwise, Sparkle } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center min-h-[400px]"
    >
      <Card className="max-w-md border-none shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <ClockCounterClockwise size={48} className="text-primary" weight="duotone" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              Welcome to Your Pain Diary
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Start tracking your pain journey by logging your first entry. Understanding your patterns can help you and your healthcare provider make informed decisions.
            </p>
          </div>

          <div className="pt-4 space-y-3 text-sm text-muted-foreground text-left bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkle size={16} className="text-accent mt-0.5 flex-shrink-0" weight="fill" />
              <p>Track pain intensity, location, and triggers</p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkle size={16} className="text-accent mt-0.5 flex-shrink-0" weight="fill" />
              <p>Identify patterns over time</p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkle size={16} className="text-accent mt-0.5 flex-shrink-0" weight="fill" />
              <p>Share your history with doctors</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
