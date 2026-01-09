/**
 * ConversationalTrackerBuilder
 *
 * A chat-like interface for creating custom trackers using Gemini AI.
 * Features:
 * - Disambiguation of ambiguous tracker names
 * - One question at a time, conversational flow
 * - Final "Anything else?" prompt before creation
 */

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, MessageCircle, ChevronRight, SkipForward, Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useConversationReducer } from '@/hooks/useConversationReducer';
import {
  checkAmbiguity,
  generateTrackerConfigConversational,
} from '@/services/configGenerationService';
import type { GeneratedTrackerConfig, TrackerInterpretation } from '@/types/generated-config';
import type { ConversationMessage, ConversationHistoryEntry } from '@/types/conversation-state';

interface ConversationalTrackerBuilderProps {
  onComplete: (config: GeneratedTrackerConfig, trackerName: string) => void;
  onCancel: () => void;
}

/**
 * Build conversation history for API calls from messages
 */
function buildConversationHistory(
  messages: ConversationMessage[]
): ConversationHistoryEntry[] {
  const history: ConversationHistoryEntry[] = [];
  let currentQuestion: string | null = null;

  for (const msg of messages) {
    if (msg.role === 'ai' && msg.question) {
      currentQuestion = msg.question;
    } else if (msg.role === 'user' && currentQuestion) {
      history.push({ question: currentQuestion, answer: msg.content });
      currentQuestion = null;
    }
  }

  return history;
}

