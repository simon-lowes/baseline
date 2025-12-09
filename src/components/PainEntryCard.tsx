import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Trash, NotePencil } from '@phosphor-icons/react'
import { PainEntry } from '@/types/pain-entry'
import { formatDate, getPainColor, getPainLabel } from '@/lib/pain-utils'
import { motion } from 'framer-motion'

interface PainEntryCardProps {
  entry: PainEntry
  onDelete: (id: string) => void
}

export function PainEntryCard({ entry, onDelete }: PainEntryCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    onDelete(entry.id)
    setShowDeleteConfirm(false)
    setShowDetails(false)
  }

  const intensityColor = getPainColor(entry.intensity)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="cursor-pointer hover:shadow-md transition-all border-l-4"
          style={{ borderLeftColor: intensityColor }}
          onClick={() => setShowDetails(true)}
        >
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-lg font-semibold"
                      style={{ color: intensityColor }}
                    >
                      {entry.intensity}/10
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {getPainLabel(entry.intensity)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(entry.timestamp)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {entry.locations.map(location => (
                  <Badge key={location} variant="secondary" className="capitalize">
                    {location.replace('-', ' ')}
                  </Badge>
                ))}
              </div>

              {entry.notes && (
                <p className="text-sm text-foreground/80 line-clamp-2">
                  {entry.notes}
                </p>
              )}

              {entry.triggers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.triggers.map(trigger => (
                    <Badge key={trigger} variant="outline" className="text-xs">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Pain Entry Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Intensity</p>
              <div className="flex items-center gap-2">
                <span
                  className="text-2xl font-semibold"
                  style={{ color: intensityColor }}
                >
                  {entry.intensity}/10
                </span>
                <span className="text-base text-muted-foreground">
                  ({getPainLabel(entry.intensity)})
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Date & Time</p>
              <p className="text-base">
                {new Date(entry.timestamp).toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Locations</p>
              <div className="flex flex-wrap gap-2">
                {entry.locations.map(location => (
                  <Badge key={location} variant="secondary" className="capitalize">
                    {location.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {entry.triggers.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Triggers</p>
                <div className="flex flex-wrap gap-2">
                  {entry.triggers.map(trigger => (
                    <Badge key={trigger} variant="outline">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {entry.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {entry.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-2"
            >
              <Trash size={16} />
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete this pain entry? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
