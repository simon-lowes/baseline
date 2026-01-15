import { db, auth, tracker as trackerService } from '@/runtime/appRuntime'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, List, Calendar, SignOut, TrendUp, Gear } from '@phosphor-icons/react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { v4 as uuidv4 } from 'uuid'

import { PainEntry, BODY_LOCATIONS } from '@/types/pain-entry'
import type { Tracker, TrackerPresetId } from '@/types/tracker'
import type { FieldValues } from '@/types/tracker-fields'
import { PainEntryForm } from '@/components/PainEntryForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PainEntryCard } from '@/components/PainEntryCard'
import { VirtualizedEntryList, SimpleEntryList } from '@/components/VirtualizedEntryList'
import { EmptyState } from '@/components/EmptyState'
import { AuthForm } from '@/components/AuthForm'
import { TrackerSelector } from '@/components/TrackerSelector'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { Dashboard } from '@/components/Dashboard'
import { filterEntriesByDateRange, filterEntriesByLocation } from '@/lib/pain-utils'
import { getTrackerConfig } from '@/types/tracker-config'
import type { AuthUser } from '@/ports/AuthPort'
import { AnalyticsDashboard } from '@/components/analytics'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { AccountSettings } from '@/components/AccountSettings'
import { PrivacyPolicy, TermsOfService } from '@/components/legal'
import { HelpCenter } from '@/components/help'

// Supabase auth hook
import { useSupabaseAuth, type UseAuthResult } from '@/hooks/useAuth'

// Offline support hooks
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { createSyncController, type SyncResult } from '@/services/syncService'

/** View states for the main app */
type AppView = 'welcome' | 'dashboard' | 'tracker' | 'analytics' | 'privacy' | 'terms' | 'help';

/**
 * Inner app content - receives auth state from wrapper
 */
interface AppContentProps {
  authState: UseAuthResult;
}

