/**
 * Dashboard Component
 * 
 * Home screen for returning users showing all their trackers.
 * Displays tracker cards with entry counts and quick access.
 */

import { useEffect, useState, useRef, useCallback, type FocusEvent, type TouchEvent } from 'react';
import { Activity, Plus, Loader2, Sparkles, Trash2, BarChart3, TrendingUp, TrendingDown, Minus, MoreVertical, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EditTrackerDialog } from '@/components/tracker/EditTrackerDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Tracker, TrackerPresetId } from '@/types/tracker';
import { TRACKER_PRESETS } from '@/types/tracker';
import type { GeneratedTrackerConfig, TrackerInterpretation } from '@/types/generated-config';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PainEntry } from '@/types/pain-entry';
import { db, tracker as trackerService, auth } from '@/runtime/appRuntime';
import { generateTrackerConfig, checkAmbiguity } from '@/services/configGenerationService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { debug } from '@/lib/logger';

interface TrackerStats {
  entryCount: number;
  lastEntryDate: number | null;
  /** Average intensity from last 7 days, null if no entries */
  recentAvgIntensity: number | null;
  /** Trend: 'up' if recent > older, 'down' if recent < older, 'stable' otherwise */
  trend: 'up' | 'down' | 'stable' | null;
}

interface DashboardProps {
  trackers: Tracker[];
  onTrackerSelect: (tracker: Tracker) => void;
  onTrackerCreated: (tracker: Tracker) => void;
  onTrackerDeleted: (trackerId: string) => void;
  onShowAnalytics?: () => void;
}

