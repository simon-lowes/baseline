/**
 * Config Generation Service
 * 
 * Orchestrates dictionary lookup and AI-powered configuration generation
 * for custom trackers.
 */

import { lookupWord } from './dictionaryService';
import { supabaseClient } from '@/adapters/supabase/supabaseClient';
import { debug, info, warn, error as logError } from '@/lib/logger';
import type { GeneratedTrackerConfig, AmbiguityCheckResult, TrackerInterpretation } from '@/types/generated-config';
import { fetchWikipediaContext } from './wikiService';
import { fetchDatamuseRelated } from './datamuseService';

export interface ConfigGenerationResult {
  success: boolean;
  config?: GeneratedTrackerConfig;
  needsDescription?: boolean;
  questions?: string[];
  error?: string;
}

function isLikelyGenericConfig(config: GeneratedTrackerConfig | undefined): boolean {
  if (!config) return true;
  const genericLocations = ['general', 'positive', 'negative', 'neutral'];
  const genericTriggers = ['note', 'important', 'follow-up', 'recurring'];

  const locLabels = (config.locations || []).map((l) => l.label.toLowerCase());
  const trigLabels = (config.triggers || []).map((t) => t.toLowerCase());

  const looksGenericLocations =
    locLabels.length <= 3 || locLabels.every((l) => genericLocations.includes(l));
  const looksGenericTriggers =
    trigLabels.length <= 4 && trigLabels.every((t) => genericTriggers.includes(t));

  return looksGenericLocations || looksGenericTriggers;
}

function buildClarifyingQuestions(trackerName: string, selectedInterpretation?: string): string[] {
  const base = selectedInterpretation
    ? `When you say "${trackerName}" (${selectedInterpretation}), what exactly do you want to track?`
    : `When you say "${trackerName}", what exactly do you want to track?`;
  return [
    base,
    'What situations, positions, or activities usually trigger it?',
    'What specific categories should the tracker include (types, contexts, or patterns)?',
  ];
}

/**
 * Common ambiguous terms and their interpretations
 * This serves as a LOCAL FALLBACK if the AI service fails.
 * These are known ambiguous terms that should ALWAYS prompt the user.
 */
