/**
 * TrackerSelector Component
 * 
 * Allows users to switch between their trackers or create new ones.
 * Shows the current tracker with a dropdown to switch.
 * Includes AI-powered context generation for custom trackers.
 */

import React, { useState, useEffect } from 'react';
import { Activity, Plus, ChevronDown, Check, Sparkles, Loader2, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { tracker as trackerService } from '@/runtime/appRuntime';
import type { Tracker } from '@/types/tracker';
import type { TrackerInterpretation } from '@/types/generated-config';
import { TRACKER_PRESETS } from '@/types/tracker';
import { generateTrackerConfig, getGenericConfig, checkAmbiguity } from '@/services/configGenerationService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { debug } from '@/lib/logger';
import { useFieldSuggestions } from '@/hooks/use-field-suggestions';
import { FieldSuggestionCard } from '@/components/fields/FieldSuggestionCard';
import { FieldList } from '@/components/fields/FieldList';
import { FieldConfigPanel } from '@/components/fields/FieldConfigPanel';
import type { TrackerField } from '@/types/tracker-fields';

interface TrackerSelectorProps {
  currentTracker: Tracker | null;
  onTrackerChange: (tracker: Tracker) => void;
  onTrackerDeleted?: (trackerId: string) => void;
  className?: string;
}

type GenerationStep = 'input' | 'checking' | 'disambiguate' | 'generating' | 'needs-description' | 'configure-fields' | 'error';

/**
 * Get dialog title based on generation step
 */
function getDialogTitle(step: GenerationStep): string {
  if (step === 'checking') {
    return 'Analyzing Tracker';
  }
  if (step === 'disambiguate') {
    return 'Clarify Your Tracker';
  }
  if (step === 'needs-description') {
    return 'Describe Your Tracker';
  }
  if (step === 'configure-fields') {
    return 'Configure Custom Fields';
  }
  if (step === 'error') {
    return 'Generation Issue';
  }
  return 'Create New Tracker';
}

/**
 * Get dialog description based on generation step
 */
function getDialogDescription(step: GenerationStep, trackerName: string): string {
  if (step === 'checking') {
    return 'Checking if we need more information...';
  }
  if (step === 'disambiguate') {
    return `"${trackerName}" could mean different things. Please select what you want to track:`;
  }
  if (step === 'needs-description') {
    return `We couldn't find a definition for "${trackerName}". For the best experience, please describe what you want to track.`;
  }
  if (step === 'configure-fields') {
    return `AI has suggested some useful fields for tracking "${trackerName}". Accept, customize, or skip each suggestion.`;
  }
  if (step === 'error') {
    return 'There was an issue generating the configuration. You can try again, provide a description, or use a generic setup.';
  }
  return "Track anything that matters to you. We'll use AI to set up contextual labels and suggestions.";
}

interface DialogFooterButtonsProps {
  generationStep: GenerationStep;
  creating: boolean;
  userDescription: string;
  newTrackerName: string;
  selectedInterpretation: TrackerInterpretation | null;
  descriptionReady: boolean;
  handleCreateWithDescription: () => void;
  handleCreateTracker: () => void;
  handleCreateWithInterpretation: () => void;
  handleCreateGeneric: () => void;
  resetCreateDialog: () => void;
}

/**
 * Render the appropriate dialog footer buttons based on generation step
 */
function DialogFooterButtons({
  generationStep,
  creating,
  userDescription,
  newTrackerName,
  selectedInterpretation,
  descriptionReady,
  handleCreateWithDescription,
  handleCreateTracker,
  handleCreateWithInterpretation,
  handleCreateGeneric,
  resetCreateDialog,
}: Readonly<DialogFooterButtonsProps>): React.ReactNode {
  if (generationStep === 'generating' || generationStep === 'checking') {
    return null;
  }

  if (generationStep === 'disambiguate') {
    return (
      <>
        <Button 
          variant="outline" 
          onClick={resetCreateDialog}
          disabled={creating}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCreateWithInterpretation} 
          disabled={creating || !selectedInterpretation}
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Tracker
            </>
          )}
        </Button>
      </>
    );
  }

  if (generationStep === 'needs-description') {
    return (
      <>
        <Button 
          onClick={handleCreateWithDescription} 
          disabled={creating || !descriptionReady}
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </>
          )}
        </Button>
      </>
    );
  }

  if (generationStep === 'configure-fields') {
    return (
      <>
        <Button variant="outline" onClick={resetCreateDialog}>
          Skip for Now
        </Button>
        <Button onClick={resetCreateDialog}>
          Done
        </Button>
      </>
    );
  }

  if (generationStep === 'error') {
    const handleRetry = userDescription.trim() ? handleCreateWithDescription : handleCreateTracker;
    return (
      <>
        <Button
          onClick={handleRetry}
          disabled={creating}
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Trying Again...
            </>
          ) : (
            'Try Again'
          )}
        </Button>
      </>
    );
  }

  // Default: 'input' step
  return (
    <>
      <Button variant="outline" onClick={resetCreateDialog}>
        Cancel
      </Button>
      <Button onClick={handleCreateTracker} disabled={creating || !newTrackerName.trim()}>
        {creating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Create with AI
          </>
        )}
      </Button>
    </>
  );
}