export function ConversationalTrackerBuilder({
  onComplete,
  onCancel,
}: ConversationalTrackerBuilderProps) {
  const { state, dispatch, reset } = useConversationReducer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [nameInput, setNameInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [finalNote, setFinalNote] = useState('');

  // Auto-scroll to bottom only when new messages are added (conversation flow)
  useEffect(() => {
    // Only auto-scroll when messages change, not on phase changes
    if (state.messages.length === 0) return;

    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth',
          });
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [state.messages.length]);

  // Focus appropriate input when phase changes
  useEffect(() => {
    if (state.phase === 'idle' && inputRef.current) {
      inputRef.current.focus();
    } else if (state.phase === 'conversation' && !state.isLoading && inputRef.current) {
      inputRef.current.focus();
    } else if (state.phase === 'confirm' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [state.phase, state.isLoading]);

  /**
   * Ask the next question from Gemini
   */
  const askNextQuestion = useCallback(
    async (
      trackerName: string,
      interpretation?: TrackerInterpretation,
      existingMessages?: ConversationMessage[]
    ) => {
      const history = buildConversationHistory(existingMessages || state.messages);

      const result = await generateTrackerConfigConversational(
        trackerName,
        interpretation?.value !== 'other'
          ? `${interpretation?.label}: ${interpretation?.description}`
          : undefined,
        history
      );

      if (result.error) {
        dispatch({ type: 'GENERATION_ERROR', error: result.error });
        return;
      }

      if (result.needsQuestion && result.question) {
        dispatch({
          type: 'ASK_QUESTION',
          question: result.question,
          confidence: result.confidence,
        });
      } else if (result.config) {
        dispatch({ type: 'GEMINI_CONFIDENT', config: result.config });
      }
    },
    [state.messages, dispatch]
  );

  /**
   * Handle initial tracker name submission
   */
  const handleNameSubmit = useCallback(async () => {
    const name = nameInput.trim();
    if (!name) return;

    dispatch({ type: 'SET_TRACKER_NAME', name });
    dispatch({ type: 'START_CHECKING' });

    try {
      const ambiguity = await checkAmbiguity(name);

      if (ambiguity.isAmbiguous && ambiguity.interpretations.length > 0) {
        dispatch({
          type: 'AMBIGUITY_FOUND',
          interpretations: ambiguity.interpretations,
          reason: ambiguity.reason,
        });
      } else {
        dispatch({ type: 'NO_AMBIGUITY' });
        // Start conversation immediately
        await askNextQuestion(name);
      }
    } catch (error) {
      dispatch({
        type: 'GENERATION_ERROR',
        error: error instanceof Error ? error.message : 'Failed to check ambiguity',
      });
    }
  }, [nameInput, dispatch, askNextQuestion]);

  /**
   * Handle interpretation selection
   */
  const handleInterpretationSelect = useCallback(
    async (interp: TrackerInterpretation) => {
      dispatch({ type: 'SELECT_INTERPRETATION', interpretation: interp });

      // Create the message that will be added
      const newMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `I want to track: ${interp.label}${interp.description ? ` - ${interp.description}` : ''}`,
        timestamp: Date.now(),
      };

      try {
        await askNextQuestion(state.trackerName, interp, [...state.messages, newMessage]);
      } catch (error) {
        dispatch({
          type: 'GENERATION_ERROR',
          error: error instanceof Error ? error.message : 'Failed to process selection',
        });
      }
    },
    [state.trackerName, state.messages, dispatch, askNextQuestion]
  );

  /**
   * Handle "Something else" selection
   */
  const handleSomethingElse = useCallback(async () => {
    const otherInterp: TrackerInterpretation = {
      value: 'other',
      label: 'Something else',
      description: '',
    };
    dispatch({ type: 'SELECT_SOMETHING_ELSE' });
    try {
      await askNextQuestion(state.trackerName, otherInterp, state.messages);
    } catch (error) {
      dispatch({
        type: 'GENERATION_ERROR',
        error: error instanceof Error ? error.message : 'Failed to process selection',
      });
    }
  }, [state.trackerName, state.messages, dispatch, askNextQuestion]);

  /**
   * Handle answer submission
   */
  const handleAnswerSubmit = useCallback(async () => {
    const answer = answerInput.trim();
    if (!answer) return;

    dispatch({ type: 'ANSWER_QUESTION', answer });
    setAnswerInput('');

    // Build updated messages with the new answer
    const newMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: answer,
      answer,
      timestamp: Date.now(),
    };
    const updatedMessages = [...state.messages, newMessage];
    const history = buildConversationHistory(updatedMessages);

    try {
      const result = await generateTrackerConfigConversational(
        state.trackerName,
        state.selectedInterpretation?.value !== 'other'
          ? `${state.selectedInterpretation?.label}: ${state.selectedInterpretation?.description}`
          : undefined,
        history
      );

      if (result.error) {
        dispatch({ type: 'GENERATION_ERROR', error: result.error });
        return;
      }

      if (result.needsQuestion && result.question) {
        dispatch({
          type: 'ASK_QUESTION',
          question: result.question,
          confidence: result.confidence,
        });
      } else if (result.config) {
        dispatch({ type: 'GEMINI_CONFIDENT', config: result.config });
      }
    } catch (error) {
      dispatch({
        type: 'GENERATION_ERROR',
        error: error instanceof Error ? error.message : 'Failed to process answer',
      });
    }
  }, [answerInput, state, dispatch]);

  /**
   * Get the effective tracker name - use interpretation label if selected, otherwise original name
   */
  const getEffectiveTrackerName = useCallback(() => {
    if (state.selectedInterpretation && state.selectedInterpretation.value !== 'other') {
      return state.selectedInterpretation.label;
    }
    return state.trackerName;
  }, [state.selectedInterpretation, state.trackerName]);

  /**
   * Handle skip final note
   */
  const handleSkipFinal = useCallback(() => {
    dispatch({ type: 'SKIP_FINAL' });
    if (state.generatedConfig) {
      onComplete(state.generatedConfig, getEffectiveTrackerName());
    }
  }, [state.generatedConfig, getEffectiveTrackerName, dispatch, onComplete]);

  /**
   * Handle final note submission
   */
  const handleFinalNoteSubmit = useCallback(async () => {
    const note = finalNote.trim();
    if (!note) {
      handleSkipFinal();
      return;
    }

    dispatch({ type: 'ADD_FINAL_NOTE', note });

    // One more generation with the final note
    const newMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: note,
      timestamp: Date.now(),
    };
    const updatedMessages = [...state.messages, newMessage];
    const history = buildConversationHistory(updatedMessages);

    try {
      const result = await generateTrackerConfigConversational(
        state.trackerName,
        state.selectedInterpretation?.value !== 'other'
          ? `${state.selectedInterpretation?.label}: ${state.selectedInterpretation?.description}`
          : undefined,
        history
      );

      dispatch({ type: 'START_GENERATING' });

      const effectiveName = getEffectiveTrackerName();
      if (result.config) {
        onComplete(result.config, effectiveName);
      } else if (state.generatedConfig) {
        onComplete(state.generatedConfig, effectiveName);
      }
    } catch (error) {
      dispatch({
        type: 'GENERATION_ERROR',
        error: error instanceof Error ? error.message : 'Failed to create tracker',
      });
    }
  }, [finalNote, state, dispatch, onComplete, handleSkipFinal, getEffectiveTrackerName]);

  /**
   * Handle key press for inputs
   */
  const handleKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, action: () => void) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        action();
      }
    },
    []
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Create Custom Tracker</h2>
      </div>

      {/* Conversation area */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
        <div className="p-4 space-y-4 pb-6">
          <AnimatePresence mode="popLayout">
            {/* Initial prompt */}
            {state.phase === 'idle' && (
              <motion.div
                key="initial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <ChatBubble role="ai">
                  What would you like to track? Enter a name for your custom tracker.
                </ChatBubble>
                <div className="flex gap-2 pl-11">
                  <Input
                    ref={inputRef}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, handleNameSubmit)}
                    placeholder="e.g., Debt, Headaches, Running..."
                    className="flex-1"
                  />
                  <Button onClick={handleNameSubmit} disabled={!nameInput.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Loading state */}
            {state.phase === 'checking' && (
              <LoadingBubble key="checking" message="Analyzing your request..." />
            )}

            {/* Disambiguation */}
            {state.phase === 'disambiguate' && (
              <motion.div
                key="disambiguate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pb-16"
              >
                <ChatBubble role="ai">
                  {state.disambiguationReason ||
                    `"${state.trackerName}" could mean different things. What would you like to track?`}
                </ChatBubble>

                {/* Interpretation buttons */}
                <div className="grid gap-2 pl-11">
                  {state.interpretations.map((interp) => (
                    <motion.button
                      key={interp.value}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleInterpretationSelect(interp)}
                      className="flex flex-col items-start gap-1 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-left transition-colors"
                    >
                      <span className="font-medium text-sm">{interp.label}</span>
                      {interp.description && (
                        <span className="text-xs text-muted-foreground">
                          {interp.description}
                        </span>
                      )}
                    </motion.button>
                  ))}

                  {/* Something else option */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleSomethingElse}
                    className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 text-left transition-colors"
                  >
                    <span className="font-medium text-sm">Something else</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Conversation messages */}
            {state.messages.map((msg, idx) => (
              <ChatBubble key={msg.id} role={msg.role} index={idx}>
                {msg.content}
              </ChatBubble>
            ))}

            {/* Current question input */}
            {state.phase === 'conversation' && state.currentQuestion && !state.isLoading && (
              <motion.div
                key="question-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 pl-11"
              >
                <Input
                  ref={inputRef}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, handleAnswerSubmit)}
                  placeholder="Type your answer..."
                  className="flex-1"
                />
                <Button onClick={handleAnswerSubmit} disabled={!answerInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Loading next question */}
            {state.isLoading && state.phase === 'conversation' && (
              <LoadingBubble key="thinking" message="Thinking..." />
            )}

            {/* Final confirmation */}
            {state.phase === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="pl-11 space-y-3">
                  <Textarea
                    ref={textareaRef}
                    value={finalNote}
                    onChange={(e) => setFinalNote(e.target.value)}
                    placeholder="Any additional details... (optional)"
                    rows={2}
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSkipFinal}
                      className="flex-1 gap-2"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip & Create
                    </Button>
                    <Button
                      onClick={handleFinalNoteSubmit}
                      className="flex-1"
                    >
                      {finalNote.trim() ? 'Add & Create' : 'Create Tracker'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Generating */}
            {state.phase === 'generating' && (
              <LoadingBubble key="generating" message="Creating your tracker..." />
            )}

            {/* Error */}
            {state.phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="bg-destructive/10 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm text-destructive">{state.error}</p>
                  </div>
                </div>
                <div className="pl-11">
                  <Button variant="outline" onClick={reset}>
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer with cancel */}
      <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button variant="ghost" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * Chat bubble component
 */
function ChatBubble({
  role,
  children,
  index = 0,
}: {
  role: 'ai' | 'user' | 'system';
  children: React.ReactNode;
  index?: number;
}) {
  const isAI = role === 'ai' || role === 'system';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn('flex gap-3', isAI ? 'flex-row' : 'flex-row-reverse')}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isAI ? 'bg-primary/10' : 'bg-muted'
        )}
      >
        {isAI ? (
          <Sparkles className="w-4 h-4 text-primary" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isAI
            ? 'bg-muted rounded-tl-sm'
            : 'bg-primary text-primary-foreground rounded-tr-sm'
        )}
      >
        <p className="text-sm">{children}</p>
      </div>
    </motion.div>
  );
}

/**
 * Loading bubble component
 */
function LoadingBubble({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </motion.div>
  );
}

export default ConversationalTrackerBuilder;
