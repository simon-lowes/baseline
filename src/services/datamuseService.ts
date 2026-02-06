/**
 * Datamuse Related Terms Service
 *
 * Fetches semantically related words/phrases from the free Datamuse API.
 * Useful for enriching tags/hashtags and providing domain hints.
 */

import { supabaseClient } from '@/adapters/supabase/supabaseClient';

export interface RelatedTerms {
  terms: string[];
}

const FUNCTION_NAME = 'datamuse-lookup';

export async function fetchDatamuseRelated(term: string, max: number = 10): Promise<RelatedTerms | null> {
  try {
    const normalizedTerm = term.trim();
    if (!normalizedTerm) return null;
    const { data, error } = await supabaseClient.functions.invoke(FUNCTION_NAME, {
      body: { term: normalizedTerm, max },
    });
    if (error) return null;
    const terms = Array.isArray(data?.terms)
      ? data.terms.filter((w: unknown) => typeof w === 'string' && w.trim().length > 0)
      : [];
    return terms.length ? { terms } : null;
  } catch (e) {
    console.error('Datamuse API failed:', e);
    return null;
  }
}
