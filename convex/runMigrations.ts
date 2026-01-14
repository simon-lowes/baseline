/**
 * Public actions to run migrations from Supabase to Convex.
 * These can be called from the CLI or dashboard.
 */

import { action, query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// =============================================================================
// Dictionary Cache Migration (No user dependency)
// =============================================================================

/**
 * Import dictionary cache entries from Supabase.
 * This has no user dependency and can be run first.
 */
export const runDictionaryMigration = action({
  args: {
    entries: v.array(
      v.object({
        word: v.string(),
        definition: v.string(),
        part_of_speech: v.optional(v.string()),
        examples: v.array(v.string()),
        synonyms: v.array(v.string()),
        fetched_at: v.string(),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ imported: number; skipped: number }> => {
    const result = await ctx.runMutation(
      internal.migrations.importDictionaryCache,
      {
        entries: args.entries,
      }
    );
    return result as { imported: number; skipped: number };
  },
});

// =============================================================================
// User Mapping Helpers
// =============================================================================

/**
 * Create user mapping table entry.
 * Maps Supabase UUID to Convex user ID.
 */
export const createUserMapping = mutation({
  args: {
    supabaseUserId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the Convex user by email (from profiles table)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!profile) {
      console.log(`[Migration] No profile found for email: ${args.email}`);
      return null;
    }

    // Check if mapping already exists
    const existing = await ctx.db
      .query("userMappings")
      .withIndex("by_supabase_id", (q) =>
        q.eq("supabaseUserId", args.supabaseUserId)
      )
      .first();

    if (existing) {
      console.log(
        `[Migration] Mapping already exists: ${args.supabaseUserId} -> ${existing.convexUserId}`
      );
      return existing.convexUserId;
    }

    // Create new mapping
    await ctx.db.insert("userMappings", {
      supabaseUserId: args.supabaseUserId,
      convexUserId: profile.userId,
      email: args.email,
    });

    console.log(
      `[Migration] Created mapping: ${args.supabaseUserId} -> ${profile.userId}`
    );
    return profile.userId;
  },
});

/**
 * Get all user mappings.
 */
export const getUserMappings = query({
  args: {},
  handler: async (ctx) => {
    const mappings = await ctx.db.query("userMappings").collect();
    const result: Record<string, string> = {};
    for (const m of mappings) {
      result[m.supabaseUserId] = m.convexUserId;
    }
    return result;
  },
});

// =============================================================================
// Tracker Migration
// =============================================================================

/**
 * Import trackers from Supabase.
 * Requires user mappings to be set up first.
 */
export const runTrackerMigration = action({
  args: {
    trackers: v.array(
      v.object({
        id: v.string(),
        user_id: v.string(),
        name: v.string(),
        type: v.union(v.literal("preset"), v.literal("custom")),
        preset_id: v.optional(v.union(v.string(), v.null())),
        icon: v.optional(v.union(v.string(), v.null())),
        color: v.optional(v.union(v.string(), v.null())),
        is_default: v.boolean(),
        schema_version: v.number(),
        generated_config: v.optional(v.union(v.any(), v.null())),
        user_description: v.optional(v.union(v.string(), v.null())),
        image_url: v.optional(v.union(v.string(), v.null())),
        image_generated_at: v.optional(v.union(v.string(), v.null())),
        image_model_name: v.optional(v.union(v.string(), v.null())),
        confirmed_interpretation: v.optional(v.union(v.string(), v.null())),
      })
    ),
    userMapping: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, string>> => {
    const result = await ctx.runMutation(internal.migrations.importTrackers, {
      trackers: args.trackers,
      userMapping: args.userMapping,
    });
    return result as Record<string, string>;
  },
});

// =============================================================================
// Entry Migration
// =============================================================================

/**
 * Import entries from Supabase.
 * Requires both user and tracker mappings.
 * Note: timestamp should be ISO string format.
 */
export const runEntryMigration = action({
  args: {
    entries: v.array(
      v.object({
        id: v.string(),
        user_id: v.string(),
        tracker_id: v.string(),
        timestamp: v.union(v.string(), v.number()), // Accept both formats
        intensity: v.number(),
        locations: v.array(v.string()),
        notes: v.string(),
        triggers: v.array(v.string()),
        hashtags: v.array(v.string()),
        field_values: v.optional(v.any()),
      })
    ),
    userMapping: v.record(v.string(), v.string()),
    trackerMapping: v.record(v.string(), v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ imported: number; skipped: number }> => {
    // Convert numeric timestamps to ISO strings
    const normalizedEntries = args.entries.map((entry) => ({
      ...entry,
      timestamp:
        typeof entry.timestamp === "number"
          ? new Date(entry.timestamp).toISOString()
          : entry.timestamp,
    }));

    const result = await ctx.runMutation(internal.migrations.importEntries, {
      entries: normalizedEntries,
      userMapping: args.userMapping,
      trackerMapping: args.trackerMapping,
    });
    return result as { imported: number; skipped: number };
  },
});

// =============================================================================
// Migration Stats (Public Query)
// =============================================================================

/**
 * Debug: Check entry-tracker linkage and user accounts.
 */
export const debugEntryTrackerLinkage = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("trackerEntries").take(10);
    const trackers = await ctx.db.query("trackers").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const authAccounts = await ctx.db.query("authAccounts").collect();

    const trackerMap = new Map(trackers.map(t => [t._id, t.name]));

    return {
      sampleEntries: entries.map(e => ({
        entryUserId: e.userId,
        trackerId: e.trackerId,
        trackerName: trackerMap.get(e.trackerId) || "NOT FOUND",
        timestamp: new Date(e.timestamp).toISOString(),
      })),
      allTrackers: trackers.map(t => ({ id: t._id, name: t.name, userId: t.userId })),
      profiles: profiles.map(p => ({ email: p.email, userId: p.userId })),
      authAccounts: authAccounts.map(a => ({
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        userId: a.userId
      })),
    };
  },
});

/**
 * Get current record counts.
 */
export const getMigrationStats = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const trackers = await ctx.db.query("trackers").collect();
    const entries = await ctx.db.query("trackerEntries").collect();
    const dictionary = await ctx.db.query("dictionaryCache").collect();
    const users = await ctx.db.query("users").collect();

    // Try to get user mappings if table exists
    let userMappings: unknown[] = [];
    try {
      userMappings = await ctx.db.query("userMappings").collect();
    } catch {
      // Table may not exist yet
    }

    return {
      users: users.length,
      profiles: profiles.length,
      trackers: trackers.length,
      entries: entries.length,
      dictionary: dictionary.length,
      userMappings: userMappings.length,
    };
  },
});

