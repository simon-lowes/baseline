/**
 * Unit tests for service modules
 *
 * Tests pure logic in configGenerationService (local ambiguity fallback,
 * Levenshtein distance, generic config detection, generic config generation)
 * and syncService (mergeEntriesWithQueue).
 *
 * Does NOT mock Supabase — only tests pure/exported functions.
 */
import { describe, it, expect } from 'vitest'
import {
  getLocalAmbiguityFallback,
  getGenericConfig,
} from '../configGenerationService'
import { mergeEntriesWithQueue } from '../syncService'
import type { PainEntry } from '@/types/pain-entry'
import type { QueuedEntry } from '@/hooks/useOfflineQueue'

// ============================================================================
// Helper
// ============================================================================

function makeEntry(overrides: Partial<PainEntry> = {}): PainEntry {
  return {
    id: `entry-${Math.random().toString(36).slice(2)}`,
    user_id: 'user-1',
    tracker_id: 'tracker-1',
    timestamp: Date.now(),
    intensity: 5,
    locations: ['head'],
    notes: '',
    triggers: [],
    hashtags: [],
    ...overrides,
  }
}

// ============================================================================
// configGenerationService — getLocalAmbiguityFallback
// ============================================================================

describe('configGenerationService', () => {
  describe('getLocalAmbiguityFallback', () => {
    it('detects exact match (case-insensitive) for known ambiguous terms', () => {
      const result = getLocalAmbiguityFallback('flying')
      expect(result.isAmbiguous).toBe(true)
      expect(result.interpretations.length).toBeGreaterThanOrEqual(2)
    })

    it('is case-insensitive', () => {
      expect(getLocalAmbiguityFallback('FLYING').isAmbiguous).toBe(true)
      expect(getLocalAmbiguityFallback('Flying').isAmbiguous).toBe(true)
      expect(getLocalAmbiguityFallback('fLyInG').isAmbiguous).toBe(true)
    })

    it('detects typos via Levenshtein distance', () => {
      // "flyinh" is 1 edit from "flying"
      const result = getLocalAmbiguityFallback('flyinh')
      expect(result.isAmbiguous).toBe(true)
      expect(result.suggestedCorrection).toBe('flying')
    })

    it('does not match words far from any known term', () => {
      const result = getLocalAmbiguityFallback('photography')
      expect(result.isAmbiguous).toBe(false)
    })

    it('matches all known ambiguous terms', () => {
      const terms = [
        'flying', 'flight', 'hockey', 'curling', 'reading', 'drinking',
        'smoking', 'shooting', 'chilling', 'running', 'driving', 'lifting',
        'bowling', 'batting', 'pressing', 'cycling', 'boxing', 'climbing',
        'dancing', 'walking', 'fasting', 'gaming', 'training',
      ]
      for (const term of terms) {
        const result = getLocalAmbiguityFallback(term)
        expect(result.isAmbiguous, `Expected "${term}" to be ambiguous`).toBe(true)
        expect(result.interpretations.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('returns empty interpretations for non-ambiguous unknown words', () => {
      const result = getLocalAmbiguityFallback('supercalifragilistic')
      expect(result.isAmbiguous).toBe(false)
      expect(result.interpretations).toHaveLength(0)
    })

    it('handles empty string', () => {
      const result = getLocalAmbiguityFallback('')
      expect(result.isAmbiguous).toBe(false)
    })

    it('handles whitespace-only string', () => {
      const result = getLocalAmbiguityFallback('   ')
      expect(result.isAmbiguous).toBe(false)
    })

    it('trims input', () => {
      const result = getLocalAmbiguityFallback('  flying  ')
      expect(result.isAmbiguous).toBe(true)
    })

    it('does not false positive on similar-length unrelated words', () => {
      // "skiing" has length 6 like "flying" but distance > 2
      const result = getLocalAmbiguityFallback('skiing')
      // skiing is not in the list and has distance >2 from all known terms
      expect(result.isAmbiguous).toBe(false)
    })

    describe('interpretation structure', () => {
      it('each interpretation has value, label, and description', () => {
        const result = getLocalAmbiguityFallback('hockey')
        expect(result.isAmbiguous).toBe(true)
        for (const interp of result.interpretations) {
          expect(interp.value).toBeTruthy()
          expect(interp.label).toBeTruthy()
          expect(interp.description).toBeTruthy()
        }
      })
    })
  })

  // ============================================================================
  // configGenerationService — getGenericConfig
  // ============================================================================

  describe('getGenericConfig', () => {
    it('returns config with the tracker name in labels', () => {
      const config = getGenericConfig('Anxiety')
      expect(config.addButtonLabel).toBe('Log Anxiety')
      expect(config.formTitle).toBe('Log Anxiety')
      expect(config.emptyStateTitle).toBe('Welcome to Anxiety')
      expect(config.entryTitle).toBe('Anxiety Entry')
    })

    it('lowercases tracker name in descriptions', () => {
      const config = getGenericConfig('Running')
      expect(config.emptyStateDescription).toContain('running')
      expect(config.deleteConfirmMessage).toContain('running')
    })

    it('has neutral intensity scale', () => {
      const config = getGenericConfig('Test')
      expect(config.intensityScale).toBe('neutral')
    })

    it('has default locations', () => {
      const config = getGenericConfig('Test')
      expect(config.locations).toHaveLength(4)
      expect(config.locations[0].value).toBe('general')
    })

    it('has default triggers', () => {
      const config = getGenericConfig('Test')
      expect(config.triggers).toContain('Stress')
      expect(config.triggers).toContain('Weather')
    })

    it('has suggested hashtags', () => {
      const config = getGenericConfig('Test')
      expect(config.suggestedHashtags).toContain('tracking')
      expect(config.suggestedHashtags).toContain('health')
    })

    it('has empty state bullets', () => {
      const config = getGenericConfig('Test')
      expect(config.emptyStateBullets).toHaveLength(3)
    })
  })
})

// ============================================================================
// syncService — mergeEntriesWithQueue
// ============================================================================

describe('syncService', () => {
  describe('mergeEntriesWithQueue', () => {
    it('returns live entries when queue is empty', () => {
      const live = [makeEntry({ id: 'e1', timestamp: 1000 })]
      const result = mergeEntriesWithQueue(live, [])
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('e1')
      expect(result[0].isPending).toBeUndefined()
    })

    it('marks queued entries as pending', () => {
      const queued: QueuedEntry[] = [{
        entry: makeEntry({ id: 'q1', timestamp: 2000 }),
        status: 'pending',
        attempts: 0,
        queuedAt: Date.now(),
      }]
      const result = mergeEntriesWithQueue([], queued)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('q1')
      expect(result[0].isPending).toBe(true)
    })

    it('deduplicates — queued entry already in live is not repeated', () => {
      const entry = makeEntry({ id: 'e1', timestamp: 1000 })
      const live = [entry]
      const queued: QueuedEntry[] = [{
        entry: { ...entry },
        status: 'pending',
        attempts: 0,
        queuedAt: Date.now(),
      }]
      const result = mergeEntriesWithQueue(live, queued)
      expect(result).toHaveLength(1)
    })

    it('excludes synced entries from queue', () => {
      const queued: QueuedEntry[] = [{
        entry: makeEntry({ id: 'q1', timestamp: 2000 }),
        status: 'synced',
        attempts: 1,
        queuedAt: Date.now(),
      }]
      const result = mergeEntriesWithQueue([], queued)
      expect(result).toHaveLength(0)
    })

    it('sorts by timestamp descending (newest first)', () => {
      const live = [
        makeEntry({ id: 'e1', timestamp: 1000 }),
        makeEntry({ id: 'e2', timestamp: 3000 }),
      ]
      const queued: QueuedEntry[] = [{
        entry: makeEntry({ id: 'q1', timestamp: 2000 }),
        status: 'pending',
        attempts: 0,
        queuedAt: Date.now(),
      }]
      const result = mergeEntriesWithQueue(live, queued)
      expect(result.map(e => e.id)).toEqual(['e2', 'q1', 'e1'])
    })

    it('handles failed entries from queue (still shows them)', () => {
      const queued: QueuedEntry[] = [{
        entry: makeEntry({ id: 'q1', timestamp: 2000 }),
        status: 'failed',
        attempts: 3,
        queuedAt: Date.now(),
      }]
      const result = mergeEntriesWithQueue([], queued)
      expect(result).toHaveLength(1)
      expect(result[0].isPending).toBe(true)
    })
  })
})
