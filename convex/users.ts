/**
 * User Management Functions
 *
 * Handles user profile data and account management.
 * Convex Auth handles the core users table - this manages additional profile data.
 */

import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current authenticated user's ID.
 * Returns null if not authenticated.
 */
export const currentUserId = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

/**
 * Get the current authenticated user with their profile.
 * Returns the auth user merged with profile data.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Get the auth user
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Get additional profile data if exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    return {
      ...user,
      displayName: profile?.displayName,
      profileEmail: profile?.email,
    };
  },
});

/**
 * Create or update the current user's profile.
 * Called after sign up to store additional profile data.
 */
export const upsertProfile = mutation({
  args: {
    email: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if profile exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        email: args.email,
        displayName: args.displayName,
      });
      return existingProfile._id;
    }

    // Create new profile
    return await ctx.db.insert("profiles", {
      userId,
      email: args.email,
      displayName: args.displayName,
    });
  },
});

/**
 * Update the current user's display name.
 */
export const updateDisplayName = mutation({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      // Create profile with display name
      return await ctx.db.insert("profiles", {
        userId,
        email: "",
        displayName: args.displayName,
      });
    }

    await ctx.db.patch(profile._id, {
      displayName: args.displayName,
    });

    return profile._id;
  },
});

/**
 * Delete the current user's account and all associated data.
 * This is a destructive operation.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Delete all tracker entries for this user
    const entries = await ctx.db
      .query("trackerEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    // Delete all trackers for this user
    const trackers = await ctx.db
      .query("trackers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const tracker of trackers) {
      await ctx.db.delete(tracker._id);
    }

    // Delete profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.delete(profile._id);
    }

    // Note: The auth user will be deleted separately via Convex Auth

    return { success: true };
  },
});

// =============================================================================
// Internal Functions (for migrations)
// =============================================================================

/**
 * Get profile by email - internal function for migrations.
 */
export const getProfileByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return profile;
  },
});
