/**
 * User Management Functions
 *
 * Handles creating and managing users in the Convex database.
 * Users are linked to Clerk authentication via clerkId.
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current authenticated user from the database.
 * Returns null if not authenticated or user not found.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

/**
 * Get a user by their Clerk ID.
 * Used internally for linking auth to database records.
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

/**
 * Create or update a user record when they sign in.
 * Called when a user authenticates to ensure they exist in the database.
 */
export const upsertFromClerk = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existingUser) {
      // Update existing user if email changed
      if (existingUser.email !== identity.email) {
        await ctx.db.patch(existingUser._id, {
          email: identity.email ?? existingUser.email,
          displayName: identity.name ?? existingUser.displayName,
        });
      }
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      displayName: identity.name,
    });

    return userId;
  },
});

/**
 * Update the current user's profile.
 */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      displayName: args.displayName,
    });

    return user._id;
  },
});

/**
 * Internal mutation to create a user (used by webhooks).
 * This bypasses auth checks for use in internal flows.
 */
export const createInternal = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      displayName: args.displayName,
    });
  },
});

/**
 * Delete a user and all their data.
 * This is a destructive operation that removes all trackers and entries.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Delete all tracker entries for this user
    const entries = await ctx.db
      .query("trackerEntries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    // Delete all trackers for this user
    const trackers = await ctx.db
      .query("trackers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const tracker of trackers) {
      await ctx.db.delete(tracker._id);
    }

    // Delete the user
    await ctx.db.delete(user._id);

    return { success: true };
  },
});