export function Dashboard({ 
  trackers, 
  onTrackerSelect,
  onTrackerCreated,
  onTrackerDeleted,
  onShowAnalytics,
}: Readonly<DashboardProps>) {
  const [stats, setStats] = useState<Record<string, TrackerStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [customAnswers, setCustomAnswers] = useState<string[]>([]);
  const [customNeedsDescription, setCustomNeedsDescription] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingPreset, setCreatingPreset] = useState<TrackerPresetId | null>(null);
  const [trackerToDelete, setTrackerToDelete] = useState<Tracker | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Disambiguation modal state for quick-create flow
  const [disambiguateOpen, setDisambiguateOpen] = useState(false);
  const [disambiguations, setDisambiguations] = useState<TrackerInterpretation[]>([]);
  const [disambiguationSelected, setDisambiguationSelected] = useState<TrackerInterpretation | null>(null);
  const [disambiguationUserDescription, setDisambiguationUserDescription] = useState('');
  const [disambiguationReason, setDisambiguationReason] = useState('');
  const [disambiguationQuestions, setDisambiguationQuestions] = useState<string[]>([]);
  const [disambiguationAnswers, setDisambiguationAnswers] = useState<string[]>([]);
  const [disambiguationNeedsDescription, setDisambiguationNeedsDescription] = useState(false);
  const [pendingDisambiguationOpen, setPendingDisambiguationOpen] = useState(false);
  const returnToCreateDialogRef = useRef(false);

  const disambiguationDescriptionReady =
    disambiguationUserDescription.trim().length > 0 ||
    (disambiguationQuestions.length > 0 &&
      disambiguationQuestions.every((_, index) => Boolean(disambiguationAnswers[index]?.trim())));
  const isMobile = useIsMobile();
  const [deleting, setDeleting] = useState(false);

  // Edit tracker fields state
  const [editFieldsDialogOpen, setEditFieldsDialogOpen] = useState(false);
  const [trackerToEdit, setTrackerToEdit] = useState<Tracker | null>(null);

  const handleMobileFieldFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!isMobile) return;
    const target = event.currentTarget;
    window.setTimeout(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 250);
  }, [isMobile]);
  const handleMobileScrollStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      active.blur();
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const root = document.documentElement;
    const setViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty('--mobile-vh', `${height}px`);
    };
    setViewportHeight();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', setViewportHeight);
    viewport?.addEventListener('scroll', setViewportHeight);
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    return () => {
      viewport?.removeEventListener('resize', setViewportHeight);
      viewport?.removeEventListener('scroll', setViewportHeight);
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
      root.style.removeProperty('--mobile-vh');
    };
  }, [isMobile]);

  useEffect(() => {
    if (!pendingDisambiguationOpen) return;
    if (isMobile) {
      setPendingDisambiguationOpen(false);
      return;
    }
    if (createDialogOpen) return;
    const timer = window.setTimeout(() => {
      setDisambiguateOpen(true);
      setPendingDisambiguationOpen(false);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [pendingDisambiguationOpen, createDialogOpen, isMobile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (createDialogOpen || disambiguateOpen || deleteDialogOpen) return;
    const hasModalContent = document.querySelector('[data-slot="dialog-content"], [data-slot="drawer-content"]');
    if (hasModalContent) return;
    document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="drawer-overlay"]').forEach((node) => {
      node.remove();
    });
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }, [createDialogOpen, disambiguateOpen, deleteDialogOpen]);
  
  // Touch visibility state for delete icons on mobile
  const [touchActive, setTouchActive] = useState(false);
  const touchFadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const TOUCH_FADE_DELAY = 3000; // 3 seconds before icons fade out
  
  // Handle touch events to show delete icons on mobile
  const handleTouchStart = useCallback(() => {
    // Clear any pending fade-out
    if (touchFadeTimeoutRef.current) {
      clearTimeout(touchFadeTimeoutRef.current);
      touchFadeTimeoutRef.current = null;
    }
    setTouchActive(true);
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    // Set delayed fade-out when touch ends
    touchFadeTimeoutRef.current = setTimeout(() => {
      setTouchActive(false);
      touchFadeTimeoutRef.current = null;
    }, TOUCH_FADE_DELAY);
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (touchFadeTimeoutRef.current) {
        clearTimeout(touchFadeTimeoutRef.current);
      }
    };
  }, []);

  // Test-only: expose a function to open the create dialog when running E2E locally
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('e2e=true')) {
      const handler = () => setCreateDialogOpen(true);

      // If an earlier script set the pending flag before the app mounted, honour that now
      try {
        if ((window as any).__pendingOpenCreateDialog) {
          setCreateDialogOpen(true);
          try { delete (window as any).__pendingOpenCreateDialog; } catch {};
        }
      } catch {}

      // Allow both direct helper invocation and a dispatched event for pre-mount helper
      (window as any).__openCreateDialog = handler;
      window.addEventListener('e2e-open-create-dialog', handler as EventListener);

      return () => {
        try { delete (window as any).__openCreateDialog; } catch {};
        try { window.removeEventListener('e2e-open-create-dialog', handler as EventListener); } catch {};
      };
    }
    return;
  }, [setCreateDialogOpen]);

  // Load entry counts for each tracker
  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      const newStats: Record<string, TrackerStats> = {};
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

      // Fetch stats for all trackers in parallel
      await Promise.all(
        trackers.map(async (tracker) => {
          try {
            const { data } = await db.select<PainEntry>('tracker_entries', {
              where: { tracker_id: tracker.id },
              orderBy: { column: 'timestamp', ascending: false },
            });

            const entries = data ?? [];
            
            // Calculate recent (last 7 days) vs older (7-14 days ago) average intensity
            const recentEntries = entries.filter(e => e.timestamp >= sevenDaysAgo);
            const olderEntries = entries.filter(e => e.timestamp >= fourteenDaysAgo && e.timestamp < sevenDaysAgo);
            
            const recentAvg = recentEntries.length > 0
              ? recentEntries.reduce((sum, e) => sum + e.pain_level, 0) / recentEntries.length
              : null;
            const olderAvg = olderEntries.length > 0
              ? olderEntries.reduce((sum, e) => sum + e.pain_level, 0) / olderEntries.length
              : null;
            
            // Determine trend
            let trend: 'up' | 'down' | 'stable' | null = null;
            if (recentAvg !== null && olderAvg !== null) {
              const diff = recentAvg - olderAvg;
              if (diff > 0.5) trend = 'up';
              else if (diff < -0.5) trend = 'down';
              else trend = 'stable';
            } else if (recentAvg !== null && recentEntries.length >= 2) {
              // If no older entries but we have recent data, show stable
              trend = 'stable';
            }

            newStats[tracker.id] = {
              entryCount: entries.length,
              lastEntryDate: entries[0]?.timestamp ?? null,
              recentAvgIntensity: recentAvg !== null ? Math.round(recentAvg * 10) / 10 : null,
              trend,
            };
          } catch {
            newStats[tracker.id] = { entryCount: 0, lastEntryDate: null, recentAvgIntensity: null, trend: null };
          }
        })
      );

      setStats(newStats);
      setLoadingStats(false);
    }

    if (trackers.length > 0) {
      loadStats();
    } else {
      setLoadingStats(false);
    }
  }, [trackers]);

  function formatLastEntry(timestamp: number | null): string {
    if (!timestamp) return 'No entries yet';
    try {
      return `Last: ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`;
    } catch {
      return 'No entries yet';
    }
  }

  async function handlePresetClick(presetId: TrackerPresetId) {
    const preset = TRACKER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setCreatingPreset(presetId);
    try {
      const result = await trackerService.createTracker({
        name: preset.name,
        type: 'preset',
        preset_id: presetId,
        icon: preset.icon,
        color: preset.color,
        is_default: false,
      });

      if (result.error) {
        toast.error('Failed to create tracker');
        return;
      }

      if (result.data) {
        toast.success(`${preset.name} tracker created!`);
        setCreateDialogOpen(false);
        onTrackerCreated(result.data);

        // Generate image asynchronously for preset trackers (don't block UI)
        try {
          const { generateTrackerImage, updateTrackerImage } = await import('@/services/imageGenerationService');
          const imageResult = await generateTrackerImage(preset.name, result.data.id);
          if (imageResult.success && imageResult.imageUrl && imageResult.modelName) {
            await updateTrackerImage(result.data.id, imageResult.imageUrl, imageResult.modelName);
            console.log(`Image generated for preset tracker: ${preset.name}`);
          }
        } catch (error) {
          console.warn('Failed to generate preset tracker image:', error);
          // Don't show error to user - image generation is non-critical
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCreatingPreset(null);
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = customName.trim();
    console.log('[Dashboard] handleCustomSubmit called with name:', name);
    if (!name) return;

    setCreating(true);

    // FIRST: check for ambiguity and present disambiguation UI if needed
    try {
      console.log('[Dashboard] Calling checkAmbiguity for', name);
      const ambiguity = await checkAmbiguity(name);
      console.log('[Dashboard] checkAmbiguity returned:', ambiguity);
      if (ambiguity.isAmbiguous && ambiguity.interpretations.length > 0) {
        setDisambiguations(ambiguity.interpretations);
        setDisambiguationSelected(null);
        setDisambiguationUserDescription('');
        setDisambiguationReason(ambiguity.reason || '');
        returnToCreateDialogRef.current = createDialogOpen;
        if (isMobile) {
          setDisambiguateOpen(true);
        } else {
          if (createDialogOpen) {
            setCreateDialogOpen(false);
          }
          setPendingDisambiguationOpen(true);
        }
        setCreating(false);
        // Bail out - user must confirm the interpretation
        return;
      }
    } catch (err) {
      console.warn('Ambiguity check failed (continuing):', err);
    }

    try {
      let generatedConfig: GeneratedTrackerConfig | null = null;
      const combinedDescription = buildCustomDescription();
      try {
        console.log('[Dashboard] Calling generateTrackerConfig for', name);
        const result = await generateTrackerConfig(name, combinedDescription || undefined);
        console.log('[Dashboard] generateTrackerConfig returned:', result);
        if (result.needsDescription) {
          setCustomNeedsDescription(true);
          setCustomQuestions(result.questions ?? []);
          setCustomAnswers(new Array((result.questions ?? []).length).fill(''));
          toast.info('Please add a brief description so we can tailor this tracker.');
          setCreating(false);
          return;
        }
        if (result.success && result.config) {
          generatedConfig = result.config;
        }
      } catch (err) {
        console.warn('[Dashboard] generateTrackerConfig failed', err);
      }
      
      if (!generatedConfig) {
        toast.error('Unable to generate a specific tracker. Please add more detail.');
        setCustomNeedsDescription(true);
        setCreating(false);
        return;
      }

      // Ensure we've validated the session with the server before attempting creation
      try {
        const validatedUser = await auth.waitForInitialValidation();
        if (!validatedUser) {
          console.error('[Dashboard] Session validation failed before create');
          toast.error('Session validation failed. Please sign in again.');
          setCreating(false);
          return;
        }
      } catch (err) {
        console.error('[Dashboard] waitForInitialValidation error:', err);
        toast.error('Unable to validate session. Please sign in again.');
        setCreating(false);
        return;
      }

      console.log('[Dashboard] Calling trackerService.createTracker for', name);
      const result = await trackerService.createTracker({
        name,
        type: 'custom',
        icon: 'activity',
        color: '#6366f1',
        is_default: false,
        generated_config: generatedConfig,
        user_description: combinedDescription || undefined,
      });

      console.log('[Dashboard] createTracker result:', result);

      if (result.error) {
        console.error('[Dashboard] create failed error:', result.error.message || result.error);
        // Surface server error messages where possible (e.g., ambiguous name blocked by RLS or server guard)
        toast.error(result.error.message || 'Failed to create tracker');
        return;
      }

      if (result.data) {
        toast.success(`${name} tracker created!`);
        setCreateDialogOpen(false);
        setCustomName('');
        setCustomDescription('');
        setCustomQuestions([]);
        setCustomAnswers([]);
        setCustomNeedsDescription(false);
        onTrackerCreated(result.data);

        // Generate image asynchronously (don't block UI)
        try {
          const { generateTrackerImage, updateTrackerImage } = await import('@/services/imageGenerationService');
          const imageResult = await generateTrackerImage(name, result.data.id);
          if (imageResult.success && imageResult.imageUrl && imageResult.modelName) {
            await updateTrackerImage(result.data.id, imageResult.imageUrl, imageResult.modelName);
            debug(`Image generated for tracker: ${name}`);
          }
        } catch (error) {
          console.warn('Failed to generate tracker image:', error);
          // Don't show error to user - image generation is non-critical
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTracker() {
    if (!trackerToDelete) return;
    
    setDeleting(true);
    try {
      const result = await trackerService.deleteTracker(trackerToDelete.id);
      
      if (result.error) {
        toast.error(`Failed to delete: ${result.error.message}`);
      } else {
        toast.success(`Deleted "${trackerToDelete.name}" tracker`);
        onTrackerDeleted(trackerToDelete.id);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setTrackerToDelete(null);
    }
  }

  function openDeleteDialog(e: React.MouseEvent, tracker: Tracker) {
    e.stopPropagation(); // Prevent card click
    setTrackerToDelete(tracker);
    setDeleteDialogOpen(true);
  }

  function buildCustomDescription() {
    const parts: string[] = [];
    if (customDescription.trim()) {
      parts.push(customDescription.trim());
    }
    customQuestions.forEach((question, index) => {
      const answer = customAnswers[index]?.trim();
      if (answer) {
        parts.push(`Q: ${question}\nA: ${answer}`);
      }
    });
    return parts.join('\n');
  }

  function buildDisambiguationDescription() {
    const parts: string[] = [];
    if (disambiguationUserDescription.trim()) {
      parts.push(disambiguationUserDescription.trim());
    }
    disambiguationQuestions.forEach((question, index) => {
      const answer = disambiguationAnswers[index]?.trim();
      if (answer) {
        parts.push(`Q: ${question}\nA: ${answer}`);
      }
    });
    return parts.join('\n');
  }

  function closeDisambiguation(restoreCreate: boolean) {
    setDisambiguateOpen(false);
    setDisambiguationSelected(null);
    setDisambiguations([]);
    setDisambiguationUserDescription('');
    setDisambiguationQuestions([]);
    setDisambiguationAnswers([]);
    setDisambiguationNeedsDescription(false);
    setDisambiguationReason('');
    if (restoreCreate && returnToCreateDialogRef.current) {
      setCreateDialogOpen(true);
    }
    returnToCreateDialogRef.current = false;
  }

  const disambiguationContent = (
    <div className="grid gap-3 py-4">
      {disambiguations.map((interpretation) => (
        <button
          key={interpretation.value}
          type="button"
          onClick={() => setDisambiguationSelected(interpretation)}
          className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${disambiguationSelected?.value === interpretation.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
        >
          <span className="font-medium">{interpretation.label}</span>
          <span className="text-sm text-muted-foreground">{interpretation.description}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => setDisambiguationSelected({ value: 'other', label: 'Something else', description: '' })}
        className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${disambiguationSelected?.value === 'other' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
      >
        <span className="font-medium">Something else</span>
        <span className="text-sm text-muted-foreground">I'll describe what I want to track</span>
      </button>

      {(disambiguationSelected?.value === 'other' || disambiguationNeedsDescription || disambiguationQuestions.length > 0) && (
        <div className="mt-2">
          {disambiguationQuestions.length > 0 && (
            <div className="grid gap-3 mb-3">
              {disambiguationQuestions.map((question, index) => (
                <div key={question} className="grid gap-2">
                  <p className="text-sm text-muted-foreground">{question}</p>
                  <Input
                    value={disambiguationAnswers[index] ?? ''}
                    onFocus={handleMobileFieldFocus}
                    onChange={(e) => {
                      const next = [...disambiguationAnswers];
                      next[index] = e.target.value;
                      setDisambiguationAnswers(next);
                    }}
                    placeholder="Your answer..."
                  />
                </div>
              ))}
            </div>
          )}
          <Label htmlFor="disambiguation-description">Describe what "{customName}" means to you...</Label>
          <Textarea
            id="disambiguation-description"
            placeholder={`Describe what "${customName}" means to you...`}
            value={disambiguationUserDescription}
            onFocus={handleMobileFieldFocus}
            onChange={(e) => setDisambiguationUserDescription(e.target.value)}
            rows={3}
          />
        </div>
      )}
    </div>
  );

  const disambiguationActions = (
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={() => closeDisambiguation(true)}>
        Cancel
      </Button>
      <Button
        onClick={async () => {
          if (!disambiguationSelected) {
            toast.error('Please select an interpretation');
            return;
          }

          if (disambiguationSelected.value === 'other' && !disambiguationUserDescription.trim()) {
            toast.error('Please provide a description');
            return;
          }

          setCreating(true);

          try {
            // Ensure session is validated with the server before creating (prevents silent RLS failures)
            try {
              const validatedUser = await auth.waitForInitialValidation();
              if (!validatedUser) {
                console.error('[Dashboard] Session validation failed before disambiguation create');
                toast.error('Session validation failed. Please sign in again.');
                return;
              }
            } catch (err) {
              console.error('[Dashboard] waitForInitialValidation error:', err);
              toast.error('Unable to validate session. Please sign in again.');
              return;
            }

            const interpretationString = disambiguationSelected.value === 'other'
              ? undefined
              : `${disambiguationSelected.label}: ${disambiguationSelected.description}`;
            const combinedDescription = buildDisambiguationDescription();

            const genResult = await generateTrackerConfig(customName, combinedDescription || undefined, interpretationString);
            if (genResult.needsDescription) {
              setDisambiguationNeedsDescription(true);
              setDisambiguationQuestions(genResult.questions ?? []);
              setDisambiguationAnswers(new Array((genResult.questions ?? []).length).fill(''));
              toast.info('Please add a brief description so we can tailor this tracker.');
              return;
            }

            const finalConfig = genResult.success && genResult.config ? genResult.config : null;
            if (!finalConfig) {
              toast.error('Unable to generate a specific tracker. Please add more detail.');
              setDisambiguationNeedsDescription(true);
              return;
            }

            const result = await trackerService.createTracker({
              name: customName,
              type: 'custom',
              icon: 'activity',
              color: '#6366f1',
              is_default: false,
              generated_config: finalConfig,
              confirmed_interpretation: disambiguationSelected.value === 'other' ? null : disambiguationSelected.value,
              user_description: combinedDescription || undefined,
            });

            if (result.error) {
              toast.error(result.error.message || 'Failed to create tracker');
              return;
            }

            if (result.data) {
              toast.success(`${customName} tracker created!`);
              closeDisambiguation(false);
              setCreateDialogOpen(false);
              setCustomName('');
              onTrackerCreated(result.data);
              try {
                const { generateTrackerImage, updateTrackerImage } = await import('@/services/imageGenerationService');
                const imageResult = await generateTrackerImage(customName, result.data.id);
                if (imageResult.success && imageResult.imageUrl && imageResult.modelName) {
                  await updateTrackerImage(result.data.id, imageResult.imageUrl, imageResult.modelName);
                }
              } catch (err) {
                console.warn('Failed to generate tracker image:', err);
              }
            }
          } catch (err) {
            console.error('Disambiguation creation failed', err);
            toast.error('Failed to create tracker');
          } finally {
            setCreating(false);
          }
        }}
        disabled={creating || !disambiguationSelected || (disambiguationNeedsDescription && !disambiguationDescriptionReady) || (disambiguationSelected?.value === 'other' && !disambiguationDescriptionReady)}
      >
        {creating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          'Create Tracker'
        )}
      </Button>
    </div>
  );

  const disambiguationDialog = (
    <Dialog
      open={disambiguateOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDisambiguation(true);
        }
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Clarify Your Tracker</DialogTitle>
          <DialogDescription>{disambiguationReason ? disambiguationReason : `"${customName}" could mean different things. Please select what you want to track:`}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {disambiguationContent}
        </div>
        <div className="pt-3 border-t">
          {disambiguationActions}
        </div>
      </DialogContent>
    </Dialog>
  );

  const createTrackerBody = (
    <>
      <div className="grid grid-cols-2 gap-2">
        {TRACKER_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1"
            disabled={creatingPreset !== null}
            onClick={() => handlePresetClick(preset.id)}
          >
            {creatingPreset === preset.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Activity className="w-5 h-5" style={{ color: preset.color }} />
            )}
            <span className="text-xs">{preset.name}</span>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or create custom</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onFocus={handleMobileFieldFocus}
          placeholder="e.g., Migraines, Diet, Gratitude..."
          disabled={creating}
          className="flex-1"
        />
        <Button type="submit" disabled={creating || !customName.trim()}>
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </Button>
      </form>

      {(customNeedsDescription || customQuestions.length > 0) && (
        <div className="grid gap-3">
          {customQuestions.length > 0 && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">Answer a few quick questions:</p>
              {customQuestions.map((question, index) => (
                <div key={question} className="grid gap-2">
                  <p className="text-sm text-muted-foreground">{question}</p>
                  <Input
                    value={customAnswers[index] ?? ''}
                    onFocus={handleMobileFieldFocus}
                    onChange={(e) => {
                      const next = [...customAnswers];
                      next[index] = e.target.value;
                      setCustomAnswers(next);
                    }}
                    placeholder="Your answer..."
                  />
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="custom-description">Add a brief description</Label>
            <Textarea
              id="custom-description"
              value={customDescription}
              onFocus={handleMobileFieldFocus}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="What exactly do you want to track? Any specific details?"
              rows={3}
            />
          </div>
        </div>
      )}
    </>
  );

  const createTrackerActions = (
    <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
      Cancel
    </Button>
  );

  const mobileModalView = isMobile
    ? (disambiguateOpen ? 'disambiguate' : createDialogOpen ? 'create' : null)
    : null;
  const mobileModalOpen = mobileModalView !== null;
  const mobileModalIsDisambiguation = mobileModalView === 'disambiguate';

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-foreground">
              Your Trackers
            </h2>
            <p className="text-muted-foreground mt-1">
              Select a tracker to view or add entries
            </p>
          </div>
          
          {/* View Your Progress button - only show when there are trackers with entries */}
          {trackers.length > 0 && onShowAnalytics && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onShowAnalytics}
              className="gap-2 self-center sm:self-auto"
            >
              <BarChart3 className="h-4 w-4" />
              View Your Progress
            </Button>
          )}
        </div>

        {/* Tracker cards grid */}
        <div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {trackers.map((tracker) => {
            const trackerStats = stats[tracker.id];
            const isLoading = loadingStats && !trackerStats;

            return (
              <Card
                key={tracker.id}
                className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md group"
                onClick={() => onTrackerSelect(tracker)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Icon/Image and name */}
                  <div className="flex items-start gap-3">
                    {tracker.image_url ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={tracker.image_url} 
                          alt={`${tracker.name} icon`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fall back to Activity icon if image fails to load
                            const img = e.currentTarget;
                            const parent = img.parentElement;
                            if (!parent) return;

                            // Clear parent and create fallback element safely
                            parent.innerHTML = '';

                            const fallbackDiv = document.createElement('div');
                            fallbackDiv.className = 'p-2 rounded-lg';
                            fallbackDiv.style.backgroundColor = `${tracker.color}15`;

                            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                            svg.setAttribute('width', '20');
                            svg.setAttribute('height', '20');
                            svg.setAttribute('viewBox', '0 0 24 24');
                            svg.setAttribute('fill', 'none');
                            svg.setAttribute('stroke', tracker.color);
                            svg.setAttribute('stroke-width', '2');
                            svg.setAttribute('stroke-linecap', 'round');
                            svg.setAttribute('stroke-linejoin', 'round');

                            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            path.setAttribute('d', 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2');

                            svg.appendChild(path);
                            fallbackDiv.appendChild(svg);
                            parent.appendChild(fallbackDiv);
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="p-2 rounded-lg transition-colors"
                        style={{ backgroundColor: `${tracker.color}15` }}
                      >
                        <Activity 
                          className="w-5 h-5" 
                          style={{ color: tracker.color }} 
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors"
                        title={tracker.name}
                      >
                        {tracker.name}
                      </h3>
                    </div>
                  </div>

                  {/* Stats and delete */}
                  <div className="flex items-end justify-between">
                    <div className="text-sm text-muted-foreground space-y-1">
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span>
                              {trackerStats?.entryCount ?? 0} {(trackerStats?.entryCount ?? 0) === 1 ? 'entry' : 'entries'}
                            </span>
                            {/* Trend indicator */}
                            {trackerStats?.trend && (
                              <span 
                                className={`flex items-center gap-0.5 text-xs ${
                                  trackerStats.trend === 'up' ? 'text-amber-500' :
                                  trackerStats.trend === 'down' ? 'text-green-500' :
                                  'text-muted-foreground'
                                }`}
                                title={
                                  trackerStats.trend === 'up' ? 'Intensity trending up' :
                                  trackerStats.trend === 'down' ? 'Intensity trending down' :
                                  'Intensity stable'
                                }
                              >
                                {trackerStats.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                                {trackerStats.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                                {trackerStats.trend === 'stable' && <Minus className="w-3 h-3" />}
                              </span>
                            )}
                          </div>
                          <p className="text-xs">
                            {formatLastEntry(trackerStats?.lastEntryDate ?? null)}
                          </p>
                        </>
                      )}
                    </div>
                    
                    {/* Actions menu - visible on hover (desktop) or touch (mobile) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={`p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all duration-300 focus:opacity-100 ${
                            touchActive
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                          aria-label={`${tracker.name} options`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {((tracker as any)?.schema_version === 2) && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrackerToEdit(tracker);
                              setEditFieldsDialogOpen(true);
                            }}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Edit Fields
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(e, tracker);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Add new tracker card */}
          <Card
            className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md border-dashed"
            onClick={() => setCreateDialogOpen(true)}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[120px] text-muted-foreground hover:text-primary transition-colors">
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">New Tracker</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Tracker Dialog */}
      {isMobile ? (
        <Dialog
          open={mobileModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              closeDisambiguation(false);
            }
          }}
        >
          <DialogContent
            className="top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 w-full max-w-none h-[100dvh] max-h-[100dvh] rounded-t-2xl rounded-b-none p-0 gap-0 flex flex-col overflow-hidden"
            style={{
              height: 'var(--mobile-vh, 100dvh)',
              maxHeight: 'var(--mobile-vh, 100dvh)',
            }}
          >
            <div className="bg-muted mx-auto mt-3 h-1.5 w-12 rounded-full" />
            {mobileModalIsDisambiguation ? (
              <>
                <DialogHeader className="px-4 pt-4 text-left">
                  <DialogTitle>Clarify Your Tracker</DialogTitle>
                  <DialogDescription>{disambiguationReason ? disambiguationReason : `"${customName}" could mean different things. Please select what you want to track:`}</DialogDescription>
                </DialogHeader>
                <div
                  className="flex-1 overflow-y-auto touch-pan-y overscroll-contain px-4 pb-4"
                  onTouchStart={handleMobileScrollStart}
                >
                  {disambiguationContent}
                </div>
                <DialogFooter className="flex-row justify-end gap-2 border-t px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  {disambiguationActions}
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader className="px-4 pt-4 text-left">
                  <DialogTitle>Create New Tracker</DialogTitle>
                  <DialogDescription>Track anything that matters to you.</DialogDescription>
                </DialogHeader>
                <div
                  className="flex-1 overflow-y-auto touch-pan-y overscroll-contain px-4 pb-4"
                  onTouchStart={handleMobileScrollStart}
                >
                  <div className="grid gap-4">
                    {createTrackerBody}
                  </div>
                </div>
                <DialogFooter className="flex-row justify-end gap-2 border-t px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  {createTrackerActions}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tracker</DialogTitle>
              <DialogDescription>
                Track anything that matters to you.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {createTrackerBody}
            </div>
            <DialogFooter>
              {createTrackerActions}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!isMobile && disambiguationDialog}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Delete "{trackerToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This action <strong>cannot be undone</strong>. This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>The "{trackerToDelete?.name}" tracker</li>
                <li>All entries associated with this tracker</li>
                <li>All notes, tags, and history data</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTracker}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Yes, Delete Forever
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tracker Fields Dialog */}
      <EditTrackerDialog
        tracker={trackerToEdit}
        open={editFieldsDialogOpen}
        onClose={() => {
          setEditFieldsDialogOpen(false);
          setTrackerToEdit(null);
        }}
        onSave={async (fields) => {
          if (!trackerToEdit) return;

          try {
            // Update tracker with new fields
            const updatedConfig = {
              ...trackerToEdit.generated_config,
              fields,
            } as any; // Cast to any since we're extending GeneratedTrackerConfig

            const result = await trackerService.updateTracker(trackerToEdit.id, {
              generated_config: updatedConfig,
            });

            if (result.data) {
              toast.success('Fields updated successfully');
              // Reload trackers to reflect changes
              const trackerResult = await trackerService.getTrackers();
              if (trackerResult.data) {
                // Update local state if needed - depends on parent component handling
              }
            } else if (result.error) {
              toast.error('Failed to update fields');
            }
          } catch (error) {
            console.error('Error updating tracker fields:', error);
            toast.error('Failed to update fields');
          }
        }}
      />
    </div>
  );
}