const KNOWN_AMBIGUOUS_TERMS: Record<string, TrackerInterpretation[]> = {
  flying: [
    { value: 'air-travel', label: 'Air Travel (Passenger)', description: 'Track flights as a passenger - comfort, anxiety, jet lag' },
    { value: 'recreational-flying', label: 'Recreational Flying', description: 'Paragliding, hang gliding, skydiving, or similar activities' },
    { value: 'fear-of-flying', label: 'Fear of Flying', description: 'Track and manage aviophobia and flight anxiety' },
    { value: 'pilot-training', label: 'Pilot/Aviation', description: 'Flying as a pilot - training hours, flights logged' },
  ],
  // 'Flight' is an alias commonly used by users — ensure we prompt for clarification
  flight: [
    { value: 'air-travel', label: 'Air Travel (Passenger)', description: 'Track flights as a passenger - comfort, anxiety, jet lag' },
    { value: 'recreational-flying', label: 'Recreational Flying', description: 'Paragliding, hang gliding, skydiving, or similar activities' },
    { value: 'fear-of-flying', label: 'Fear of Flying', description: 'Track and manage aviophobia and flight anxiety' },
    { value: 'pilot-training', label: 'Pilot/Aviation', description: 'Flying as a pilot - training hours, flights logged' },
  ],
  hockey: [
    { value: 'ice-hockey', label: 'Ice Hockey', description: 'Playing ice hockey - games, practices, performance' },
    { value: 'field-hockey', label: 'Field Hockey', description: 'Playing field hockey - matches, training sessions' },
  ],
  curling: [
    { value: 'curling-sport', label: 'Curling (Sport)', description: 'The winter sport with stones on ice' },
    { value: 'hair-curling', label: 'Hair Curling', description: 'Hair styling and care routine' },
  ],
  reading: [
    { value: 'reading-books', label: 'Reading (Books)', description: 'Track reading habits, books, pages read' },
    { value: 'medical-readings', label: 'Medical Readings', description: 'Track blood pressure, glucose, or other measurements' },
  ],
  drinking: [
    { value: 'drinking-water', label: 'Hydration', description: 'Track water intake and hydration' },
    { value: 'drinking-alcohol', label: 'Alcohol Consumption', description: 'Track alcohol intake' },
  ],
  smoking: [
    { value: 'smoking-tobacco', label: 'Smoking (Tobacco)', description: 'Track cigarette or tobacco use' },
    { value: 'smoking-food', label: 'Smoking Food', description: 'BBQ and smoked food preparation' },
  ],
  shooting: [
    { value: 'shooting-sport', label: 'Shooting (Sport)', description: 'Target shooting, archery, or clay shooting' },
    { value: 'shooting-photography', label: 'Photography', description: 'Photo shoots and photography sessions' },
  ],
  chilling: [
    { value: 'relaxation', label: 'Relaxation', description: 'Track downtime and rest periods' },
    { value: 'cold-exposure', label: 'Cold Exposure', description: 'Cold therapy, ice baths, cold showers' },
  ],
  running: [
    { value: 'running-exercise', label: 'Running (Exercise)', description: 'Jogging or running for fitness' },
    { value: 'running-business', label: 'Running a Business', description: 'Managing business operations and stress' },
  ],
  driving: [
    { value: 'driving-vehicle', label: 'Driving (Vehicle)', description: 'Track driving habits, road trips, commutes' },
    { value: 'driving-anxiety', label: 'Driving Anxiety', description: 'Managing fear or anxiety while driving' },
  ],
  lifting: [
    { value: 'weightlifting', label: 'Weightlifting', description: 'Strength training and gym workouts' },
    { value: 'lifting-mood', label: 'Mood Lifting', description: 'Activities that improve your mood' },
  ],
  bowling: [
    { value: 'bowling-sport', label: 'Ten-Pin Bowling', description: 'Bowling alley games and practice' },
    { value: 'lawn-bowling', label: 'Lawn Bowling', description: 'Outdoor lawn bowls or bocce' },
    { value: 'cricket-bowling', label: 'Cricket Bowling', description: 'Bowling in cricket matches' },
  ],
  batting: [
    { value: 'baseball-batting', label: 'Baseball/Softball Batting', description: 'Batting practice and game performance' },
    { value: 'cricket-batting', label: 'Cricket Batting', description: 'Cricket batting sessions and matches' },
  ],
  pressing: [
    { value: 'pressing-exercise', label: 'Pressing (Exercise)', description: 'Bench press, overhead press workouts' },
    { value: 'pressing-stress', label: 'Feeling Pressed/Stressed', description: 'Track feelings of pressure or stress' },
  ],
  cycling: [
    { value: 'cycling-outdoor', label: 'Outdoor Cycling', description: 'Road cycling, mountain biking, commuting' },
    { value: 'cycling-indoor', label: 'Indoor Cycling', description: 'Spin classes, stationary bike workouts' },
  ],
  boxing: [
    { value: 'boxing-sport', label: 'Boxing (Sport)', description: 'Boxing training, sparring, fights' },
    { value: 'boxing-fitness', label: 'Boxing Fitness', description: 'Cardio boxing, fitness boxing classes' },
  ],
  climbing: [
    { value: 'rock-climbing', label: 'Rock Climbing', description: 'Indoor or outdoor rock climbing' },
    { value: 'mountain-climbing', label: 'Mountain Climbing', description: 'Hiking and mountaineering' },
    { value: 'stair-climbing', label: 'Stair Climbing', description: 'Stair climbing for fitness' },
  ],
  dancing: [
    { value: 'social-dancing', label: 'Social Dancing', description: 'Salsa, swing, ballroom, club dancing' },
    { value: 'dance-fitness', label: 'Dance Fitness', description: 'Zumba, dance cardio workouts' },
    { value: 'dance-performance', label: 'Dance Performance', description: 'Ballet, contemporary, performance dance' },
  ],
  walking: [
    { value: 'walking-exercise', label: 'Walking (Exercise)', description: 'Daily walks for fitness and health' },
    { value: 'hiking', label: 'Hiking', description: 'Trail hiking and nature walks' },
    { value: 'dog-walking', label: 'Dog Walking', description: 'Walking your dog regularly' },
  ],
  fasting: [
    { value: 'intermittent-fasting', label: 'Intermittent Fasting', description: 'Track eating windows and fasting periods' },
    { value: 'religious-fasting', label: 'Religious Fasting', description: 'Fasting for spiritual or religious purposes' },
    { value: 'medical-fasting', label: 'Medical Fasting', description: 'Fasting before medical tests' },
  ],
  gaming: [
    { value: 'video-gaming', label: 'Video Gaming', description: 'Track gaming sessions and screen time' },
    { value: 'tabletop-gaming', label: 'Tabletop Gaming', description: 'Board games, card games, RPGs' },
  ],
  training: [
    { value: 'fitness-training', label: 'Fitness Training', description: 'General workout and exercise sessions' },
    { value: 'skill-training', label: 'Skill Training', description: 'Learning and practicing a specific skill' },
    { value: 'pet-training', label: 'Pet Training', description: 'Training your pet' },
  ],
};

