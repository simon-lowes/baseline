/**
 * Conversational Tracker Builder State Machine Types
 *
 * Defines the state machine for the AI-powered conversational
 * tracker creation flow.
 */

import type { GeneratedTrackerConfig, TrackerInterpretation } from './generated-config';

/**
 * Phases of the conversational tracker builder
 */
export type ConversationPhase =
  | 'idle' // Initial state, waiting for user input
  | 'checking' // Checking ambiguity with Gemini
  | 'disambiguate' // Showing AI interpretations + "Something else"
  | 'conversation' // Iterative Q&A with Gemini (one question at a time)
  | 'confirm' // Final "Anything else?" optional step
  | 'generating' // Creating the tracker
  | 'complete' // Done - tracker created
  | 'error'; // Error state

/**
 * A single message in the conversation
 */
export interface ConversationMessage {
  id: string;
  role: 'system' | 'user' | 'ai';
  content: string;
  timestamp: number;
  /** For AI messages, stores the question being asked */
  question?: string;
  /** For user messages, stores their answer */
  answer?: string;
}

/**
 * Full state of the conversational builder
 */
export interface ConversationState {
  phase: ConversationPhase;
  trackerName: string;

  // Disambiguation
  interpretations: TrackerInterpretation[];
  selectedInterpretation: TrackerInterpretation | null;
  disambiguationReason: string;

  // Conversation history
  messages: ConversationMessage[];
  currentQuestion: string | null;

  // Gemini confidence tracking
  confidence: number;
  questionCount: number;

  // Final state
  generatedConfig: GeneratedTrackerConfig | null;
  error: string | null;

  // UI state
  isLoading: boolean;
  userInput: string;
}

/**
 * Actions that can be dispatched to the state machine
 */
export type ConversationAction =
  | { type: 'SET_TRACKER_NAME'; name: string }
  | { type: 'START_CHECKING' }
  | {
      type: 'AMBIGUITY_FOUND';
      interpretations: TrackerInterpretation[];
      reason: string;
    }
  | { type: 'NO_AMBIGUITY' }
  | { type: 'SELECT_INTERPRETATION'; interpretation: TrackerInterpretation }
  | { type: 'SELECT_SOMETHING_ELSE' }
  | { type: 'ASK_QUESTION'; question: string; confidence: number }
  | { type: 'ANSWER_QUESTION'; answer: string }
  | { type: 'GEMINI_CONFIDENT'; config: GeneratedTrackerConfig }
  | { type: 'SHOW_FINAL_PROMPT' }
  | { type: 'ADD_FINAL_NOTE'; note: string }
  | { type: 'SKIP_FINAL' }
  | { type: 'START_GENERATING' }
  | { type: 'GENERATION_SUCCESS'; config: GeneratedTrackerConfig }
  | { type: 'GENERATION_ERROR'; error: string }
  | { type: 'RESET' };

/**
 * Result from conversational config generation
 */
export interface ConversationalConfigResult {
  needsQuestion: boolean;
  question?: string;
  confidence: number;
  finalQuestion?: boolean;
  config?: GeneratedTrackerConfig;
  error?: string;
}

/**
 * Conversation history entry for API calls
 */
export interface ConversationHistoryEntry {
  question: string;
  answer: string;
}