interface DialogContentAreaProps {
  generationStep: GenerationStep;
  generationStatus: string;
  generationError: string;
  newTrackerName: string;
  userDescription: string;
  clarifyingQuestions: string[];
  clarifyingAnswers: string[];
  setClarifyingAnswers: (value: string[]) => void;
  interpretations: TrackerInterpretation[];
  selectedInterpretation: TrackerInterpretation | null;
  setSelectedInterpretation: (value: TrackerInterpretation | null) => void;
  setUserDescription: (value: string) => void;
  setNewTrackerName: (value: string) => void;
  creating: boolean;
  handleCreateTracker: () => void;
  trackers: Tracker[];
  setCreating: (value: boolean) => void;
  setTrackers: React.Dispatch<React.SetStateAction<Tracker[]>>;
  onTrackerChange: (tracker: Tracker) => void;
  resetCreateDialog: () => void;
}

/**
 * Render the dialog content area based on generation step
 */
function DialogContentArea({
  generationStep,
  generationStatus,
  generationError,
  newTrackerName,
  userDescription,
  clarifyingQuestions,
  clarifyingAnswers,
  setClarifyingAnswers,
  interpretations,
  selectedInterpretation,
  setSelectedInterpretation,
  setUserDescription,
  setNewTrackerName,
  creating,
  handleCreateTracker,
  trackers,
  setCreating,
  setTrackers,
  onTrackerChange,
  resetCreateDialog,
}: Readonly<DialogContentAreaProps>): React.ReactNode {
  if (generationStep === 'generating' || generationStep === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">{generationStatus}</p>
        </div>
      </div>
    );
  }

  if (generationStep === 'disambiguate') {
    return (
      <div className="grid gap-3 py-4">
        {interpretations.map((interpretation) => (
          <button
            key={interpretation.value}
            type="button"
            onClick={() => setSelectedInterpretation(interpretation)}
            className={cn(
              "flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors",
              selectedInterpretation?.value === interpretation.value
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
          >
            <span className="font-medium">{interpretation.label}</span>
            <span className="text-sm text-muted-foreground">{interpretation.description}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedInterpretation({ value: 'other', label: 'Something else', description: '' })}
          className={cn(
            "flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors",
            selectedInterpretation?.value === 'other'
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
        >
          <span className="font-medium">Something else</span>
          <span className="text-sm text-muted-foreground">I'll describe what I want to track</span>
        </button>
        {selectedInterpretation?.value === 'other' && (
          <div className="mt-2">
            <Textarea
              placeholder={`Describe what "${newTrackerName}" means to you...`}
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              rows={2}
            />
          </div>
        )}
      </div>
    );
  }

  if (generationStep === 'needs-description') {
    return (
      <div className="grid gap-4 py-4">
        {clarifyingQuestions.length > 0 && (
          <div className="grid gap-3">
            <Label>Help us tailor this tracker</Label>
            {clarifyingQuestions.map((question, index) => (
              <div key={question} className="grid gap-2">
                <p className="text-sm text-muted-foreground">{question}</p>
                <Input
                  value={clarifyingAnswers[index] ?? ''}
                  onChange={(e) => {
                    const next = [...clarifyingAnswers];
                    next[index] = e.target.value;
                    setClarifyingAnswers(next);
                  }}
                  placeholder="Your answer..."
                />
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="tracker-description">
            What is "{newTrackerName}"?
          </Label>
          <Textarea
            id="tracker-description"
            placeholder="e.g., Tracking my blood pressure readings to monitor cardiovascular health..."
            value={userDescription}
            onChange={(e) => setUserDescription(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This helps us generate relevant categories, triggers, and suggestions for your tracker.
          </p>
        </div>
      </div>
    );
  }

  if (generationStep === 'configure-fields') {
    return (
      <div className="grid gap-4 py-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-center">
            Your tracker has been created! You can now add custom fields by clicking the menu (⋮) on your tracker card and selecting "Edit Fields".
          </p>
        </div>
      </div>
    );
  }

  if (generationStep === 'error') {
    return (
      <div className="grid gap-4 py-4">
        <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
          <p className="text-sm text-destructive">{generationError}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tracker-description-error">
            Provide a description (recommended)
          </Label>
          <Textarea
            id="tracker-description-error"
            placeholder="Describe what you want to track..."
            value={userDescription}
            onChange={(e) => setUserDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    );
  }

  // Default: 'input' step
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="tracker-name">Tracker Name</Label>
        <Input
          id="tracker-name"
          placeholder="e.g., Hypertension, Allergies, Gratitude"
          value={newTrackerName}
          onChange={(e) => setNewTrackerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !creating) {
              handleCreateTracker();
            }
          }}
        />
      </div>
      
      {/* Quick preset suggestions */}
      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">Or use a preset:</Label>
        <div className="flex flex-wrap gap-2">
          {TRACKER_PRESETS.filter(p => 
            !trackers.some(t => t.preset_id === p.id)
          ).slice(0, 4).map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={async () => {
                setCreating(true);
                const result = await trackerService.createTracker({
                  name: preset.name,
                  type: 'preset',
                  preset_id: preset.id,
                  icon: preset.icon,
                  color: preset.color,
                });
                if (result.data) {
                  toast.success(`Created "${preset.name}" tracker`);
                  setTrackers(prev => [...prev, result.data!]);
                  onTrackerChange(result.data);
                  resetCreateDialog();

                  // Generate image asynchronously for preset trackers (don't block UI)
                  try {
                    const { generateTrackerImage, updateTrackerImage } = await import('@/services/imageGenerationService');
                    const imageResult = await generateTrackerImage(preset.name, result.data.id);
                    if (imageResult.success && imageResult.imageUrl && imageResult.modelName) {
                      await updateTrackerImage(result.data.id, imageResult.imageUrl, imageResult.modelName);
                      console.log(`Image generated for preset tracker: ${preset.name}`);
                    } else {
                      toast.error('Could not generate a custom icon for this tracker');
                    }
                  } catch (error) {
                    console.warn('Failed to generate preset tracker image:', error);
                    toast.error('Could not generate a custom icon for this tracker');
                  }
                }
                setCreating(false);
              }}
              disabled={creating}
              style={{ borderColor: preset.color }}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrackerSelector({
  currentTracker,
  onTrackerChange,
  onTrackerDeleted,
  className
}: Readonly<TrackerSelectorProps>) {
  const isMobile = useIsMobile();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTrackerName, setNewTrackerName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // AI generation states
  const [generationStep, setGenerationStep] = useState<GenerationStep>('input');
  const [generationStatus, setGenerationStatus] = useState('');
  const [userDescription, setUserDescription] = useState('');
  const [generationError, setGenerationError] = useState('');
  
  // Disambiguation states
  const [interpretations, setInterpretations] = useState<TrackerInterpretation[]>([]);
  const [selectedInterpretation, setSelectedInterpretation] = useState<TrackerInterpretation | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<string[]>([]);
  
  // Delete tracker states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDrawerOpen, setDeleteDrawerOpen] = useState(false);
  const [trackerToDelete, setTrackerToDelete] = useState<Tracker | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Field configuration states
  const [newlyCreatedTracker, setNewlyCreatedTracker] = useState<Tracker | null>(null);
  const [editingField, setEditingField] = useState<TrackerField | null>(null);
  const [showFieldPanel, setShowFieldPanel] = useState(false);

  // Use field suggestions hook
  const fieldSuggestions = useFieldSuggestions(
    newlyCreatedTracker?.name || '',
    newlyCreatedTracker?.user_description || undefined
  );

  const descriptionReady =
    userDescription.trim().length > 0 ||
    (clarifyingQuestions.length > 0 &&
      clarifyingQuestions.every((_, index) => Boolean(clarifyingAnswers[index]?.trim())));

  // Load trackers on mount
  useEffect(() => {
    loadTrackers();
  }, []);

  async function loadTrackers() {
    setLoading(true);
    setLoadError(null);
    try {
      debug('[TrackerSelector] Loading trackers...');
      // Add timeout to prevent infinite loading
      const result = await Promise.race([
        trackerService.getTrackers(),
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 5000)
        ),
      ]);

      debug('[TrackerSelector] Result:', result);

      if (result.data) {
        debug('[TrackerSelector] Loaded', result.data.length, 'trackers');
        setTrackers(result.data);

        // Auto-select if no tracker is currently selected
        // Check currentTracker directly to avoid stale ref values
        if (!currentTracker && result.data.length > 0) {
          const defaultTracker = result.data.find(t => t.is_default) || result.data[0];
          onTrackerChange(defaultTracker);
        }
      } else if (result.error) {
        console.error('[TrackerSelector] Error loading trackers:', result.error);
        setLoadError(result.error.message || 'Failed to load trackers');
      }
    } catch (err) {
      console.error('Failed to load trackers:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load trackers');
    }
    setLoading(false);
  }

  async function handleCreateTracker() {
    debug('');
    debug('╔════════════════════════════════════════════════════════════╗');
    debug('║  [handleCreateTracker] STARTING NEW TRACKER CREATION       ║');
    debug('╚════════════════════════════════════════════════════════════╝');
    debug('[handleCreateTracker] Tracker name:', newTrackerName);

    setClarifyingQuestions([]);
    setClarifyingAnswers([]);
    
    if (!newTrackerName.trim()) {
      toast.error('Please enter a tracker name');
      return;
    }

    const trackerName = newTrackerName.trim();
    debug('[handleCreateTracker] Trimmed name:', trackerName);
    debug('[handleCreateTracker] Setting creating=true, step=checking');
    setCreating(true);
    setGenerationStep('checking');
    setGenerationStatus('Checking if we need more information...');

    try {
      debug('[handleCreateTracker] Calling checkAmbiguity...');
      // Step 1: Check for ambiguity
      const ambiguityResult = await checkAmbiguity(trackerName);
      debug('[handleCreateTracker] ✅ checkAmbiguity returned');
      debug('[handleCreateTracker] isAmbiguous:', ambiguityResult.isAmbiguous);
      debug('[handleCreateTracker] interpretations count:', ambiguityResult.interpretations.length);
      debug('[handleCreateTracker] reason:', ambiguityResult.reason);
      
      if (ambiguityResult.isAmbiguous && ambiguityResult.interpretations.length > 0) {
        // Term is ambiguous - ask user to choose
        debug('[handleCreateTracker] 🔀 AMBIGUOUS DETECTED - Setting up disambiguation UI');
        debug('[handleCreateTracker] interpretations:', JSON.stringify(ambiguityResult.interpretations, null, 2));
        setInterpretations(ambiguityResult.interpretations);
        setSelectedInterpretation(null);
        debug('[handleCreateTracker] Setting generationStep to "disambiguate"');
        setGenerationStep('disambiguate');
        debug('[handleCreateTracker] Setting creating=false');
        setCreating(false);
        debug('[handleCreateTracker] Exiting - user should now see disambiguation UI');
        toast.info(`"${trackerName}" has multiple meanings - please select which one you want to track`);
        return;
      }
      
      debug('[handleCreateTracker] Term is NOT ambiguous, proceeding with generation');
      // Not ambiguous - proceed with generation
      setGenerationStep('generating');
      setGenerationStatus('Looking up definition...');
      
      // Step 2: Try to generate config
      const genResult = await generateTrackerConfig(trackerName, userDescription || undefined);
      
      if (genResult.needsDescription) {
        // Word not found - ask for description
        setClarifyingQuestions(genResult.questions ?? []);
        setClarifyingAnswers(new Array((genResult.questions ?? []).length).fill(''));
        setGenerationStep('needs-description');
        setCreating(false);
        return;
      }
      
      if (!genResult.success) {
        // Generation failed - show error with option to continue
        setGenerationStep('error');
        setGenerationError(genResult.error || 'Failed to generate configuration');
        setCreating(false);
        return;
      }
      
      setGenerationStatus('Creating tracker...');
      
      // Step 2: Create tracker with generated config
      const result = await trackerService.createTracker({
        name: trackerName,
        type: 'custom',
        generated_config: genResult.config,
        user_description: userDescription || undefined,
      });

      if (result.error) {
        const msg = result.error.message || '';
        // If backend blocked creation due to ambiguity, present the disambiguation UI instead of failing silently
        if (msg.toLowerCase().includes('ambiguous') || msg.toLowerCase().includes('requires a confirmed interpretation')) {
          console.warn('[handleCreateTracker] Backend rejected creation due to ambiguity:', msg);
          // Fetch interpretations and show disambiguation UI
          try {
            const ambiguityResult = await checkAmbiguity(trackerName);
            if (ambiguityResult.isAmbiguous && ambiguityResult.interpretations.length > 0) {
              setInterpretations(ambiguityResult.interpretations);
              setSelectedInterpretation(null);
              setGenerationStep('disambiguate');
              setCreating(false);
              toast.info(`"${trackerName}" looks ambiguous - please confirm what you meant`);
              return;
            }
          } catch (err) {
            console.error('[handleCreateTracker] Failed to fetch ambiguity interpretations after backend block:', err);
          }

          toast.error(`Failed to create tracker: ${result.error.message}`);
        } else {
          toast.error(`Failed to create tracker: ${result.error.message}`);
        }
      } else if (result.data) {
        toast.success(`Created "${result.data.name}" tracker with AI-powered context`);
        setTrackers(prev => [...prev, result.data!]);
        setNewlyCreatedTracker(result.data);

        // Update tracker to schema version 2 for custom fields
        await trackerService.updateTracker(result.data.id, {
          generated_config: { ...result.data.generated_config, schema_version: 2 } as any,
        });

        // Fetch field suggestions from AI
        await fieldSuggestions.fetchSuggestions();

        // Transition to field configuration step instead of closing
        setGenerationStep('configure-fields');
        setCreating(false);

        // Generate image asynchronously (don't block UI)
        try {
          const { generateTrackerImage, updateTrackerImage } = await import('@/services/imageGenerationService');
          const imageResult = await generateTrackerImage(trackerName, result.data.id);
          if (imageResult.success && imageResult.imageUrl && imageResult.modelName) {
            await updateTrackerImage(result.data.id, imageResult.imageUrl, imageResult.modelName);
            debug(`Image generated for tracker: ${trackerName}`);
          } else {
            toast.error('Could not generate a custom icon for this tracker');
          }
        } catch (error) {
          console.warn('Failed to generate tracker image:', error);
          toast.error('Could not generate a custom icon for this tracker');
        }
        return; // Don't close dialog yet - let user configure fields
      }
    } catch (error) {
      console.error('[handleCreateTracker] ❌ EXCEPTION CAUGHT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[handleCreateTracker] Error message:', errorMessage);
      setGenerationStep('error');
      setGenerationError(errorMessage);
      toast.error(`Failed to create tracker: ${errorMessage}`, {
        description: 'Please try again or use a generic setup. Check the console for details.'
      });
    }
    
    console.log('[handleCreateTracker] Setting creating=false');
    setCreating(false);
    console.log('[handleCreateTracker] Function complete');
  }

  async function handleCreateWithDescription() {
    const combinedDescription = buildClarificationDescription();
    if (!combinedDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    setCreating(true);
    setGenerationStep('generating');
    setGenerationStatus('Generating contextual configuration...');
    
    try {
      const genResult = await generateTrackerConfig(newTrackerName.trim(), combinedDescription.trim());
      
      if (!genResult.success) {
        if (genResult.needsDescription) {
          setClarifyingQuestions(genResult.questions ?? []);
          setClarifyingAnswers(new Array((genResult.questions ?? []).length).fill(''));
          setGenerationStep('needs-description');
          setCreating(false);
          return;
        }
        setGenerationStep('error');
        setGenerationError(genResult.error || 'Failed to generate configuration');
        setCreating(false);
        return;
      }
      
      setGenerationStatus('Creating tracker...');
      
      const result = await trackerService.createTracker({
        name: newTrackerName.trim(),
        type: 'custom',
        generated_config: genResult.config,
        user_description: combinedDescription.trim(),
      });

      if (result.error) {
        toast.error(`Failed to create tracker: ${result.error.message}`);
      } else if (result.data) {
        toast.success(`Created "${result.data.name}" tracker with AI-powered context`);
        setTrackers(prev => [...prev, result.data!]);
        onTrackerChange(result.data);
        resetCreateDialog();
        
        // Generate image asynchronously (don't block UI)
        try {
          const { generateTrackerImage, updateTrackerImage } = await import('@/services/imageGenerationService');
          const imageResult = await generateTrackerImage(newTrackerName.trim(), result.data.id);
          if (imageResult.success && imageResult.imageUrl && imageResult.modelName) {
            await updateTrackerImage(result.data.id, imageResult.imageUrl, imageResult.modelName);
            debug(`Image generated for tracker: ${newTrackerName.trim()}`);
          } else {
            toast.error('Could not generate a custom icon for this tracker');
          }
        } catch (error) {
          console.warn('Failed to generate tracker image:', error);
          toast.error('Could not generate a custom icon for this tracker');
        }
      }
    } catch (error) {
      console.error('Create tracker error:', error);
      setGenerationStep('error');
      setGenerationError(error instanceof Error ? error.message : 'Unknown error');
    }
    
    setCreating(false);
  }

  async function handleCreateWithInterpretation() {
    debug('');
    debug('╔════════════════════════════════════════════════════════════╗');
    debug('║  [handleCreateWithInterpretation] USER SELECTED CHOICE     ║');
    debug('╚════════════════════════════════════════════════════════════╝');
    debug('[handleCreateWithInterpretation] selectedInterpretation:', selectedInterpretation);
    
    if (!selectedInterpretation) {
      toast.error('Please select an interpretation');
      return;
    }
    
    const trackerName = newTrackerName.trim();
    debug('[handleCreateWithInterpretation] trackerName:', trackerName);
    setClarifyingQuestions([]);
    setClarifyingAnswers([]);
    setCreating(true);
    setGenerationStep('generating');
    setGenerationStatus('Generating contextual configuration...');
    
    try {
      // If user selected "other", use their description
      // Otherwise, use the selected interpretation
      const interpretation = selectedInterpretation.value === 'other' 
        ? undefined 
        : `${selectedInterpretation.label}: ${selectedInterpretation.description}`;
      const description = selectedInterpretation.value === 'other' 
        ? userDescription.trim() || undefined
        : undefined;
      
      debug('[handleCreateWithInterpretation] Calling generateTrackerConfig with:');
      debug('[handleCreateWithInterpretation]   trackerName:', trackerName);
      debug('[handleCreateWithInterpretation]   description:', description);
      debug('[handleCreateWithInterpretation]   interpretation:', interpretation);
      
      const genResult = await generateTrackerConfig(trackerName, description, interpretation);
      debug('[handleCreateWithInterpretation] generateTrackerConfig returned:', genResult.success ? 'SUCCESS' : 'FAILURE');
      
      if (!genResult.success) {
        if (genResult.needsDescription) {
          // Persist the selection and prompt for description without closing the dialog
          setClarifyingQuestions(genResult.questions ?? []);
          setClarifyingAnswers(new Array((genResult.questions ?? []).length).fill(''));
          setGenerationStep('needs-description');
          setCreating(false);
          toast.info('Please add a brief description so we can tailor this tracker.');
          return;
        } else {
          setGenerationStep('error');
          setGenerationError(genResult.error || 'Failed to generate configuration');
          setCreating(false);
          return;
        }
      }
      
      setGenerationStatus('Creating tracker...');
      
      const result = await trackerService.createTracker({
        name: trackerName,
        type: 'custom',
        generated_config: genResult.config,
        user_description: description,
        confirmed_interpretation: selectedInterpretation?.value ?? null,
      });

      if (result.error) {
        toast.error(`Failed to create tracker: ${result.error.message}`);
      } else if (result.data) {
        toast.success(`Created "${result.data.name}" tracker with AI-powered context`);
        setTrackers(prev => [...prev, result.data!]);
        onTrackerChange(result.data);
        resetCreateDialog();
        
        // Generate image asynchronously (don't block UI)
        try {
          const { generateTrackerImage, updateTrackerImage } = await import('@/services/imageGenerationService');
          const imageResult = await generateTrackerImage(trackerName, result.data.id);
          if (imageResult.success && imageResult.imageUrl && imageResult.modelName) {
            await updateTrackerImage(result.data.id, imageResult.imageUrl, imageResult.modelName);
            debug(`Image generated for tracker: ${trackerName}`);
          } else {
            toast.error('Could not generate a custom icon for this tracker');
          }
        } catch (error) {
          console.warn('Failed to generate tracker image:', error);
          toast.error('Could not generate a custom icon for this tracker');
        }
      }
    } catch (error) {
      console.error('[handleCreateWithInterpretation] ❌ EXCEPTION:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGenerationStep('error');
      setGenerationError(errorMessage);
      toast.error(`Failed to create tracker: ${errorMessage}`, {
        description: 'Please try selecting a different option or try again.'
      });
    }
    
    setCreating(false);
  }

  async function handleCreateGeneric() {
    setCreating(true);
    
    const trackerName = newTrackerName.trim();
    const genericConfig = getGenericConfig(trackerName);
    
    const result = await trackerService.createTracker({
      name: trackerName,
      type: 'custom',
      generated_config: genericConfig,
    });

    if (result.error) {
      toast.error(`Failed to create tracker: ${result.error.message}`);
    } else if (result.data) {
      toast.success(`Created "${result.data.name}" tracker`);
      setTrackers(prev => [...prev, result.data!]);
      onTrackerChange(result.data);
      resetCreateDialog();
      
      // Generate image asynchronously (don't block UI)
      try {
        const { generateTrackerImage, updateTrackerImage } = await import('@/services/imageGenerationService');
        const imageResult = await generateTrackerImage(trackerName, result.data.id);
        if (imageResult.success && imageResult.imageUrl && imageResult.modelName) {
          await updateTrackerImage(result.data.id, imageResult.imageUrl, imageResult.modelName);
          console.log(`Image generated for tracker: ${trackerName}`);
        } else {
          toast.error('Could not generate a custom icon for this tracker');
        }
      } catch (error) {
        console.warn('Failed to generate tracker image:', error);
        toast.error('Could not generate a custom icon for this tracker');
      }
    }
    
    setCreating(false);
  }

  function buildClarificationDescription() {
    const parts: string[] = [];
    if (userDescription.trim()) {
      parts.push(userDescription.trim());
    }
    clarifyingQuestions.forEach((question, index) => {
      const answer = clarifyingAnswers[index]?.trim();
      if (answer) {
        parts.push(`Q: ${question}\nA: ${answer}`);
      }
    });
    return parts.join('\n');
  }

  function resetCreateDialog() {
    // If we have a newly created tracker, select it before closing
    if (newlyCreatedTracker) {
      onTrackerChange(newlyCreatedTracker);
    }

    setCreateDialogOpen(false);
    setNewTrackerName('');
    setUserDescription('');
    setGenerationStep('input');
    setGenerationStatus('');
    setGenerationError('');
    setInterpretations([]);
    setSelectedInterpretation(null);
    setClarifyingQuestions([]);
    setClarifyingAnswers([]);
    setNewlyCreatedTracker(null);
  }

  async function handleDeleteTracker() {
    if (!trackerToDelete) return;

    setDeleting(true);
    const result = await trackerService.deleteTracker(trackerToDelete.id);

    if (result.error) {
      toast.error(`Failed to delete: ${result.error.message}`);
    } else {
      toast.success(`Deleted "${trackerToDelete.name}" tracker`);
      setTrackers(prev => prev.filter(t => t.id !== trackerToDelete.id));

      // Notify parent to handle navigation and state update
      if (onTrackerDeleted) {
        onTrackerDeleted(trackerToDelete.id);
      }
    }

    setDeleting(false);
    setDeleteDialogOpen(false);
    setTrackerToDelete(null);
  }

  function getTrackerIcon(tracker: Tracker) {
    // Map icon names to Lucide icons - for now just use Activity
    // In future phases, we'll have a proper icon picker
    return <Activity className="h-4 w-4" style={{ color: tracker.color }} />;
  }

  if (loading) {
    return (
      <div className={cn("h-9 w-40 animate-pulse rounded-md bg-muted", className)} />
    );
  }

  if (loadError) {
    return (
      <div className={cn("flex items-center gap-2 h-9 px-3 text-sm text-destructive", className)}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="truncate">Failed to load trackers</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => loadTrackers()}
          aria-label="Retry loading trackers"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn("justify-between gap-2 w-full", className)}
          >
            {currentTracker ? (
              <>
                <span className="shrink-0">{getTrackerIcon(currentTracker)}</span>
                <span className="truncate flex-1 text-left">{currentTracker.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground truncate">Select tracker</span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          {trackers.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => onTrackerChange(t)}
              className="flex items-center gap-2"
            >
              {getTrackerIcon(t)}
              <span className="flex-1 truncate">{t.name}</span>
              {currentTracker?.id === t.id && (
                <Check className="h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
          
          {trackers.length > 0 && <DropdownMenuSeparator />}
          
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Tracker</span>
          </DropdownMenuItem>
          
          {/* Delete option - only show if more than one tracker */}
          {trackers.length > 1 && (
            isMobile ? (
              // On mobile, open a drawer instead of submenu
              <DropdownMenuItem
                onClick={() => setDeleteDrawerOpen(true)}
                className="flex items-center gap-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Tracker</span>
              </DropdownMenuItem>
            ) : (
              // On desktop, use submenu with proper width
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Tracker</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[200px]">
                  {trackers.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => {
                        setTrackerToDelete(t);
                        setDeleteDialogOpen(true);
                      }}
                      className="flex items-center gap-2 text-destructive"
                    >
                      {getTrackerIcon(t)}
                      <span className="truncate">{t.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Tracker Drawer (mobile only) */}
      <Drawer open={deleteDrawerOpen} onOpenChange={setDeleteDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Delete Tracker</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {trackers.map((t) => (
              <Button
                key={t.id}
                variant="ghost"
                onClick={() => {
                  setTrackerToDelete(t);
                  setDeleteDrawerOpen(false);
                  setDeleteDialogOpen(true);
                }}
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {getTrackerIcon(t)}
                <span>{t.name}</span>
              </Button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Create Tracker Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        // Prevent closing during critical async operations
        if (!open && (generationStep === 'checking' || generationStep === 'generating' || generationStep === 'disambiguate')) {
          console.log('[Dialog] Blocked close attempt during', generationStep, 'step');
          toast.info('Please wait while we process your request...');
          return;
        }
        if (!open) resetCreateDialog();
        else setCreateDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getDialogTitle(generationStep)}
            </DialogTitle>
            <DialogDescription>
              {getDialogDescription(generationStep, newTrackerName)}
            </DialogDescription>
          </DialogHeader>
          
          <DialogContentArea
            generationStep={generationStep}
            generationStatus={generationStatus}
            generationError={generationError}
            newTrackerName={newTrackerName}
            userDescription={userDescription}
            clarifyingQuestions={clarifyingQuestions}
            clarifyingAnswers={clarifyingAnswers}
            setClarifyingAnswers={setClarifyingAnswers}
            interpretations={interpretations}
            selectedInterpretation={selectedInterpretation}
            setSelectedInterpretation={setSelectedInterpretation}
            setUserDescription={setUserDescription}
            setNewTrackerName={setNewTrackerName}
            creating={creating}
            handleCreateTracker={handleCreateTracker}
            trackers={trackers}
            setCreating={setCreating}
            setTrackers={setTrackers}
            onTrackerChange={onTrackerChange}
            resetCreateDialog={resetCreateDialog}
          />
          
          <DialogFooter>
            <DialogFooterButtons
              generationStep={generationStep}
              creating={creating}
              userDescription={userDescription}
              newTrackerName={newTrackerName}
              selectedInterpretation={selectedInterpretation}
              descriptionReady={descriptionReady}
              handleCreateWithDescription={handleCreateWithDescription}
              handleCreateTracker={handleCreateTracker}
              handleCreateWithInterpretation={handleCreateWithInterpretation}
              handleCreateGeneric={handleCreateGeneric}
              resetCreateDialog={resetCreateDialog}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tracker Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (open) {
          return;
        }
        setDeleteDialogOpen(false);
        setTrackerToDelete(null);
      }}>
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
    </>
  );
}
