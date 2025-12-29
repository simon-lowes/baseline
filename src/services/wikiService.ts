/**
 * Wikipedia Context Service
 *
 * Fetches a short summary and categories for a term from Wikipedia.
 * Uses public MediaWiki endpoints (no auth required).
 */

export interface WikipediaContext {
  summary?: string;
  categories?: string[];
}

const SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const ACTION_API = 'https://en.wikipedia.org/w/api.php';

/**
 * Fetch a concise Wikipedia summary for the given term.
 */
async function fetchSummary(term: string): Promise<string | undefined> {
  const url = `${SUMMARY_URL}/${encodeURIComponent(term)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return undefined;
  const data = await res.json();
  return typeof data.extract === 'string' ? data.extract : undefined;
}

/**
 * Fetch a handful of category names for the given term.
 */
async function fetchCategories(term: string, max: number = 6): Promise<string[] | undefined> {
  const url = `${ACTION_API}?origin=*&action=query&prop=categories&cllimit=${max}&format=json&titles=${encodeURIComponent(term)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) return undefined;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages || typeof pages !== 'object') return undefined;
  const firstPage = Object.values(pages)[0] as any;
  const cats = firstPage?.categories;
  if (!Array.isArray(cats)) return undefined;
  return cats
    .map((c: any) => c?.title?.replace(/^Category:/, ''))
    .filter((c: string | undefined) => typeof c === 'string');
}

/**
 * Fetch Wikipedia summary and categories for a term.
 */
export async function fetchWikipediaContext(term: string): Promise<WikipediaContext | null> {
  try {
    const [summary, categories] = await Promise.all([
      fetchSummary(term),
      fetchCategories(term),
    ]);

    if (!summary && (!categories || categories.length === 0)) {
      return null;
    }

    return {
      summary: summary || undefined,
      categories: categories && categories.length > 0 ? categories : undefined,
    };
  } catch (err) {
    // Fail silently; caller decides fallback
    return null;
  }
}
