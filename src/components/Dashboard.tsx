/**
 * Dashboard Component
 * 
 * Home screen for returning users showing all their trackers.
 * Displays tracker cards with entry counts and quick access.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Activity, Plus, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
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
import { db, tracker as trackerService } from '@/runtime/appRuntime';
import { generateTrackerConfig, getGenericConfig, checkAmbiguity } from '@/services/configGenerationService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { debug } from '@/lib/logger';

interface TrackerStats {
  entryCount: number;
  lastEntryDate: number | null;
}

interface DashboardProps {
  trackers: Tracker[];
  onTrackerSelect: (tracker: Tracker) => void;
  onTrackerCreated: (tracker: Tracker) => void;
  onTrackerDeleted: (trackerId: string) => void;
}

export function Dashboard({ 
  trackers, 
  onTrackerSelect,
  onTrackerCreated,
  onTrackerDeleted,
}: Readonly<DashboardProps>) {
  const [stats, setStats] = useState<Record<string, TrackerStats>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customName, setCustomName] = useState('');
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
  const isMobile = useIsMobile();
  const [deleting, setDeleting] = useState(false);
  
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

      // Fetch stats for all trackers in parallel
      await Promise.all(
        trackers.map(async (tracker) => {
          try {
            const { data } = await db.select<PainEntry>('tracker_entries', {
              where: { tracker_id: tracker.id },
              orderBy: { column: 'timestamp', ascending: false },
            });

            newStats[tracker.id] = {
              entryCount: data?.length ?? 0,
              lastEntryDate: data?.[0]?.timestamp ?? null,
            };
          } catch {
            newStats[tracker.id] = { entryCount: 0, lastEntryDate: null };
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
        setDisambiguateOpen(true);
        setCreating(false);
        // Bail out - user must confirm the interpretation
        return;
      }
    } catch (err) {
      console.warn('Ambiguity check failed (continuing):', err);
    }

    try {
      let generatedConfig: GeneratedTrackerConfig | null = null;
      try {
        console.log('[Dashboard] Calling generateTrackerConfig for', name);
        const result = await generateTrackerConfig(name);
        console.log('[Dashboard] generateTrackerConfig returned:', result);
        if (result.success && result.config) {
          generatedConfig = result.config;
        }
      } catch (err) {
        console.warn('[Dashboard] generateTrackerConfig failed, falling back to generic', err);
        // Fall back to generic
      }
      
      if (!generatedConfig) {
        generatedConfig = getGenericConfig(name);
      }

      console.log('[Dashboard] Calling trackerService.createTracker for', name);
      const result = await trackerService.createTracker({
        name,
        type: 'custom',
        icon: 'activity',
        color: '#6366f1',
        is_default: false,
        generated_config: generatedConfig,
      });

      console.log('[Dashboard] createTracker result:', result);

      if (result.error) {
        toast.error('Failed to create tracker');
        return;
      }

      if (result.data) {
        toast.success(`${name} tracker created!`);
        setCreateDialogOpen(false);
        setCustomName('');
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

  // Render the disambiguation UI; on mobile use a bottom Drawer so users can swipe to dismiss
  function renderDisambiguation() {
    // Shared inner content as a fragment to avoid duplication
    const inner = (
      <>
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

          {disambiguationSelected?.value === 'other' && (
            <div className="mt-2">
              <Label htmlFor="disambiguation-description">Describe what "{customName}" means to you...</Label>
              <Textarea
                id="disambiguation-description"
                placeholder={`Describe what "${customName}" means to you...`}
                value={disambiguationUserDescription}
                onChange={(e) => setDisambiguationUserDescription(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => { setDisambiguateOpen(false); }}>
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
                const interpretationString = disambiguationSelected.value === 'other'
                  ? undefined
                  : `${disambiguationSelected.label}: ${disambiguationSelected.description}`;
                const description = disambiguationSelected.value === 'other' ? disambiguationUserDescription.trim() : undefined;

                const genResult = await generateTrackerConfig(customName, description, interpretationString);
                let finalConfig = genResult.success && genResult.config ? genResult.config : getGenericConfig(customName);

                const result = await trackerService.createTracker({
                  name: customName,
                  type: 'custom',
                  icon: 'activity',
                  color: '#6366f1',
                  is_default: false,
                  generated_config: finalConfig,
                  confirmed_interpretation: disambiguationSelected.value === 'other' ? null : disambiguationSelected.value,
                });

                if (result.error) {
                  toast.error('Failed to create tracker');
                  setCreating(false);
                  return;
                }

                if (result.data) {
                  toast.success(`${customName} tracker created!`);
                  setDisambiguateOpen(false);
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
              }

              setCreating(false);
            }}
            disabled={creating || !disambiguationSelected || (disambiguationSelected?.value === 'other' && !disambiguationUserDescription.trim())}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </div>
      </>
    );

    if (isMobile) {
      return (
        <Drawer open={disambiguateOpen} onOpenChange={(open) => {
          if (!open) {
            setDisambiguateOpen(false);
            setDisambiguationSelected(null);
            setDisambiguations([]);
            setDisambiguationUserDescription('');
          }
        }} direction="bottom">
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>Clarify Your Tracker</DrawerTitle>
              <DrawerDescription>{disambiguationReason ? disambiguationReason : `"${customName}" could mean different things. Please select what you want to track:`}</DrawerDescription>
            </DrawerHeader>
            <div
              className="overflow-y-auto touch-pan-y"
              onTouchStart={(e) => { (e.currentTarget as any).__startY = e.touches[0].clientY; }}
              onTouchMove={(e) => { (e.currentTarget as any).__lastY = e.touches[0].clientY; }}
              onTouchEnd={(e) => {
                const start = (e.currentTarget as any).__startY || 0;
                const last = (e.currentTarget as any).__lastY || start;
                const delta = last - start;
                if (delta > 60) {
                  setDisambiguateOpen(false);
                }
              }}
            >
              {inner}
            </div>
            <DrawerFooter>
              {/* Footer rendered inside inner; kept as no-op here */}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={disambiguateOpen} onOpenChange={(open) => {
        if (!open) {
          setDisambiguateOpen(false);
          setDisambiguationSelected(null);
          setDisambiguations([]);
          setDisambiguationUserDescription('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clarify Your Tracker</DialogTitle>
            <DialogDescription>{disambiguationReason ? disambiguationReason : `"${customName}" could mean different things. Please select what you want to track:`}</DialogDescription>
          </DialogHeader>
          {inner}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-semibold text-foreground">
            Your Trackers
          </h2>
          <p className="text-muted-foreground mt-1">
            Select a tracker to view or add entries
          </p>
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
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<div class="p-2 rounded-lg" style="background-color: ${tracker.color}15"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${tracker.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg></div>`;
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
                          <p>
                            {trackerStats?.entryCount ?? 0} {(trackerStats?.entryCount ?? 0) === 1 ? 'entry' : 'entries'}
                          </p>
                          <p className="text-xs">
                            {formatLastEntry(trackerStats?.lastEntryDate ?? null)}
                          </p>
                        </>
                      )}
                    </div>
                    
                    {/* Delete button - visible on hover (desktop) or touch (mobile) */}
                    <button
                      onClick={(e) => openDeleteDialog(e, tracker)}
                      className={`p-1.5 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all duration-300 focus:opacity-100 ${
                        touchActive 
                          ? 'opacity-100' 
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      aria-label={`Delete ${tracker.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Tracker</DialogTitle>
            <DialogDescription>
              Track anything that matters to you.
            </DialogDescription>
          </DialogHeader>

          {/* Preset options */}
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

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or create custom</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Custom tracker input */}
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
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

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderDisambiguation()}
      <Dialog open={disambiguateOpen} onOpenChange={(open) => {
        if (!open) {
          setDisambiguateOpen(false);
          setDisambiguationSelected(null);
          setDisambiguations([]);
          setDisambiguationUserDescription('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clarify Your Tracker</DialogTitle>
            <DialogDescription>
              {disambiguationReason ? disambiguationReason : `"${customName}" could mean different things. Please select what you want to track:`}
            </DialogDescription>
          </DialogHeader>

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

            {disambiguationSelected?.value === 'other' && (
              <div className="mt-2">
                <Label htmlFor="disambiguation-description">Describe what "{customName}" means to you...</Label>
                <Textarea
                  id="disambiguation-description"
                  placeholder={`Describe what "${customName}" means to you...`}
                  value={disambiguationUserDescription}
                  onChange={(e) => setDisambiguationUserDescription(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDisambiguateOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!disambiguationSelected) {
                  toast.error('Please select an interpretation');
                  return;
                }

                // If user selected 'other', ensure description provided
                if (disambiguationSelected.value === 'other' && !disambiguationUserDescription.trim()) {
                  toast.error('Please provide a description');
                  return;
                }

                setCreating(true);

                try {
                  const interpretationString = disambiguationSelected.value === 'other'
                    ? undefined
                    : `${disambiguationSelected.label}: ${disambiguationSelected.description}`;
                  const description = disambiguationSelected.value === 'other' ? disambiguationUserDescription.trim() : undefined;

                  const genResult = await generateTrackerConfig(customName, description, interpretationString);
                  let finalConfig = genResult.success && genResult.config ? genResult.config : getGenericConfig(customName);

                  const result = await trackerService.createTracker({
                    name: customName,
                    type: 'custom',
                    icon: 'activity',
                    color: '#6366f1',
                    is_default: false,
                    generated_config: finalConfig,
                    confirmed_interpretation: disambiguationSelected.value === 'other' ? null : disambiguationSelected.value,
                  });

                  if (result.error) {
                    toast.error('Failed to create tracker');
                    setCreating(false);
                    return;
                  }

                  if (result.data) {
                    toast.success(`${customName} tracker created!`);
                    setDisambiguateOpen(false);
                    setCreateDialogOpen(false);
                    setCustomName('');
                    onTrackerCreated(result.data);
                    // async image generation
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
                }

                setCreating(false);
              }}
              disabled={creating || !disambiguationSelected || (disambiguationSelected?.value === 'other' && !disambiguationUserDescription.trim())}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Tracker
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