// =============================================================================
// Profile Creation (public action)
// =============================================================================

/**
 * Create a profile for an auth user.
 * Call this before migrating user data.
 */
export const createProfileForUser = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId?: string; error?: string }> => {
    const result = await ctx.runMutation(internal.migrations.createProfileForAuthUser, {
      email: args.email,
    });

    if (!result) {
      return { success: false, error: "No auth account found for this email. User must sign up first." };
    }

    return { success: true, userId: result.userId };
  },
});

// =============================================================================
// Full Migration Runner
// =============================================================================

interface MigrateUserDataResult {
  success: boolean;
  error?: string;
  trackersImported?: number;
  entriesImported?: number;
  entriesSkipped?: number;
}

/**
 * Run complete migration for a single user who has signed up.
 * Call this after a user signs up with matching email.
 */
export const migrateUserData = action({
  args: {
    email: v.string(),
    supabaseUserId: v.string(),
    trackers: v.array(v.any()),
    entries: v.array(v.any()),
  },
  handler: async (ctx, args): Promise<MigrateUserDataResult> => {
    // 1. Try to create profile if it doesn't exist
    const profileResult = await ctx.runMutation(internal.migrations.createProfileForAuthUser, {
      email: args.email,
    });

    if (!profileResult) {
      return { success: false, error: "User not signed up in Convex yet. No auth account found for this email." };
    }

    // 2. Get the profile
    const profile = await ctx.runQuery(internal.users.getProfileByEmail, {
      email: args.email,
    });

    if (!profile) {
      return { success: false, error: "Profile creation failed" };
    }

    const userMapping: Record<string, string> = {
      [args.supabaseUserId]: profile.userId,
    };

    // 2. Import trackers for this user (strip extra fields from Supabase export)
    type TrackerType = {
      id: string;
      user_id: string;
      name: string;
      type: "preset" | "custom";
      preset_id?: string | null;
      icon?: string | null;
      color?: string | null;
      is_default: boolean;
      schema_version: number;
      generated_config?: unknown;
      user_description?: string | null;
      image_url?: string | null;
      image_generated_at?: string | null;
      image_model_name?: string | null;
      confirmed_interpretation?: string | null;
    };

    const userTrackers = (args.trackers as TrackerType[])
      .filter((t) => t.user_id === args.supabaseUserId)
      .map((t) => ({
        id: t.id,
        user_id: t.user_id,
        name: t.name,
        type: t.type,
        preset_id: t.preset_id,
        icon: t.icon,
        color: t.color,
        is_default: t.is_default,
        schema_version: t.schema_version,
        generated_config: t.generated_config,
        user_description: t.user_description,
        image_url: t.image_url,
        image_generated_at: t.image_generated_at,
        image_model_name: t.image_model_name,
        confirmed_interpretation: t.confirmed_interpretation,
      }));

    const trackerMapping = (await ctx.runMutation(
      internal.migrations.importTrackers,
      {
        trackers: userTrackers,
        userMapping,
      }
    )) as Record<string, string>;

    // 3. Import entries for this user
    type EntryType = {
      id: string;
      user_id: string;
      tracker_id: string;
      timestamp: string | number;
      intensity: number;
      locations: string[];
      notes: string;
      triggers: string[];
      hashtags: string[];
      field_values?: unknown;
    };

    const userEntries = (args.entries as EntryType[])
      .filter((e) => e.user_id === args.supabaseUserId)
      .map((e) => ({
        id: e.id,
        user_id: e.user_id,
        tracker_id: e.tracker_id,
        timestamp:
          typeof e.timestamp === "number"
            ? new Date(e.timestamp).toISOString()
            : e.timestamp,
        intensity: e.intensity,
        locations: e.locations,
        notes: e.notes,
        triggers: e.triggers,
        hashtags: e.hashtags,
        field_values: e.field_values,
      }));

    const entryResult = (await ctx.runMutation(
      internal.migrations.importEntries,
      {
        entries: userEntries,
        userMapping,
        trackerMapping,
      }
    )) as { imported: number; skipped: number };

    return {
      success: true,
      trackersImported: Object.keys(trackerMapping).length,
      entriesImported: entryResult.imported,
      entriesSkipped: entryResult.skipped,
    };
  },
});
