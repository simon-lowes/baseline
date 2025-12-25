/**
 * Tracker Types
 * 
 * Core types for the multi-tracker system in Baseline
 */

import type { GeneratedTrackerConfig } from './generated-config';

/**
 * Preset tracker types that come with pre-configured fields and suggestions
 */
export type TrackerPresetId = 
  | 'chronic_pain'
  | 'mood'
  | 'menstrual_cycle'
  | 'sleep'
  | 'medication'
  | 'exercise';

/**
 * Tracker type - either a preset or custom
 */
export type TrackerType = 'preset' | 'custom';

/**
 * A tracker represents a category of things a user wants to track
 */
export interface Tracker {
  id: string;
  user_id: string;
  name: string;
  type: TrackerType;
  preset_id: TrackerPresetId | null;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  /** AI-generated configuration for custom trackers */
  generated_config?: GeneratedTrackerConfig | null;
  /** User-provided description when dictionary lookup fails */
  user_description?: string | null;
}

/**
 * Data required to create a new tracker
 */
export interface CreateTrackerInput {
  name: string;
  type?: TrackerType;
  preset_id?: TrackerPresetId | null;
  icon?: string;
  color?: string;
  is_default?: boolean;
  generated_config?: GeneratedTrackerConfig | null;
  user_description?: string | null;
}

/**
 * Data for updating an existing tracker
 */
export interface UpdateTrackerInput {
  name?: string;
  icon?: string;
  color?: string;
  is_default?: boolean;
  generated_config?: GeneratedTrackerConfig | null;
  user_description?: string | null;
}

/**
 * Preset tracker template with default configuration
 */
export interface TrackerPreset {
  id: TrackerPresetId;
  name: string;
  description: string;
  icon: string;
  color: string;
  suggestedCategories: string[];
  suggestedHashtags: string[];
}

/**
 * Available preset tracker templates
 */
export const TRACKER_PRESETS: TrackerPreset[] = [
  {
    id: 'chronic_pain',
    name: 'Chronic Pain',
    description: 'Track pain intensity, locations, and triggers',
    icon: 'activity',
    color: '#ef4444', // red-500
    suggestedCategories: ['Migraine', 'Back Pain', 'Joint Pain', 'Nerve Pain', 'Muscle Pain'],
    suggestedHashtags: ['#flareup', '#manageable', '#medication', '#physio', '#rest', '#trigger'],
  },
  {
    id: 'mood',
    name: 'Mood & Mental Health',
    description: 'Track your emotional wellbeing and mental health',
    icon: 'smile',
    color: '#8b5cf6', // violet-500
    suggestedCategories: ['Anxiety', 'Depression', 'Stress', 'Calm', 'Happy', 'Neutral'],
    suggestedHashtags: ['#therapy', '#meditation', '#exercise', '#socializing', '#isolation', '#trigger'],
  },
  {
    id: 'menstrual_cycle',
    name: 'Menstrual Cycle',
    description: 'Track your cycle, symptoms, and patterns',
    icon: 'moon',
    color: '#ec4899', // pink-500
    suggestedCategories: ['Period', 'Ovulation', 'PMS', 'Fertile Window'],
    suggestedHashtags: ['#cramps', '#bloating', '#headache', '#fatigue', '#cravings', '#emotional'],
  },
  {
    id: 'sleep',
    name: 'Sleep',
    description: 'Monitor sleep quality and patterns',
    icon: 'moon',
    color: '#3b82f6', // blue-500
    suggestedCategories: ['Insomnia', 'Restful', 'Disturbed', 'Oversleep'],
    suggestedHashtags: ['#nightmare', '#restless', '#refreshed', '#nap', '#caffeine', '#screen'],
  },
  {
    id: 'medication',
    name: 'Medication & Supplements',
    description: 'Track medications, dosages, and effects',
    icon: 'pill',
    color: '#10b981', // emerald-500
    suggestedCategories: ['Prescription', 'OTC', 'Supplement', 'Vitamin'],
    suggestedHashtags: ['#sideeffect', '#missed', '#refill', '#effective'],
  },
  {
    id: 'exercise',
    name: 'Exercise & Movement',
    description: 'Log workouts and physical activity',
    icon: 'dumbbell',
    color: '#f59e0b', // amber-500
    suggestedCategories: ['Cardio', 'Strength', 'Flexibility', 'Walking', 'Sports'],
    suggestedHashtags: ['#gym', '#outdoor', '#home', '#personal_best', '#recovery'],
  },
];

/**
 * Get a preset by its ID
 */
export function getTrackerPreset(presetId: TrackerPresetId): TrackerPreset | undefined {
  return TRACKER_PRESETS.find(p => p.id === presetId);
}
