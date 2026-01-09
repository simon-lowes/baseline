/**
 * SwipeableTrackerCard Component
 *
 * A mobile-friendly swipeable wrapper for tracker cards.
 * Supports swipe-to-reveal actions and long-press for accessibility.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import { Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwipeableTrackerCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete: () => void;
  showEditAction?: boolean;
  trackerId: string;
  /** ID of the currently revealed card (controlled externally for single-reveal behavior) */
  revealedId: string | null;
  /** Callback when this card becomes revealed */
  onReveal: (id: string | null) => void;
}

const SWIPE_THRESHOLD = 80; // Pixels to trigger full reveal
const ACTION_WIDTH = 120; // Width of action buttons area

export function SwipeableTrackerCard({
  children,
  onEdit,
  onDelete,
  showEditAction = false,
  trackerId,
  revealedId,
  onReveal,
}: SwipeableTrackerCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const hapticTriggeredRef = useRef(false);

  const isRevealed = revealedId === trackerId;

  // Sync visual state with revealed state
  useEffect(() => {
    if (isRevealed) {
      setOffsetX(-ACTION_WIDTH);
    } else {
      setOffsetX(0);
    }
  }, [isRevealed]);

  // Trigger haptic feedback
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  // Clear long press on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  // Handle long press
  const handleLongPressStart = useCallback(() => {
    longPressTimeoutRef.current = setTimeout(() => {
      triggerHaptic();
      setShowContextMenu(true);
    }, 500);
  }, [triggerHaptic]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  // Gesture binding
  const bind = useDrag(
    ({ down, movement: [mx], direction: [dx], velocity: [vx], cancel, first, last }) => {
      // Cancel long press when dragging starts
      if (first) {
        handleLongPressEnd();
        setIsDragging(true);
        hapticTriggeredRef.current = false;
      }

      // Only allow horizontal swipes (left)
      if (mx > 10) {
        // Trying to swipe right - if already revealed, close it
        if (isRevealed && !down) {
          onReveal(null);
        }
        return;
      }

      // Calculate the target offset
      const baseOffset = isRevealed ? -ACTION_WIDTH : 0;
      let newOffset = baseOffset + mx;

      // Clamp the offset
      newOffset = Math.max(-ACTION_WIDTH - 20, Math.min(20, newOffset)); // Small overscroll allowed

      if (down) {
        // While dragging
        setOffsetX(newOffset);

        // Trigger haptic when crossing threshold (only once per gesture)
        if (!hapticTriggeredRef.current && newOffset < -SWIPE_THRESHOLD) {
          triggerHaptic();
          hapticTriggeredRef.current = true;
        }
      } else {
        // On release
        setIsDragging(false);

        // Check velocity for quick swipes
        const isQuickSwipe = Math.abs(vx) > 0.3 && dx < 0;

        // Determine final state
        if (isQuickSwipe || newOffset < -SWIPE_THRESHOLD) {
          // Reveal actions
          onReveal(trackerId);
          setOffsetX(-ACTION_WIDTH);
        } else if (newOffset > -SWIPE_THRESHOLD / 2 || dx > 0) {
          // Hide actions
          onReveal(null);
          setOffsetX(0);
        } else {
          // Snap back to current state
          setOffsetX(isRevealed ? -ACTION_WIDTH : 0);
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 10,
      pointer: { touch: true },
    }
  );

  // Handle tap outside to close
  useEffect(() => {
    if (!isRevealed) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onReveal(null);
      }
    };

    // Small delay to prevent immediate close on reveal
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isRevealed, onReveal]);

  // Handle context menu close
  const handleContextMenuClose = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Action buttons (behind the card) */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: ACTION_WIDTH }}
      >
        {showEditAction && (
          <Button
            variant="ghost"
            className="flex-1 h-full rounded-none bg-muted hover:bg-muted/80 flex flex-col items-center justify-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onReveal(null);
              onEdit?.();
            }}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Edit</span>
          </Button>
        )}
        <Button
          variant="ghost"
          className={cn(
            "flex-1 h-full rounded-none bg-destructive hover:bg-destructive/90 text-destructive-foreground flex flex-col items-center justify-center gap-1",
            !showEditAction && "rounded-r-xl"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onReveal(null);
            onDelete();
          }}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs">Delete</span>
        </Button>
      </div>

      {/* Swipeable card */}
      <div
        {...bind()}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
        className={cn(
          "relative touch-pan-y",
          isDragging ? "cursor-grabbing" : "cursor-pointer"
        )}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>

      {/* Context Menu (Long Press) */}
      {showContextMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            onClick={handleContextMenuClose}
            onTouchStart={handleContextMenuClose}
          />
          {/* Menu */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[150px]"
          >
            {showEditAction && (
              <button
                className="w-full px-4 py-3 flex items-center gap-2 hover:bg-accent text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenuClose();
                  onEdit?.();
                }}
              >
                <Settings className="h-4 w-4" />
                Edit Fields
              </button>
            )}
            <button
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-accent text-destructive text-left"
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenuClose();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
