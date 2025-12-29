/**
 * Config Generation Service
 * 
 * Orchestrates dictionary lookup and AI-powered configuration generation
 * for custom trackers.
 */

import { lookupWord } from './dictionaryService';
import { supabaseClient } from '@/adapters/supabase/supabaseClient';
import type { GeneratedTrackerConfig } from '@/types/generated-config';

export interface ConfigGenerationResult {
  success: boolean;
  config?: GeneratedTrackerConfig;
  needsDescription?: boolean;
  error?: string;
}

/**
 * Generate configuration for a custom tracker
 * 
 * @param trackerName - The name of the tracker (e.g., "Hypertension")
 * @param userDescription - Optional user-provided description (used when dictionary lookup fails)
 * @returns The generation result with config or status
 */
export async function generateTrackerConfig(
  trackerName: string,
  userDescription?: string
): Promise<ConfigGenerationResult> {
  try {
    let definition: string | undefined;
    let allDefinitions: string[] | undefined;
    
    // Try dictionary lookup first (unless user provided description)
    if (!userDescription) {
      const dictResult = await lookupWord(trackerName);
      if (dictResult) {
        definition = dictResult.definition;
        allDefinitions = dictResult.allDefinitions;
      }
      // If dictionary fails, we'll let Gemini use its own knowledge (no needsDescription)
    }
    
    // Call edge function to generate config
    // Gemini will use dictionary definitions if available, or its own knowledge otherwise
    const { data, error } = await supabaseClient.functions.invoke('generate-tracker-config', {
      body: {
        trackerName,
        definition,
        allDefinitions, // Pass all definitions for better context
        userDescription,
      },
    });
    
    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to generate configuration');
    }
    
    if (data?.error) {
      throw new Error(data.error);
    }
    
    if (!data?.config) {
      throw new Error('No configuration returned from AI');
    }
    
    return {
      success: true,
      config: data.config as GeneratedTrackerConfig,
    };
  } catch (error) {
    console.error('Config generation failed:', error);
    return {
      success: false,
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
