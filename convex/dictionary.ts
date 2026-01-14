/**
 * Dictionary Cache Queries and Mutations
 *
 * Caches word definitions from external dictionary APIs.
 * This reduces API calls and provides faster lookups.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Cache entries expire after 30 days
const CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Look up a word in the cache.
 * Returns null if not found or expired.
 */
export const lookup = query({
  args: {
    word: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedWord = args.word.toLowerCase().trim();

    const cached = await ctx.db
      .query("dictionaryCache")
      .withIndex("by_word", (q) => q.eq("word", normalizedWord))
      .first();

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.fetchedAt > CACHE_EXPIRY_MS) {
      return null;
    }

    return cached;
  },
});

/**
 * Store a word definition in the cache.
 * Updates existing entries or creates new ones.
 */
export const store = mutation({
  args: {
    word: v.string(),
    definition: v.string(),
    partOfSpeech: v.optional(v.string()),
    examples: v.array(v.string()),
    synonyms: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedWord = args.word.toLowerCase().trim();

    // Check for existing entry
    const existing = await ctx.db
      .query("dictionaryCache")
      .withIndex("by_word", (q) => q.eq("word", normalizedWord))
      .first();

    const data = {
      word: normalizedWord,
      definition: args.definition,
      partOfSpeech: args.partOfSpeech,
      examples: args.examples,
      synonyms: args.synonyms,
      fetchedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("dictionaryCache", data);
  },
});

/**
 * Clear expired entries from the cache.
 * Can be called periodically to clean up old data.
 */
export const clearExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - CACHE_EXPIRY_MS;

    const allEntries = await ctx.db.query("dictionaryCache").collect();

    let deletedCount = 0;
    for (const entry of allEntries) {
      if (entry.fetchedAt < cutoff) {
        await ctx.db.delete(entry._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});
