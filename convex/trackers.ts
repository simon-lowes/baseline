/**
 * Tracker Queries and Mutations
 *
 * Handles all tracker-related operations for the Baseline app.
 * Each function checks authentication via getAuthUserId().
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Validates hex color format (#RRGGBB)
 * Prevents XSS and ensures consistency
 */
function validateHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * List all trackers for the current authenticated user.
 * Returns trackers ordered by creation time.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const trackers = await ctx.db
      .query("trackers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Sort by creation time (oldest first)
    return trackers.sort((a, b) => a._creationTime - b._creationTime);
  },
});

/**
 * Get a single tracker by ID.
 * Returns null if not found or user doesn't own it.
 */
export const get = query({
  args: {
    id: v.id("trackers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const tracker = await ctx.db.get(args.id);

    // Security: only return if user owns this tracker
    if (!tracker || tracker.userId !== userId) {
      return null;
    }

    return tracker;
  },
});

/**
 * Get the user's default tracker.
 * Returns null if no default is set.
 */
export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const tracker = await ctx.db
      .query("trackers")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", userId).eq("isDefault", true)
      )
      .first();

    return tracker;
  },
});

/**
 * Create a new tracker.
 * Validates inputs and enforces business rules.
 */
export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("preset"), v.literal("custom")),
    presetId: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    generatedConfig: v.optional(v.any()),
    userDescription: v.optional(v.string()),
    confirmedInterpretation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate custom trackers have a generated config
    if (args.type === "custom" && !args.generatedConfig) {
      throw new Error("Custom trackers require a generated configuration.");
    }

    // Validate color format
    const color = args.color ?? "#6366f1";
    if (!validateHexColor(color)) {
      throw new Error(
        "Color must be a valid hex color code in #RRGGBB format"
      );
    }

    // Prevent ambiguous tracker names without confirmation
    const AMBIGUOUS_TERMS = [
      "flying",
      "hockey",
      "curling",
      "reading",
      "drinking",
      "smoking",
      "shooting",
      "chilling",
      "running",
      "driving",
      "lifting",
      "bowling",
      "batting",
      "pressing",
      "cycling",
      "boxing",
      "climbing",
      "dancing",
      "walking",
      "fasting",
      "gaming",
      "training",
    ];
    if (
      AMBIGUOUS_TERMS.includes(args.name.toLowerCase()) &&
      !args.confirmedInterpretation
    ) {
      throw new Error(
        `Tracker name "${args.name}" is ambiguous and requires a confirmed interpretation before creation`
      );
    }

    // If setting as default, unset any existing defaults
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("trackers")
        .withIndex("by_user_default", (q) =>
          q.eq("userId", userId).eq("isDefault", true)
        )
        .collect();

      for (const tracker of existingDefaults) {
        await ctx.db.patch(tracker._id, { isDefault: false });
      }
    }

    const trackerId = await ctx.db.insert("trackers", {
      userId,
      name: args.name,
      type: args.type,
      presetId: args.presetId,
      icon: args.icon ?? "activity",
      color: color,
      isDefault: args.isDefault ?? false,
      schemaVersion: 2,
      generatedConfig: args.generatedConfig,
      userDescription: args.userDescription,
      confirmedInterpretation: args.confirmedInterpretation,
    });

    return await ctx.db.get(trackerId);
  },
});

/**
 * Update an existing tracker.
 * Only updates fields that are provided.
 */
export const update = mutation({
  args: {
    id: v.id("trackers"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    generatedConfig: v.optional(v.any()),
    userDescription: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageGeneratedAt: v.optional(v.number()),
    imageModelName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Tracker not found");
    }

    // Validate color if provided
    if (args.color && !validateHexColor(args.color)) {
      throw new Error(
        "Color must be a valid hex color code in #RRGGBB format"
      );
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
 * Delete a tracker and all its entries.
 */
export const remove = mutation({
  args: {
    id: v.id("trackers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify ownership
    const tracker = await ctx.db.get(args.id);
    if (!tracker || tracker.userId !== userId) {
      throw new Error("Tracker not found");
    }

    // Delete all entries for this tracker
    const entries = await ctx.db
      .query("trackerEntries")
      .withIndex("by_tracker", (q) => q.eq("trackerId", args.id))
      .collect();

    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    // Delete the tracker
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

/**
 * Set a tracker as the default.
 * Unsets any existing default first.
 */
export const setDefault = mutation({
  args: {
    id: v.id("trackers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify ownership
    const tracker = await ctx.db.get(args.id);
    if (!tracker || tracker.userId !== userId) {
      throw new Error("Tracker not found");
    }

    // Unset existing defaults
    const existingDefaults = await ctx.db
      .query("trackers")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", userId).eq("isDefault", true)
      )
      .collect();

    for (const existing of existingDefaults) {
      await ctx.db.patch(existing._id, { isDefault: false });
    }

    // Set new default
    await ctx.db.patch(args.id, { isDefault: true });

    return await ctx.db.get(args.id);
  },
});

/**
 * Ensure the user has a default tracker.
 * Creates a "Chronic Pain" preset tracker if none exists.
 */
export const ensureDefault = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check for existing default
    const existingDefault = await ctx.db
      .query("trackers")
      .withIndex("by_user_default", (q) =>
        q.eq("userId", userId).eq("isDefault", true)
      )
      .first();

    if (existingDefault) {
      return existingDefault;
    }

    // No default exists - create Chronic Pain tracker
    const trackerId = await ctx.db.insert("trackers", {
      userId,
      name: "Chronic Pain",
      type: "preset",
      presetId: "chronic_pain",
      icon: "activity",
      color: "#ef4444",
      isDefault: true,
      schemaVersion: 1,
    });

    return await ctx.db.get(trackerId);
  },
});
