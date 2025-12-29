/**
 * Dictionary Service
 * 
 * Fetches word definitions from Free Dictionary API with caching in Supabase.
 */

import { supabaseClient } from '@/adapters/supabase/supabaseClient';
import type { DictionaryResult, DictionaryCacheEntry } from '@/types/generated-config';

const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Extract up to maxCount examples from dictionary API response meanings
 */
function extractExamples(meanings: { definitions?: { example?: string }[] }[], maxCount: number): string[] {
  const examples: string[] = [];
  for (const meaning of meanings) {
    for (const def of meaning.definitions ?? []) {
      if (def.example && examples.length < maxCount) {
        examples.push(def.example);
      }
    }
  }
  return examples;
}

/**
 * Extract all synonyms from dictionary API response meanings
 */
function extractSynonyms(meanings: { synonyms?: string[] }[]): string[] {
  const synonyms: string[] = [];
  for (const meaning of meanings) {
    if (Array.isArray(meaning.synonyms)) {
      synonyms.push(...meaning.synonyms);
    }
  }
  return synonyms;
}

/**
 * Extract ALL definitions from all meanings (up to maxCount)
 * Returns definitions with their part of speech for context
 */
function extractAllDefinitions(
  meanings: { partOfSpeech?: string; definitions?: { definition?: string }[] }[],
  maxCount: number
): string[] {
  const definitions: string[] = [];
  for (const meaning of meanings) {
    const pos = meaning.partOfSpeech ?? 'unknown';
    for (const def of meaning.definitions ?? []) {
      if (def.definition && definitions.length < maxCount) {
        definitions.push(`(${pos}) ${def.definition}`);
      }
    }
  }
  return definitions;
}

/**
 * Fetch word definition, checking cache first
 */
export async function lookupWord(word: string): Promise<DictionaryResult | null> {
  const normalizedWord = word.toLowerCase().trim();
  
  // 1. Check cache first
  const { data: cached, error: cacheError } = await supabaseClient
    .from('dictionary_cache')
    .select('*')
    .eq('word', normalizedWord)
    .limit(1)
    .single();
  
  if (!cacheError && cached) {
    const entry = cached as DictionaryCacheEntry;
    return {
      word: entry.word,
      definition: entry.definition,
      partOfSpeech: entry.part_of_speech,
      examples: entry.examples ?? [],
      synonyms: entry.synonyms ?? [],
    };
  }
  
  // 2. Fetch from API
  try {
    const response = await fetch(`${DICTIONARY_API_URL}/${encodeURIComponent(normalizedWord)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Word not found
      }
      throw new Error(`Dictionary API error: ${response.status}`);
    }
    
    const data = await response.json();
    const entry = data[0];
    
    // Extract ALL definitions from ALL meanings (up to 5) for better context
    const meanings = entry.meanings ?? [];
    const allDefinitions = extractAllDefinitions(meanings, 5);
    
    // Also keep first definition for backwards compatibility
    const firstMeaning = meanings[0];
    const firstDefinition = firstMeaning?.definitions?.[0];
    
    // Collect examples and synonyms using helper functions
    const examples = extractExamples(meanings, 3);
    const synonyms = extractSynonyms(meanings);
    
    const result: DictionaryResult = {
      word: entry.word,
      definition: firstDefinition?.definition ?? '',
      allDefinitions, // New field with all definitions for Gemini
      partOfSpeech: firstMeaning?.partOfSpeech,
      examples,
      synonyms: synonyms.slice(0, 10),
    };
    
    // 3. Cache the result (fire and forget)
    supabaseClient
      .from('dictionary_cache')
      .insert({
        word: normalizedWord,
        definition: result.definition,
        part_of_speech: result.partOfSpeech,
        examples: result.examples,
        synonyms: result.synonyms,
      })
      .then(({ error }) => {
        if (error) {
          console.warn('Failed to cache dictionary result:', error);
        }
      });
    
    return result;
  } catch (error) {
    console.error('Dictionary lookup failed:', error);
    return null;
  }
}

/**
 * Check if a word exists in dictionary (quick check without full lookup)
 */
export async function wordExists(word: string): Promise<boolean> {
  const result = await lookupWord(word);
  return result !== null;
}