function AppContent({ authState }: AppContentProps) {
  const { user, isLoading: authLoading, signOut } = authState;

  const [entries, setEntries] = useState<PainEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [emailConfirmed, setEmailConfirmed] = useState(false)
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [currentTracker, setCurrentTracker] = useState<Tracker | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Multi-tracker and view state
  const [trackers, setTrackers] = useState<Tracker[]>([])
  const [trackersLoading, setTrackersLoading] = useState(true)
  const [currentView, setCurrentView] = useState<AppView>('dashboard')
  const [allEntries, setAllEntries] = useState<PainEntry[]>([]) // For analytics cross-tracker view
  const [analyticsTracker, setAnalyticsTracker] = useState<Tracker | null>(null) // Which tracker to show analytics for (null = all)

  // Offline support - network status and queue management
  const { isOnline, wasOffline } = useNetworkStatus()
  const {
    queue: offlineQueue,
    addToQueue,
    removeFromQueue,
    updateStatus: updateQueueStatus,
    getPendingEntries,
    clearSynced,
  } = useOfflineQueue()

  // Create sync controller (stable reference)
  const [syncController] = useState(() => createSyncController())

  // Handle auth events (email confirmation, password recovery)
  useEffect(() => {
    const { unsubscribe } = auth.onAuthStateChange((event, session) => {
      // Handle email confirmation - user just verified their email
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if this is from an email confirmation (URL has access_token hash)
        const hashParams = new URLSearchParams(globalThis.location.hash.substring(1))
        if (hashParams.get('access_token') || hashParams.get('type') === 'signup') {
          setEmailConfirmed(true)
          toast.success('Email confirmed! You are now signed in.')
          // Clean up the URL
          globalThis.history.replaceState(null, '', globalThis.location.pathname)
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        // Show reset password dialog when Supabase triggers recovery event
        setPasswordRecoveryOpen(true)
      } else if (event === 'SIGNED_OUT') {
        setEntries([])
        setEmailConfirmed(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Load all trackers when user is authenticated
  useEffect(() => {
    if (!user) {
      setLoading(false)
      setTrackersLoading(false)
      setTrackers([])
      setCurrentView('dashboard')
      return
    }

    const loadTrackers = async () => {
      setTrackersLoading(true)
      const result = await trackerService.getTrackers()

      if (result.data) {
        setTrackers(result.data)

        // Determine initial view based on tracker count
        if (result.data.length === 0) {
          setCurrentView('welcome')
          setCurrentTracker(null)
        } else {
          // If we have a current tracker, stay in tracker view
          // Otherwise go to dashboard
          if (!currentTracker) {
            setCurrentView('dashboard')
          }
        }
      }
      setTrackersLoading(false)
    }

    loadTrackers()
  }, [user])

  // Load ALL entries for analytics view (cross-tracker)
  const loadAllEntries = useCallback(async () => {
    if (!user) return

    const { data, error } = await db.select<PainEntry>('tracker_entries', {
      orderBy: { column: 'timestamp', ascending: false },
    })

    if (error) {
      console.error('Failed to load all entries for analytics:', error)
      return
    }

    setAllEntries(data ?? [])
  }, [user])

  // Load entries when tracker changes
  useEffect(() => {
    if (!user || !currentTracker) {
      return
    }

    const loadEntries = async () => {
      setLoading(true)
      const { data, error } = await db.select<PainEntry>('tracker_entries', {
        where: { tracker_id: currentTracker.id },
        orderBy: { column: 'timestamp', ascending: false },
      })

      if (error) {
        console.error(error)

        // Check for auth-related errors (deleted user, invalid token, etc.)
        const errorMsg = error.message?.toLowerCase() ?? ''
        if (
          errorMsg.includes('jwt') ||
          errorMsg.includes('token') ||
          errorMsg.includes('unauthorized') ||
          errorMsg.includes('auth') ||
          errorMsg.includes('permission') ||
          errorMsg.includes('row-level security')
        ) {
          toast.error('Session expired. Please sign in again.')
          await signOut()
          return
        }

        toast.error('Could not load entries')
        setLoading(false)
        return
      }

      setEntries(data ?? [])
      setLoading(false)
    }

    loadEntries()
  }, [user, currentTracker, signOut])

  // Sync pending entries when coming back online
  useEffect(() => {
    // Only sync when we were offline and are now online
    if (!wasOffline || !isOnline || !user) return

    const pendingEntries = getPendingEntries()
    if (pendingEntries.length === 0) return

    // Handle sync completion - refresh entries and clean up queue
    const handleSyncComplete = (results: SyncResult[]) => {
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      // Remove successfully synced entries from queue
      results.filter(r => r.success).forEach(r => removeFromQueue(r.entryId))

      // Show summary toast
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'entry' : 'entries'} synced`)
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${successCount} synced, ${failCount} failed`)
      } else if (failCount > 0) {
        toast.error(`${failCount} ${failCount === 1 ? 'entry' : 'entries'} failed to sync`)
      }

      // Clear synced entries from queue
      clearSynced()
    }

    // Start background sync
    syncController.startSync(
      getPendingEntries,
      updateQueueStatus,
      handleSyncComplete
    )

    return () => {
      syncController.stopSync()
    }
  }, [wasOffline, isOnline, user, getPendingEntries, updateQueueStatus, removeFromQueue, clearSynced, syncController])

  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PainEntry | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Helper to check if an error is auth-related
  const isAuthError = (error: Error | null): boolean => {
    if (!error?.message) return false
    const msg = error.message.toLowerCase()
    return (
      msg.includes('jwt') ||
      msg.includes('token') ||
      msg.includes('unauthorized') ||
      msg.includes('auth') ||
      msg.includes('permission') ||
      msg.includes('row-level security')
    )
  }

  // Handle auth errors by signing out
  const handleAuthError = useCallback(async () => {
    toast.error('Session expired. Please sign in again.')
    await signOut()
  }, [signOut])

  const handleAddEntry = async (data: {
    intensity: number
    locations: string[]
    notes: string
    triggers: string[]
    hashtags: string[]
  }) => {
    if (!user) {
      toast.error('You must be signed in to add entries')
      return
    }

    if (!currentTracker) {
      toast.error('Please select a tracker first')
      return
    }

    const newEntry: PainEntry = {
      id: uuidv4(),
      user_id: user.id,
      tracker_id: currentTracker.id,
      timestamp: Date.now(),
      ...data,
    }

    // If offline, queue the entry for later sync
    if (!isOnline) {
      addToQueue(newEntry)
      setEntries(current => [newEntry, ...current])
      setShowForm(false)
      toast.info('Entry saved offline. Will sync when connected.')
      return
    }

    const { error } = await db.insert<PainEntry>('tracker_entries', newEntry)

    if (error) {
      console.error(error)
      if (isAuthError(error)) {
        await handleAuthError()
        return
      }
      // If online but insert failed, queue for retry
      addToQueue(newEntry)
      setEntries(current => [newEntry, ...current])
      setShowForm(false)
      toast.warning('Entry saved locally. Will retry sync.')
      return
    }

    setEntries(current => [newEntry, ...current])
    setShowForm(false)
    toast.success('Entry saved')
  }

  const handleEditEntry = (entry: PainEntry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleUpdateEntry = async (data: {
    intensity: number
    locations: string[]
    notes: string
    triggers: string[]
    hashtags: string[]
    field_values?: FieldValues
  }) => {
    if (!editingEntry) return

    const updatedEntry: PainEntry = {
      ...editingEntry,
      ...data,
    }

    const { error } = await db.update<PainEntry>('tracker_entries', { id: editingEntry.id }, {
      intensity: data.intensity,
      locations: data.locations,
      notes: data.notes,
      triggers: data.triggers,
      hashtags: data.hashtags,
      field_values: data.field_values,
    })

    if (error) {
      console.error(error)
      if (isAuthError(error)) {
        await handleAuthError()
        return
      }
      toast.error('Could not update entry')
      return
    }

    setEntries(current =>
      current.map(entry =>
        entry.id === editingEntry.id ? updatedEntry : entry
      )
    )
    setShowForm(false)
    setEditingEntry(null)
    toast.success('Entry updated')
  }

  const handleDeleteEntry = async (id: string) => {
    const { error } = await db.delete('tracker_entries', { id })

    if (error) {
      console.error(error)
      if (isAuthError(error)) {
        await handleAuthError()
        return
      }
      toast.error('Could not delete entry')
      return
    }

    setEntries(current => current.filter(entry => entry.id !== id))
    toast.success('Entry deleted')
  }

  const filteredEntries = useMemo(() => {
    if (!entries) return []

    // Get set of pending entry IDs from offline queue
    const pendingIds = new Set(
      offlineQueue
        .filter(q => q.status === 'pending' || q.status === 'syncing' || q.status === 'failed')
        .map(q => q.entry.id)
    )

    // Mark entries that are pending sync
    let filtered: Array<PainEntry & { isPending?: boolean }> = entries.map(entry => ({
      ...entry,
      isPending: pendingIds.has(entry.id),
    }))

    if (dateFilter) {
      filtered = filterEntriesByDateRange(filtered, parseInt(dateFilter, 10))
    }

    if (locationFilter) {
      filtered = filterEntriesByLocation(filtered, locationFilter)
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase()

      filtered = filtered.filter(entry => {
        const text = [
          entry.notes,
          entry.triggers.join(' '),
          entry.locations.join(' '),
          (entry.hashtags ?? []).map(tag => `#${tag}`).join(' '),
          String(entry.intensity),
        ]
          .join(' ')
          .toLowerCase()

        return text.includes(query)
      })
    }

    return filtered
  }, [entries, dateFilter, locationFilter, searchTerm, offlineQueue])

  const entryCount = entries?.length ?? 0

  const handleSignOut = async () => {
    console.log('[App] Sign out clicked');
    try {
      await signOut()
      // Reset theme to system default on logout so new users get fresh experience
      localStorage.removeItem('theme')
      // Note: Keep 'baseline-theme-onboarded' flag - once user has seen theme picker on this device,
      // they don't need the tooltip again even after logout
      // Remove theme class from document to reset to default
      document.documentElement.classList.remove(
        'dark', 'zinc-light', 'zinc-dark', 'nature-light', 'nature-dark', 'rose-light', 'rose-dark'
      )
      toast.success('Signed out')
    } catch (err) {
      console.error('[App] Sign out exception:', err);
      toast.error('Sign out failed');
    }
  }

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setUpdatingPassword(true)
    const { error } = await auth.updatePassword({ password: newPassword })
    setUpdatingPassword(false)
    if (error) {
      toast.error(error.message || 'Could not update password')
      return
    }
    toast.success('Password updated successfully')
    setPasswordRecoveryOpen(false)
    setNewPassword('')
    setConfirmPassword('')
  }

  // Navigation handlers
  const handleGoHome = useCallback(() => {
    if (trackers.length === 0) {
      setCurrentView('welcome')
    } else {
      setCurrentView('dashboard')
    }
    setCurrentTracker(null)
  }, [trackers.length])

  const handleTrackerSelect = useCallback((tracker: Tracker) => {
    setCurrentTracker(tracker)
    setCurrentView('tracker')
  }, [])

  const handleTrackerCreated = useCallback((tracker: Tracker) => {
    console.log('[App] handleTrackerCreated called for', tracker.name, tracker.id);
    setTrackers(prev => [...prev, tracker])
    setCurrentTracker(tracker)
    setCurrentView('tracker')
  }, [])

  const handleShowAnalytics = useCallback(async () => {
    await loadAllEntries()
    setAnalyticsTracker(null) // Show all trackers
    setCurrentView('analytics')
  }, [loadAllEntries])

  const handleShowTrackerAnalytics = useCallback(async (tracker: Tracker) => {
    await loadAllEntries()
    setAnalyticsTracker(tracker) // Show single tracker
    setCurrentView('analytics')
  }, [loadAllEntries])

  // Listen for manual dev tracker creation events and update UI accordingly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent;
        if (custom?.detail) {
          handleTrackerCreated(custom.detail as any);
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('__dev:trackerCreated', handler as EventListener);
    return () => window.removeEventListener('__dev:trackerCreated', handler as EventListener);
  }, [handleTrackerCreated]);

  const handleTrackerDeleted = useCallback((trackerId: string) => {
    setTrackers(prev => prev.filter(t => t.id !== trackerId))
    // If deleted the current tracker, reset and go to dashboard
    if (currentTracker?.id === trackerId) {
      setCurrentTracker(null)
      setCurrentView('dashboard')
    }
  }, [currentTracker?.id])

  // Show loading while validating auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-muted-foreground gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span>Validating session…</span>
      </div>
    )
  }

  // Show auth form if not signed in
  if (!user) {
    return (
      <>
        <Toaster />
        <AuthForm />
      </>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading your data…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <Toaster />

      {/* About Dialog */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Baseline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p className="text-base text-foreground">
              Know your baseline, spot the changes.
            </p>
            <p className="text-xs">
              Version {import.meta.env.VITE_APP_VERSION || '4.1.0'}
            </p>
            <p>
              Baseline helps you track anything that matters to your health and wellbeing.
              Whether it's chronic pain, mood, sleep, or custom trackers powered by AI —
              understanding your patterns is the first step to feeling better.
            </p>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Features</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Track multiple health conditions with custom trackers</li>
                <li>AI-powered context generation for personalized tracking</li>
                <li>Visual insights with calendar and list views</li>
                <li>Tag entries with locations, triggers, and hashtags</li>
                <li>Private and secure — your data stays yours</li>
              </ul>
            </div>
            <div className="flex gap-4 text-xs pt-2 border-t">
              <button
                onClick={() => { setAboutOpen(false); setCurrentView('help'); }}
                className="text-primary hover:underline"
              >
                Help & FAQ
              </button>
              <a
                href="mailto:support@baseline-app.com"
                className="text-primary hover:underline"
              >
                Contact Support
              </a>
            </div>
            <p className="text-xs">
              Made with care for people managing chronic conditions.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Recovery Dialog */}
      <Dialog open={passwordRecoveryOpen} onOpenChange={setPasswordRecoveryOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset your password</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setPasswordRecoveryOpen(false)}>Cancel</Button>
                <Button onClick={handlePasswordUpdate} disabled={updatingPassword}>
                  {updatingPassword ? 'Updating…' : 'Update password'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      {/* Account Settings Dialog */}
      <AccountSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        trackers={trackers}
        onAccountDeleted={handleSignOut}
      />

      {/* Email confirmed banner */}
      {emailConfirmed && (
        <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-3 text-center">
          <p className="text-sm text-green-700 dark:text-green-400">
            ✅ Email confirmed! Welcome to Baseline.
          </p>
        </div>
      )}

      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 overflow-hidden">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="inline-flex items-start">
                <button
                  onClick={handleGoHome}
                  className="hover:opacity-80 transition-opacity"
                >
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                    Baseline
                  </h1>
                </button>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setAboutOpen(true)}
                        className="-mt-0.5 ml-1 w-5 h-5 rounded-full border border-primary/40 bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold hover:bg-primary/20 hover:border-primary/60 transition-all cursor-pointer"
                        aria-label="About Baseline"
                      >
                        i
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px] text-xs">
                      <p>Track health patterns with AI-powered insights. Click for more info.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-muted-foreground mt-1">
                Know your baseline, spot the changes
              </p>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSettingsOpen(true)}
                      aria-label="Account settings"
                    >
                      <Gear size={20} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Account settings</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ThemeSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <SignOut size={18} />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Tracker Selector - only show when in tracker view */}
          {currentView === 'tracker' && currentTracker && (
            <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span className="text-sm text-muted-foreground shrink-0">Tracking:</span>
                <TrackerSelector
                  currentTracker={currentTracker}
                  onTrackerChange={handleTrackerSelect}
                  onTrackerDeleted={handleTrackerDeleted}
                  className="min-w-0 max-w-[180px] sm:max-w-[240px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => handleShowTrackerAnalytics(currentTracker)}
              >
                <TrendUp size={16} />
                <span className="hidden sm:inline">View Your Progress</span>
                <span className="sm:hidden">Progress</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main content with view transitions */}
      <div id="main-content" tabIndex={-1} className="outline-none">
      <AnimatePresence mode="wait">
        {/* Welcome screen for new users */}
        {currentView === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <WelcomeScreen onTrackerCreated={handleTrackerCreated} />
          </motion.div>
        )}

        {/* Dashboard for returning users */}
        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Dashboard
              trackers={trackers}
              onTrackerSelect={handleTrackerSelect}
              onTrackerCreated={handleTrackerCreated}
              onTrackerDeleted={handleTrackerDeleted}
              onShowAnalytics={handleShowAnalytics}
            />
          </motion.div>
        )}

        {/* Analytics view */}
        {currentView === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AnalyticsDashboard
              entries={allEntries}
              trackers={trackers}
              onBack={() => analyticsTracker ? setCurrentView('tracker') : setCurrentView('dashboard')}
              onEntryEdit={handleEditEntry}
              onEntryDelete={handleDeleteEntry}
              currentTracker={analyticsTracker}
              onViewAllTrackers={handleShowAnalytics}
            />
          </motion.div>
        )}

        {/* Tracker view */}
        {currentView === 'tracker' && currentTracker && (
          <motion.div
            key="tracker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <main className="container max-w-4xl mx-auto px-6 py-8 space-y-8">
              <AnimatePresence mode="wait">
                {showForm ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PainEntryForm
                      tracker={currentTracker}
                      editEntry={editingEntry}
                      onSubmit={editingEntry ? handleUpdateEntry : handleAddEntry}
                      onCancel={() => {
                        setShowForm(false)
                        setEditingEntry(null)
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      onClick={() => setShowForm(true)}
                      size="lg"
                      className="w-full sm:w-auto gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg"
                    >
                <Plus size={20} weight="bold" />
                {getTrackerConfig(currentTracker?.preset_id as TrackerPresetId | null, currentTracker?.generated_config).addButtonLabel}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {entryCount > 0 && (
          <Tabs defaultValue="all" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <TabsList className="bg-muted">
                <TabsTrigger value="all" className="gap-2">
                  <List size={18} />
                  All Entries
                </TabsTrigger>
                <TabsTrigger value="filter" className="gap-2">
                  <Calendar size={18} />
                  Filter
                </TabsTrigger>
                <TabsTrigger value="progress" className="gap-2">
                  <TrendUp size={18} />
                  Progress
                </TabsTrigger>
              </TabsList>

              {/* Search box */}
              <div className="w-full sm:max-w-xs">
                <Input
                  placeholder="Search notes, triggers, locations…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="all" className="space-y-4 mt-6">
              {filteredEntries.length === 0 ? (
                <EmptyState tracker={currentTracker} />
              ) : filteredEntries.length > 50 ? (
                <VirtualizedEntryList
                  entries={filteredEntries}
                  tracker={currentTracker}
                  onDelete={handleDeleteEntry}
                  onEdit={handleEditEntry}
                  height="calc(100vh - 380px)"
                />
              ) : (
                <SimpleEntryList
                  entries={filteredEntries}
                  tracker={currentTracker}
                  onDelete={handleDeleteEntry}
                  onEdit={handleEditEntry}
                />
              )}
            </TabsContent>

            <TabsContent value="filter" className="space-y-6 mt-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Time Period</label>
                  <Select
                    value={dateFilter || 'all'}
                    onValueChange={value =>
                      setDateFilter(value === 'all' ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select
                    value={locationFilter || 'all'}
                    onValueChange={value =>
                      setLocationFilter(value === 'all' ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {BODY_LOCATIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No entries match your filters. Try adjusting your criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredEntries.length}{' '}
                    {filteredEntries.length === 1 ? 'entry' : 'entries'}
                  </p>
                  {filteredEntries.length > 50 ? (
                    <VirtualizedEntryList
                      entries={filteredEntries}
                      tracker={currentTracker}
                      onDelete={handleDeleteEntry}
                      onEdit={handleEditEntry}
                      height="calc(100vh - 480px)"
                    />
                  ) : (
                    <SimpleEntryList
                      entries={filteredEntries}
                      tracker={currentTracker}
                      onDelete={handleDeleteEntry}
                      onEdit={handleEditEntry}
                    />
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="progress" className="mt-6">
              <AnalyticsDashboard
                entries={entries}
                trackers={trackers}
                onBack={() => {}} // No-op since we're in a tab
                onEntryEdit={handleEditEntry}
                onEntryDelete={handleDeleteEntry}
                currentTracker={currentTracker}
                onViewAllTrackers={handleShowAnalytics}
                embedded
              />
            </TabsContent>
          </Tabs>
        )}

        {entryCount === 0 && !showForm && <EmptyState tracker={currentTracker} />}
            </main>
          </motion.div>
        )}

        {/* Privacy Policy */}
        {currentView === 'privacy' && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PrivacyPolicy onBack={() => setCurrentView('dashboard')} />
          </motion.div>
        )}

        {/* Terms of Service */}
        {currentView === 'terms' && (
          <motion.div
            key="terms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TermsOfService onBack={() => setCurrentView('dashboard')} />
          </motion.div>
        )}

        {/* Help Center */}
        {currentView === 'help' && (
          <motion.div
            key="help"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <HelpCenter onBack={() => setCurrentView('dashboard')} />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <footer className="border-t mt-16">
        <div className="container max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row gap-2 justify-center items-center text-sm text-muted-foreground">
          <span>Your data is stored securely and privately.</span>
          <span className="hidden sm:inline">·</span>
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentView('privacy')}
              className="hover:text-foreground hover:underline transition-colors"
            >
              Privacy
            </button>
            <button
              onClick={() => setCurrentView('terms')}
              className="hover:text-foreground hover:underline transition-colors"
            >
              Terms
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

/**
 * Main App Component
 * Uses Supabase for authentication and data
 */
function App() {
  const authState = useSupabaseAuth();
  return <AppContent authState={authState} />;
}

export default App