// All known words (for spell-checking)
const ALL_KNOWN_WORDS = Object.keys(KNOWN_AMBIGUOUS_TERMS);

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching to detect typos
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Find the closest matching word from known ambiguous terms
 * Returns the match if within acceptable distance, null otherwise
 */
function findClosestMatch(input: string, maxDistance: number = 2): { word: string; distance: number } | null {
  const normalized = input.toLowerCase().trim();
  
  // Exact match - return immediately
  if (KNOWN_AMBIGUOUS_TERMS[normalized]) {
    return { word: normalized, distance: 0 };
  }
  
  // Find closest match
  let closest: { word: string; distance: number } | null = null;
  
  for (const word of ALL_KNOWN_WORDS) {
    // Only check words of similar length (optimization)
    if (Math.abs(word.length - normalized.length) > maxDistance) {
      continue;
    }
    
    const distance = levenshteinDistance(normalized, word);
    
    if (distance <= maxDistance && (!closest || distance < closest.distance)) {
      closest = { word, distance };
    }
  }
  
  return closest;
}

/**
 * Check if a term is in our known ambiguous terms list
 * Also checks for typos/misspellings using fuzzy matching
 */
export function getLocalAmbiguityFallback(trackerName: string): AmbiguityCheckResult & { suggestedCorrection?: string } {
  const normalized = trackerName.toLowerCase().trim();
  
  debug('[getLocalAmbiguityFallback] Checking:', normalized);
  
  // First check for exact match
  const exactMatch = KNOWN_AMBIGUOUS_TERMS[normalized];
  if (exactMatch && exactMatch.length > 0) {
    debug('[getLocalAmbiguityFallback] ✅ EXACT MATCH found:', normalized, 'with', exactMatch.length, 'options');
    return {
      isAmbiguous: true,
      reason: `"${trackerName}" has multiple common meanings - please select which one you mean`,
      interpretations: exactMatch,
    };
  }
  
  // Check for typos - find closest match using Levenshtein distance
  const closestMatch = findClosestMatch(normalized);
  if (closestMatch && closestMatch.distance > 0 && closestMatch.distance <= 2) {
    const correctedInterpretations = KNOWN_AMBIGUOUS_TERMS[closestMatch.word];
    debug('[getLocalAmbiguityFallback] 🔤 TYPO DETECTED:', normalized, '→', closestMatch.word, '(distance:', closestMatch.distance, ')');
    
    // Return as ambiguous with the corrected word's interpretations
    return {
      isAmbiguous: true,
      reason: `Did you mean "${closestMatch.word}"? Please select what you want to track:`,
      interpretations: correctedInterpretations,
      suggestedCorrection: closestMatch.word,
    };
  }
  
  debug('[getLocalAmbiguityFallback] ❌ Not found in local list');
  return { isAmbiguous: false, reason: '', interpretations: [] };
}

/**
 * Check if a tracker name is ambiguous and needs user clarification
 * 
 * IMPORTANT: This function will NEVER silently skip disambiguation.
 * If the AI service fails, it falls back to a local list of known ambiguous terms.
 * Known ambiguous terms from the local list will ALWAYS trigger disambiguation.
 * 
 * @param trackerName - The name of the tracker to check
 * @returns Ambiguity check result with interpretation options if ambiguous
 */
