/**
 * Datamuse Related Terms Service
 *
 * Fetches semantically related words/phrases from the free Datamuse API.
 * Useful for enriching tags/hashtags and providing domain hints.
 */

export interface RelatedTerms {
  terms: string[];
}

const DATAMUSE_URL = 'https://api.datamuse.com/words';

export async function fetchDatamuseRelated(term: string, max: number = 10): Promise<RelatedTerms | null> {
  try {
    const url = `${DATAMUSE_URL}?ml=${encodeURIComponent(term)}&max=${max}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const terms = data
      .map((item: any) => item?.word)
      .filter((w: string | undefined) => typeof w === 'string' && w.trim().length > 0);
    return terms.length ? { terms } : null;
  } catch {
    return null;
  }
}
