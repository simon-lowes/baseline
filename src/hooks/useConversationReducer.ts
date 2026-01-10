import { useReducer, useCallback } from 'react';
import type {
  ConversationState,
  ConversationAction,
} from '@/types/conversation-state';

/**
 * Initial state for the conversational tracker builder
 */
const initialState: ConversationState = {
  phase: 'idle',
  trackerName: '',
  interpretations: [],
  selectedInterpretation: null,
  disambiguationReason: '',
  suggestedCorrection: undefined,
  messages: [],
  currentQuestion: null,
  confidence: 0,
  questionCount: 0,
  generatedConfig: null,
  error: null,
  isLoading: false,
  userInput: '',
};

/**
 * State machine reducer for conversational tracker builder
 *
 * State flow:
 * idle → checking → disambiguate → conversation ↔ (loop) → confirm → generating → complete
 *                        ↓                ↑
 *                  (if not ambiguous)     |
 *                        ↓                |
 *                   conversation          |
 *                        ↓                |
 *            (if "Something else")        |
 *                        ↓                |
 *                     clarify ─────────────┘
 */
function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'SET_TRACKER_NAME':
      return { ...state, trackerName: action.name };

    case 'START_CHECKING':
      return { ...state, phase: 'checking', isLoading: true, error: null };

    case 'AMBIGUITY_FOUND':
      return {
        ...state,
        phase: 'disambiguate',
        isLoading: false,
        interpretations: action.interpretations,
        disambiguationReason: action.reason,
        suggestedCorrection: action.suggestedCorrection,
      };

    case 'NO_AMBIGUITY':
      return { ...state, phase: 'conversation', isLoading: true };

    case 'SELECT_INTERPRETATION':
      return {
        ...state,
        selectedInterpretation: action.interpretation,
        phase: 'conversation',
        isLoading: true,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: `I want to track: ${action.interpretation.label}${action.interpretation.description ? ` - ${action.interpretation.description}` : ''}`,
            timestamp: Date.now(),
          },
        ],
      };

    case 'SELECT_SOMETHING_ELSE':
      // Instead of going directly to conversation phase,
      // go to clarify phase to ask user what they mean
      return {
        ...state,
        selectedInterpretation: {
          value: 'other',
          label: 'Something else',
          description: '',
        },
        phase: 'clarify',
        isLoading: false,
        // Add clarifying question to messages
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'ai',
            content: `What do you mean by "${state.trackerName}"?`,
            question: `What do you mean by "${state.trackerName}"?`,
            timestamp: Date.now(),
          },
        ],
      };

    case 'SET_CLARIFICATION':
      // User has explained what they mean, now proceed to conversation
      return {
        ...state,
        selectedInterpretation: {
          value: 'other',
          label: action.explanation,
          description: action.explanation,
        },
        phase: 'conversation',
        isLoading: true,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: action.explanation,
            answer: action.explanation,
            timestamp: Date.now(),
          },
        ],
      };

    case 'ASK_QUESTION':
      return {
        ...state,
        phase: 'conversation',
        isLoading: false,
        currentQuestion: action.question,
        confidence: action.confidence,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'ai',
            content: action.question,
            question: action.question,
            timestamp: Date.now(),
          },
        ],
      };

    case 'ANSWER_QUESTION':
      return {
        ...state,
        isLoading: true,
        questionCount: state.questionCount + 1,
        currentQuestion: null,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: action.answer,
            answer: action.answer,
            timestamp: Date.now(),
          },
        ],
        userInput: '',
      };

    case 'GEMINI_CONFIDENT':
      return {
        ...state,
        phase: 'confirm',
        isLoading: false,
        generatedConfig: action.config,
        confidence: 1.0,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'ai',
            content:
              "I have enough information to create your tracker. Is there anything else you'd like to add?",
            timestamp: Date.now(),
          },
        ],
      };

    case 'SHOW_FINAL_PROMPT':
      return { ...state, phase: 'confirm', isLoading: false };

    case 'ADD_FINAL_NOTE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: action.note,
            timestamp: Date.now(),
          },
        ],
        isLoading: true,
      };

    case 'SKIP_FINAL':
    case 'START_GENERATING':
      return { ...state, phase: 'generating', isLoading: true };

    case 'GENERATION_SUCCESS':
      return {
        ...state,
        phase: 'complete',
        isLoading: false,
        generatedConfig: action.config,
      };

    case 'GENERATION_ERROR':
      return { ...state, phase: 'error', isLoading: false, error: action.error };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

/**
 * Hook for managing conversational tracker builder state
 *
 * @returns State, dispatch function, and reset helper
 *
 * @example
 * ```tsx
 * const { state, dispatch, reset } = useConversationReducer();
 *
 * // Start checking ambiguity
 * dispatch({ type: 'START_CHECKING' });
 *
 * // Handle ambiguity found
 * dispatch({
 *   type: 'AMBIGUITY_FOUND',
 *   interpretations: [...],
 *   reason: 'This term has multiple meanings'
 * });
 *
 * // Reset to initial state
 * reset();
 * ```
 */
export function useConversationReducer() {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, dispatch, reset };
}

export { initialState };