export async function checkAmbiguity(trackerName: string): Promise<AmbiguityCheckResult> {
  debug('[checkAmbiguity] ========== STARTING ==========', trackerName);
  
  // FIRST: Check our local fallback list - this ALWAYS works
  const localResult = getLocalAmbiguityFallback(trackerName);
  
  if (localResult.isAmbiguous) {
    // If it's in our curated local list, use that immediately
    // This is the most reliable - no network calls needed
    debug('[checkAmbiguity] ✅ FOUND IN LOCAL LIST - returning immediately with', localResult.interpretations.length, 'options');
    return localResult;
  }
  
  debug('[checkAmbiguity] Not in local list, trying AI...');
  
  // In E2E mode, avoid calling external AI service for deterministic tests
  if (typeof window !== 'undefined' && window.location.search.includes('e2e=true')) {
    debug('[checkAmbiguity] E2E mode detected - skipping AI ambiguity check (deterministic)');
    return { isAmbiguous: false, reason: '', interpretations: [] };
  }

  // Try the AI service for terms not in our local list
  try {
    // Get dictionary definitions for context
    let allDefinitions: string[] | undefined;
    let wikiSummary: string | undefined;
    let wikiCategories: string[] | undefined;
    let relatedTerms: string[] | undefined;
    try {
      const dictResult = await lookupWord(trackerName);
      allDefinitions = dictResult?.allDefinitions;
      debug('[checkAmbiguity] Dictionary found', allDefinitions?.length ?? 0, 'definitions');
    } catch (dictError) {
      console.warn('[checkAmbiguity] Dictionary lookup failed (continuing):', dictError);
    }

    try {
      const wiki = await fetchWikipediaContext(trackerName);
      if (wiki) {
        wikiSummary = wiki.summary;
        wikiCategories = wiki.categories;
      }
    } catch (wikiErr) {
      console.warn('[checkAmbiguity] Wikipedia lookup failed (continuing):', wikiErr);
    }

    try {
      const related = await fetchDatamuseRelated(trackerName, 12);
      if (related?.terms?.length) {
        relatedTerms = related.terms;
      }
    } catch (dmErr) {
      console.warn('[checkAmbiguity] Datamuse lookup failed (continuing):', dmErr);
    }
    
    // Call edge function to check ambiguity
    debug('[checkAmbiguity] Calling check-ambiguity edge function...');
    const { data, error } = await supabaseClient.functions.invoke('check-ambiguity', {
      body: { trackerName, allDefinitions, wikiSummary, wikiCategories, relatedTerms },
    });
    
    if (error) {
      logError('[checkAmbiguity] Edge function error:', error);
      // AI failed, but term isn't in local list - proceed without disambiguation
      return { isAmbiguous: false, reason: `AI check failed: ${error.message || error}`, interpretations: [] };
    }
    
    debug('[checkAmbiguity] Edge function returned:', JSON.stringify(data));
    
    const result: AmbiguityCheckResult = {
      isAmbiguous: data?.isAmbiguous ?? false,
      reason: data?.reason ?? '',
      interpretations: data?.interpretations ?? [],
    };
    
    if (result.isAmbiguous) {
      debug('[checkAmbiguity] ✅ AI says AMBIGUOUS with', result.interpretations.length, 'options');
    } else {
      debug('[checkAmbiguity] AI says NOT ambiguous');
    }
    
    return result;
  } catch (error) {
    console.error('[checkAmbiguity] Exception occurred:', error);
    // AI failed, but term isn't in local list - proceed without disambiguation
    return { 
      isAmbiguous: false, 
      reason: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      interpretations: [] 
    };
  }
}

/**
 * Generate configuration for a custom tracker
 * 
 * @param trackerName - The name of the tracker (e.g., "Hypertension")
 * @param userDescription - Optional user-provided description (used when dictionary lookup fails)
 * @param selectedInterpretation - Optional user-selected interpretation for ambiguous terms
 * @returns The generation result with config or status
 */
