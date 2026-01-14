/**
 * Tracker Entry Queries and Mutations
 *
 * Handles individual data points logged by users.
 * Each entry belongs to a tracker and records metrics like intensity,
 * locations, triggers, notes, and custom field values.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all entries for a specific tracker.
 * Returns entries ordered by timestamp (newest first by default).
 */
export const list = query({
  args: {
    trackerId: v.id("trackers"),
    limit: v.optional(v.number()),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify user owns the tracker
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker || tracker.userId !== userId) {
      return [];
    }

    const baseQuery = ctx.db
      .query("trackerEntries")
      .withIndex("by_tracker_timestamp", (q) =>
        q.eq("trackerId", args.trackerId)
      );

    // Default to descending (newest first)
    const entries = await (args.order === "asc"
      ? baseQuery.order("asc")
      : baseQuery.order("desc")
    ).collect();

    // Apply limit if specified
    if (args.limit && args.limit > 0) {
      return entries.slice(0, args.limit);
    }

    return entries;
  },
});

/**
 * List entries for all trackers owned by the user.
 * Useful for dashboard views showing recent activity across trackers.
 */
export const listAll = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const entries = await ctx.db
      .query("trackerEntries")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (args.limit && args.limit > 0) {
      return entries.slice(0, args.limit);
    }

    return entries;
  },
});

/**
 * Get a single entry by ID.
 * Returns null if not found or user doesn't own it.
 */
export const get = query({
  args: {
    id: v.id("trackerEntries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const entry = await ctx.db.get(args.id);

    // Security: only return if user owns this entry
    if (!entry || entry.userId !== userId) {
      return null;
    }

    return entry;
  },
});

/**
 * Create a new tracker entry.
 * Validates that the user owns the target tracker.
 */
export const create = mutation({
  args: {
    trackerId: v.id("trackers"),
    timestamp: v.optional(v.number()),
    intensity: v.number(),
    locations: v.array(v.string()),
    notes: v.string(),
    triggers: v.array(v.string()),
    hashtags: v.array(v.string()),
    fieldValues: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the tracker
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker || tracker.userId !== userId) {
      throw new Error("Tracker not found");
    }

    // Validate intensity is in range
    if (args.intensity < 1 || args.intensity > 10) {
      throw new Error("Intensity must be between 1 and 10");
    }

    const entryId = await ctx.db.insert("trackerEntries", {
      userId,
      trackerId: args.trackerId,
      timestamp: args.timestamp ?? Date.now(),
      intensity: args.intensity,
      locations: args.locations,
      notes: args.notes,
      triggers: args.triggers,
      hashtags: args.hashtags,
      fieldValues: args.fieldValues,
    });

    return await ctx.db.get(entryId);
  },
});

/**
 * Update an existing entry.
 * Only updates fields that are provided.
 */
export const update = mutation({
  args: {
    id: v.id("trackerEntries"),
    timestamp: v.optional(v.number()),
    intensity: v.optional(v.number()),
    locations: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
    hashtags: v.optional(v.array(v.string())),
    fieldValues: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Entry not found");
    }

    // Validate intensity if provided
    if (
      args.intensity !== undefined &&
      (args.intensity < 1 || args.intensity > 10)
    ) {
      throw new Error("Intensity must be between 1 and 10");
    }

    // Build update object, excluding id
    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);

    return await ctx.db.get(id);
  },
});

/**
 * Delete an entry.
 */
export const remove = mutation({
  args: {
    id: v.id("trackerEntries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify ownership
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) {
      throw new Error("Entry not found");
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});

/**
 * DEBUG: Count all entries in the database (no auth required).
 * TEMPORARY - Remove after debugging.
 */
export const debugCountAll = query({
  args: {},
  handler: async (ctx) => {
    const allEntries = await ctx.db.query("trackerEntries").collect();
    const allTrackers = await ctx.db.query("trackers").collect();
    const allUsers = await ctx.db.query("users").collect();

    // Get authenticated user ID for comparison
    const authUserId = await getAuthUserId(ctx);

    // Group entries by userId to see distribution
    const byUser = new Map<string, number>();
    for (const entry of allEntries) {
      const uid = entry.userId;
      byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
    }

    // Get profiles to see which email belongs to which userId
    const profiles = await ctx.db.query("profiles").collect();

    // Get auth accounts to see email mappings
    const authAccounts = await ctx.db.query("authAccounts").collect();

    return {
      totalEntries: allEntries.length,
      totalTrackers: allTrackers.length,
      totalUsers: allUsers.length,
      authenticatedUserId: authUserId,
      allUserIds: allUsers.map(u => u._id),
      profiles: profiles.map(p => ({ userId: p.userId, email: p.email })),
      authAccounts: authAccounts.map(a => ({
        userId: a.userId,
        providerAccountId: a.providerAccountId,
        provider: a.provider
      })),
      entriesByUser: Object.fromEntries(byUser),
      trackersByUser: Object.fromEntries(
        allTrackers.reduce((acc, t) => {
          acc.set(t.userId, (acc.get(t.userId) ?? 0) + 1);
          return acc;
        }, new Map<string, number>())
      ),
      recentEntries: allEntries.slice(0, 5).map(e => ({
        id: e._id,
        trackerId: e.trackerId,
        userId: e.userId,
        timestamp: e.timestamp,
        intensity: e.intensity,
      })),
    };
  },
});

/**
 * Get entry statistics for a tracker.
 * Returns aggregated data like average intensity, entry count, etc.
 */
export const getStats = query({
  args: {
    trackerId: v.id("trackers"),
    startTimestamp: v.optional(v.number()),
    endTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Verify user owns the tracker
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker || tracker.userId !== userId) {
      return null;
    }

    const entries = await ctx.db
      .query("trackerEntries")
      .withIndex("by_tracker_timestamp", (q) =>
        q.eq("trackerId", args.trackerId)
      )
      .collect();

    // Filter by time range if specified
    let filtered = entries;
    if (args.startTimestamp) {
      filtered = filtered.filter((e) => e.timestamp >= args.startTimestamp!);
    }
    if (args.endTimestamp) {
      filtered = filtered.filter((e) => e.timestamp <= args.endTimestamp!);
    }

    if (filtered.length === 0) {
      return {
        count: 0,
        averageIntensity: null,
        minIntensity: null,
        maxIntensity: null,
        commonLocations: [],
        commonTriggers: [],
        commonHashtags: [],
      };
    }

    // Calculate statistics
    const intensities = filtered.map((e) => e.intensity);
    const avgIntensity =
      intensities.reduce((a, b) => a + b, 0) / intensities.length;

    // Count occurrences of locations, triggers, hashtags
    const locationCounts = new Map<string, number>();
    const triggerCounts = new Map<string, number>();
    const hashtagCounts = new Map<string, number>();

    for (const entry of filtered) {
      for (const loc of entry.locations) {
        locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
      }
      for (const trig of entry.triggers) {
        triggerCounts.set(trig, (triggerCounts.get(trig) ?? 0) + 1);
      }
      for (const tag of entry.hashtags) {
        hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1);
      }
    }

    // Get top 5 of each
    const topN = (map: Map<string, number>, n: number) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([value, count]) => ({ value, count }));

    return {
      count: filtered.length,
      averageIntensity: Math.round(avgIntensity * 10) / 10,
      minIntensity: Math.min(...intensities),
      maxIntensity: Math.max(...intensities),
      commonLocations: topN(locationCounts, 5),
      commonTriggers: topN(triggerCounts, 5),
      commonHashtags: topN(hashtagCounts, 5),
    };
  },
});
