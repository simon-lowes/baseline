import { useState, useCallback } from 'react'
import { TrackerField } from '@/types/tracker-fields'
import { supabaseClient } from '@/adapters/supabase/supabaseClient'

interface FieldSuggestion extends TrackerField {
  reasoning: string
}

interface UseFieldSuggestionsState {
  currentSuggestion: FieldSuggestion | null
  acceptedFields: TrackerField[]
  skippedSuggestions: string[]
  isLoading: boolean
  error: string | null
}

export function useFieldSuggestions(trackerName: string, context?: string) {
  const [state, setState] = useState<UseFieldSuggestionsState>({
    currentSuggestion: null,
    acceptedFields: [],
    skippedSuggestions: [],
    isLoading: false,
    error: null,
  })

  const [suggestionQueue, setSuggestionQueue] = useState<FieldSuggestion[]>([])

  // Fetch new suggestions from edge function
  const fetchSuggestions = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const { data, error } = await supabaseClient.functions.invoke('generate-tracker-fields', {
        body: {
          trackerName,
          context,
          previousSuggestions: [
            ...state.acceptedFields,
            ...state.skippedSuggestions.map((label) => ({ label })),
          ],
        },
      })

      if (error) {
        throw error
      }

      const suggestions = data?.suggestions || []

      if (suggestions.length > 0) {
        setSuggestionQueue(suggestions)
        setState((prev) => ({
          ...prev,
          currentSuggestion: suggestions[0],
          isLoading: false,
        }))
      } else {
        setState((prev) => ({
          ...prev,
          currentSuggestion: null,
          isLoading: false,
        }))
      }
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to fetch field suggestions',
      }))
    }
  }, [trackerName, context, state.acceptedFields, state.skippedSuggestions])

  // Move to next suggestion in queue
  const moveToNextSuggestion = useCallback(() => {
    setSuggestionQueue((queue) => {
      const newQueue = queue.slice(1)
      setState((prev) => ({
        ...prev,
        currentSuggestion: newQueue[0] || null,
      }))
      return newQueue
    })
  }, [])

  // Accept current suggestion
  const acceptField = useCallback(() => {
    if (!state.currentSuggestion) return

    const { reasoning, ...field } = state.currentSuggestion
    const newField = {
      ...field,
      order: state.acceptedFields.length,
    }

    setState((prev) => ({
      ...prev,
      acceptedFields: [...prev.acceptedFields, newField],
    }))

    moveToNextSuggestion()
  }, [state.currentSuggestion, state.acceptedFields, moveToNextSuggestion])

  // Accept field with customizations
  const customizeField = useCallback((customizedField: TrackerField) => {
    setState((prev) => ({
      ...prev,
      acceptedFields: [...prev.acceptedFields, customizedField],
    }))

    moveToNextSuggestion()
  }, [state.acceptedFields, moveToNextSuggestion])

  // Skip current suggestion
  const skipField = useCallback(() => {
    if (!state.currentSuggestion) return

    setState((prev) => ({
      ...prev,
      skippedSuggestions: [...prev.skippedSuggestions, prev.currentSuggestion!.label],
    }))

    moveToNextSuggestion()
  }, [state.currentSuggestion, moveToNextSuggestion])

  // Add custom field manually
  const addCustomField = useCallback((field: TrackerField) => {
    setState((prev) => ({
      ...prev,
      acceptedFields: [...prev.acceptedFields, field],
    }))
  }, [])

  // Remove an accepted field
  const removeField = useCallback((fieldId: string) => {
    setState((prev) => ({
      ...prev,
      acceptedFields: prev.acceptedFields.filter((f) => f.id !== fieldId),
    }))
  }, [])

  // Update field order
  const updateFieldOrder = useCallback((reorderedFields: TrackerField[]) => {
    setState((prev) => ({
      ...prev,
      acceptedFields: reorderedFields,
    }))
  }, [])

  return {
    currentSuggestion: state.currentSuggestion,
    acceptedFields: state.acceptedFields,
    isLoading: state.isLoading,
    error: state.error,
    hasMoreSuggestions: suggestionQueue.length > 1,
    fetchSuggestions,
    acceptField,
    customizeField,
    skipField,
    addCustomField,
    removeField,
    updateFieldOrder,
  }
}