export async function generateTrackerConfig(
  trackerName: string,
  userDescription?: string,
  selectedInterpretation?: string
): Promise<ConfigGenerationResult> {
  // In E2E mode, avoid calling external AI services for deterministic, fast tests
  if (typeof window !== 'undefined' && window.location.search.includes('e2e=true')) {
    debug('[generateTrackerConfig] E2E mode detected - returning generic config (deterministic)');
    return { success: true, config: getGenericConfig(trackerName) };
  }

  try {
    // Always try dictionary lookup first to provide context to Gemini (even if user supplied a description/interpretation)
    let definition: string | undefined;
    let allDefinitions: string[] | undefined;
    let synonyms: string[] | undefined;
    let dictionaryFound = false;
    let wikiSummary: string | undefined;
    let wikiCategories: string[] | undefined;
    let relatedTerms: string[] | undefined;

    try {
      const dictResult = await lookupWord(trackerName);
      if (dictResult) {
        dictionaryFound = true;
        definition = dictResult.definition;
        allDefinitions = dictResult.allDefinitions;
        synonyms = dictResult.synonyms;
      }
    } catch (dictErr) {
      console.warn('[generateTrackerConfig] Dictionary lookup failed, continuing with AI only:', dictErr);
    }

    // Wikipedia summary + categories (free, no auth)
    try {
      const wiki = await fetchWikipediaContext(trackerName);
      if (wiki) {
        wikiSummary = wiki.summary;
        wikiCategories = wiki.categories;
      }
    } catch (wikiErr) {
      console.warn('[generateTrackerConfig] Wikipedia lookup failed (non-blocking):', wikiErr);
    }

    // Datamuse related terms to enrich tags/hashtags
    try {
      const related = await fetchDatamuseRelated(trackerName, 12);
      if (related?.terms?.length) {
        relatedTerms = related.terms;
      }
    } catch (dmErr) {
      console.warn('[generateTrackerConfig] Datamuse lookup failed (non-blocking):', dmErr);
    }

    // If we have no dictionary context and no user description, ask for a description instead of guessing blindly
    if (!dictionaryFound && !userDescription) {
      return {
        success: false,
        needsDescription: true,
        questions: buildClarifyingQuestions(trackerName, selectedInterpretation),
        error: 'No reliable dictionary context found. Please describe what you want to track.',
      };
    }
    
    // Call edge function to generate config
    // Gemini will use dictionary definitions if available, or its own knowledge otherwise
    const { data, error } = await supabaseClient.functions.invoke('generate-tracker-config', {
      body: {
        trackerName,
        definition,
        allDefinitions, // Pass all definitions for better context
        userDescription,
        selectedInterpretation, // Pass user's disambiguation choice
        wikiSummary,
        wikiCategories,
        relatedTerms,
      },
    });
    
    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to generate configuration');
    }
    
      if (data?.error) {
        throw new Error(data.error);
      }
      
    if (data?.needs_clarification || (Array.isArray(data?.questions) && data.questions.length > 0)) {
      return {
        success: false,
        needsDescription: true,
        questions: data.questions ?? [],
        error: data.reason || 'More detail needed to tailor this tracker.',
      };
    }

    if (!data?.config) {
      throw new Error('No configuration returned from AI');
    }

    // If the returned config looks generic, require more detail and do not accept it
    if (isLikelyGenericConfig(data.config)) {
      return {
        success: false,
        needsDescription: true,
        questions: buildClarifyingQuestions(trackerName, selectedInterpretation),
        error: 'The generated setup is too generic. Please add a brief description to tailor it.',
      };
    }
    
    return {
      success: true,
      config: data.config as GeneratedTrackerConfig,
    };
  } catch (error) {
    console.error('Config generation failed:', error);

    const needsDescription = !userDescription;
    return {
      success: false,
      needsDescription,
      questions: needsDescription ? buildClarifyingQuestions(trackerName, selectedInterpretation) : [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get default/generic configuration for a custom tracker
 * Used when user skips AI generation
 */
export function getGenericConfig(trackerName: string): GeneratedTrackerConfig {
  return {
    intensityLabel: 'Level',
    intensityMinLabel: '1 - Low',
    intensityMaxLabel: '10 - High',
    intensityScale: 'neutral',
    locationLabel: 'Category',
    locationPlaceholder: 'Select a category',
    triggersLabel: 'Tags',
    notesLabel: 'Notes',
    notesPlaceholder: 'Add any notes or details...',
    addButtonLabel: `Log ${trackerName}`,
    formTitle: `Log ${trackerName}`,
    emptyStateTitle: `Welcome to ${trackerName}`,
    emptyStateDescription: `Start tracking ${trackerName.toLowerCase()} by logging your first entry. Understanding your patterns over time can provide valuable insights.`,
    emptyStateBullets: [
      'Track levels and patterns',
      'Identify trends over time',
      'Keep a personal record',
    ],
    entryTitle: `${trackerName} Entry`,
    deleteConfirmMessage: `Are you sure you want to delete this ${trackerName.toLowerCase()} entry? This action cannot be undone.`,
    locations: [
      { value: 'general', label: 'General' },
      { value: 'mild', label: 'Mild' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'severe', label: 'Severe' },
    ],
    triggers: ['Stress', 'Weather', 'Diet', 'Sleep', 'Activity', 'Medication', 'Other'],
    suggestedHashtags: ['tracking', 'health', 'wellness', 'log'],
  };
}
