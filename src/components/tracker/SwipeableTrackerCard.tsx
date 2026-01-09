/**
 * SwipeableTrackerCard Component
 *
 * A mobile-friendly swipeable wrapper for tracker cards.
 * Supports swipe-to-reveal actions and long-press for accessibility.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwipeableTrackerCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete: () => void;
  onTap: () => void;
  showEditAction?: boolean;
  trackerId: string;
  /** ID of the currently revealed card (controlled externally for single-reveal behavior) */
  revealedId: string | null;
  /** Callback when this card becomes revealed */
  onReveal: (id: string | null) => void;
}

const SWIPE_THRESHOLD = 60; // Pixels to trigger full reveal
const ACTION_WIDTH = 120; // Width of action buttons area
const TAP_THRESHOLD = 10; // Max movement for a tap

export function SwipeableTrackerCard({
  children,
  onEdit,
  onDelete,
  onTap,
  showEditAction = false,
  trackerId,
  revealedId,
  onReveal,
}: SwipeableTrackerCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Touch tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const startOffsetRef = useRef(0);

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

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    hasDraggedRef.current = false;
    startOffsetRef.current = offsetX;

    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      if (!hasDraggedRef.current) {
        triggerHaptic();
        setShowContextMenu(true);
      }
    }, 500);
  }, [offsetX, triggerHaptic]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // If vertical movement is greater, let the page scroll
    if (Math.abs(deltaY) > Math.abs(deltaX) && !hasDraggedRef.current) {
      return;
    }

    // Cancel long press once we start moving horizontally
    if (Math.abs(deltaX) > TAP_THRESHOLD) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      hasDraggedRef.current = true;
      setIsDragging(true);
    }

    if (hasDraggedRef.current) {
      // Calculate new offset
      let newOffset = startOffsetRef.current + deltaX;

      // Clamp: can't go more right than 0, can't go more left than -ACTION_WIDTH
      newOffset = Math.max(-ACTION_WIDTH - 20, Math.min(10, newOffset));

      setOffsetX(newOffset);
    }
  }, []);

  // Handle touch end
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Cancel long press
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    if (!touchStartRef.current) return;

    const wasDragging = hasDraggedRef.current;
    setIsDragging(false);

    if (wasDragging) {
      // Determine final state based on position
      if (offsetX < -SWIPE_THRESHOLD) {
        // Reveal actions
        onReveal(trackerId);
        setOffsetX(-ACTION_WIDTH);
        triggerHaptic();
      } else {
        // Hide actions
        onReveal(null);
        setOffsetX(0);
      }
    } else {
      // This was a tap
      const touchDuration = Date.now() - touchStartRef.current.time;

      if (touchDuration < 500 && !showContextMenu) {
        // Short tap - if revealed, close. Otherwise, navigate.
        if (isRevealed) {
          onReveal(null);
        } else {
          onTap();
        }
      }
    }

    touchStartRef.current = null;
  }, [offsetX, isRevealed, onReveal, trackerId, onTap, showContextMenu, triggerHaptic]);

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

      {/* Swipeable card wrapper with background to cover action buttons */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={cn(
          "relative bg-card",
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
