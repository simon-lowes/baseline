/**
 * Data Migration Functions
 *
 * Internal functions for migrating data from Supabase to Convex.
 * These are run manually via the Convex dashboard or CLI.
 *
 * Migration Order:
 * 1. Users/Profiles (createUserMappings)
 * 2. Trackers (importTrackers)
 * 3. TrackerEntries (importEntries)
 * 4. DictionaryCache (importDictionaryCache)
 *
 * Expected data format from Supabase:
 * - Profiles: { id: UUID, email: string, display_name?: string }
 * - Trackers: { id: UUID, user_id: UUID, name: string, type: 'preset'|'custom', ... }
 * - Entries: { id: UUID, user_id: UUID, tracker_id: UUID, timestamp: ISO, ... }
 * - Dictionary: { word: string, definition: string, ... }
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// User Mapping Storage
// =============================================================================

/**
 * Stores mapping from Supabase user UUID to Convex user ID.
 * This is used during migration to map foreign keys.
 */
export const storeUserMapping = internalMutation({
  args: {
    supabaseUserId: v.string(),
    convexUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Store in a temporary mapping table
    // For simplicity, we'll use a JSON object in the migration code
    // Real implementation would use a dedicated table
    console.log(
      `[Migration] User mapping: ${args.supabaseUserId} -> ${args.convexUserId}`
    );
  },
});

// =============================================================================
// Profile/User Import
// =============================================================================

/**
 * Creates Convex users from Supabase profiles.
 * Returns a mapping of Supabase UUID to Convex user ID.
 *
 * Note: In production, users would be created through Convex Auth sign-up.
 * This is for migrating existing user data only.
 */
export const importProfiles = internalMutation({
  args: {
    profiles: v.array(
      v.object({
        id: v.string(),
        email: v.string(),
        display_name: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const mapping: Record<string, string> = {};

    for (const profile of args.profiles) {
      // Check if user with this email already exists
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_email", (q) => q.eq("email", profile.email))
        .first();

      if (existing) {
        mapping[profile.id] = existing.userId;
        console.log(
          `[Migration] Profile already exists: ${profile.email} -> ${existing.userId}`
        );
        continue;
      }

      // For migration, we need to create auth users first
      // This would typically be done through Convex Auth
      // For now, log that manual user creation is needed
      console.log(
        `[Migration] Profile needs auth user: ${profile.email} (Supabase ID: ${profile.id})`
      );
    }

    return mapping;
  },
});

// =============================================================================
// Tracker Import
// =============================================================================

/**
 * Imports trackers from Supabase data.
 * Requires a user mapping to convert Supabase UUIDs to Convex IDs.
 */
export const importTrackers = internalMutation({
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
    userMapping: v.record(v.string(), v.string()), // supabaseId -> convexId
  },
  handler: async (ctx, args) => {
    const trackerMapping: Record<string, string> = {};
    let imported = 0;
    let skipped = 0;

    for (const tracker of args.trackers) {
      const convexUserId = args.userMapping[tracker.user_id];
      if (!convexUserId) {
        console.warn(
          `[Migration] Skipping tracker ${tracker.name}: user ${tracker.user_id} not mapped`
        );
        skipped++;
        continue;
      }

      // Check if tracker already exists (by name + user)
      const existing = await ctx.db
        .query("trackers")
        .withIndex("by_user_name", (q) =>
          q.eq("userId", convexUserId as any).eq("name", tracker.name)
        );

      const existingTracker = await existing.first();
      if (existingTracker) {
        trackerMapping[tracker.id] = existingTracker._id;
        console.log(
          `[Migration] Tracker already exists: ${tracker.name} -> ${existingTracker._id}`
        );
        skipped++;
        continue;
      }

      // Create new tracker (convert null to undefined)
      const newTrackerId = await ctx.db.insert("trackers", {
        userId: convexUserId as any,
        name: tracker.name,
        type: tracker.type,
        presetId: tracker.preset_id ?? undefined,
        icon: tracker.icon || "activity",
        color: tracker.color || "#6366f1",
        isDefault: tracker.is_default,
        schemaVersion: tracker.schema_version,
        generatedConfig: tracker.generated_config ?? undefined,
        userDescription: tracker.user_description ?? undefined,
        imageUrl: tracker.image_url ?? undefined,
        imageGeneratedAt: tracker.image_generated_at
          ? new Date(tracker.image_generated_at).getTime()
          : undefined,
        imageModelName: tracker.image_model_name ?? undefined,
        confirmedInterpretation: tracker.confirmed_interpretation ?? undefined,
      });

      trackerMapping[tracker.id] = newTrackerId;
      imported++;
      console.log(
        `[Migration] Imported tracker: ${tracker.name} -> ${newTrackerId}`
      );
    }

    console.log(
      `[Migration] Trackers: ${imported} imported, ${skipped} skipped`
    );
    return trackerMapping;
  },
});

// =============================================================================
// Entry Import
// =============================================================================

/**
 * Imports tracker entries from Supabase data.
 * Requires both user and tracker mappings.
 */
export const importEntries = internalMutation({
  args: {
    entries: v.array(
      v.object({
        id: v.string(),
        user_id: v.string(),
        tracker_id: v.string(),
        timestamp: v.string(), // ISO timestamp
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
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;

    for (const entry of args.entries) {
      const convexUserId = args.userMapping[entry.user_id];
      const convexTrackerId = args.trackerMapping[entry.tracker_id];

      if (!convexUserId) {
        console.warn(
          `[Migration] Skipping entry: user ${entry.user_id} not mapped`
        );
        skipped++;
        continue;
      }

      if (!convexTrackerId) {
        console.warn(
          `[Migration] Skipping entry: tracker ${entry.tracker_id} not mapped`
        );
        skipped++;
        continue;
      }

      // Parse timestamp
      const timestamp = new Date(entry.timestamp).getTime();

      // Check for duplicate (same tracker + timestamp)
      const existing = await ctx.db
        .query("trackerEntries")
        .withIndex("by_tracker_timestamp", (q) =>
          q.eq("trackerId", convexTrackerId as any).eq("timestamp", timestamp)
        )
        .first();

      if (existing) {
        console.log(`[Migration] Entry already exists at ${entry.timestamp}`);
        skipped++;
        continue;
      }

      // Create entry
      await ctx.db.insert("trackerEntries", {
        userId: convexUserId as any,
        trackerId: convexTrackerId as any,
        timestamp,
        intensity: entry.intensity,
        locations: entry.locations,
        notes: entry.notes,
        triggers: entry.triggers,
        hashtags: entry.hashtags,
        fieldValues: entry.field_values,
      });

      imported++;
    }

    console.log(`[Migration] Entries: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped };
  },
});

// =============================================================================
// Dictionary Cache Import
// =============================================================================

/**
 * Imports dictionary cache entries from Supabase.
 */
export const importDictionaryCache = internalMutation({
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
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;

    for (const entry of args.entries) {
      // Check if word already cached
      const existing = await ctx.db
        .query("dictionaryCache")
        .withIndex("by_word", (q) => q.eq("word", entry.word))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("dictionaryCache", {
        word: entry.word,
        definition: entry.definition,
        partOfSpeech: entry.part_of_speech,
        examples: entry.examples,
        synonyms: entry.synonyms,
        fetchedAt: new Date(entry.fetched_at).getTime(),
      });

      imported++;
    }

    console.log(
      `[Migration] Dictionary: ${imported} imported, ${skipped} skipped`
    );
    return { imported, skipped };
  },
});

// =============================================================================
// Seamless Auth Migration (Direct Database Insertion)
// =============================================================================

/**
 * Migrate a user from Supabase with their existing bcrypt password hash.
 * This creates:
 * 1. A user record in the Convex Auth users table
 * 2. An authAccount record linking the user to the password provider
 * 3. A profile record for app-specific data
 * 4. A userMapping record for foreign key translation
 *
 * The user can then log in with their existing Supabase password.
 * NO re-signup required - completely seamless migration.
 */
export const migrateUserWithPassword = internalMutation({
  args: {
    supabaseUserId: v.string(),
    email: v.string(),
    passwordHash: v.string(), // bcrypt hash from Supabase
    displayName: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists by email in authAccounts
    const existingAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "password"),
          q.eq(q.field("providerAccountId"), args.email)
        )
      )
      .first();

    if (existingAccount) {
      console.log(
        `[Migration] Auth account already exists for ${args.email}, skipping`
      );
      return {
        userId: existingAccount.userId,
        alreadyExists: true,
      };
    }

    // Step 1: Create the user in the Convex Auth users table
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.displayName,
      emailVerificationTime: args.emailVerified ? Date.now() : undefined,
    });
    console.log(`[Migration] Created user: ${userId} for ${args.email}`);

    // Step 2: Create the authAccount with the existing bcrypt hash
    // The password hash is stored directly - no re-hashing
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: args.email,
      secret: args.passwordHash,
      emailVerified: args.emailVerified ? args.email : undefined,
    });
    console.log(`[Migration] Created authAccount for ${args.email}`);

    // Step 3: Create the profile record
    const profileId = await ctx.db.insert("profiles", {
      userId,
      email: args.email,
      displayName: args.displayName,
    });
    console.log(`[Migration] Created profile: ${profileId}`);

    // Step 4: Create the user mapping for foreign key translation
    await ctx.db.insert("userMappings", {
      supabaseUserId: args.supabaseUserId,
      convexUserId: userId,
      email: args.email,
    });
    console.log(
      `[Migration] Created user mapping: ${args.supabaseUserId} -> ${userId}`
    );

    return {
      userId,
      profileId,
      alreadyExists: false,
    };
  },
});

/**
 * Batch migrate multiple users from Supabase.
 * Returns a mapping of Supabase UUIDs to Convex user IDs.
 */
export const migrateUsersWithPasswords = internalMutation({
  args: {
    users: v.array(
      v.object({
        supabaseUserId: v.string(),
        email: v.string(),
        passwordHash: v.string(),
        displayName: v.optional(v.string()),
        emailVerified: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const mapping: Record<string, string> = {};
    let created = 0;
    let skipped = 0;

    for (const user of args.users) {
      // Check if user already exists
      const existingAccount = await ctx.db
        .query("authAccounts")
        .filter((q) =>
          q.and(
            q.eq(q.field("provider"), "password"),
            q.eq(q.field("providerAccountId"), user.email)
          )
        )
        .first();

      if (existingAccount) {
        mapping[user.supabaseUserId] = existingAccount.userId;
        console.log(`[Migration] User ${user.email} already exists, skipping`);
        skipped++;
        continue;
      }

      // Create user
      const userId = await ctx.db.insert("users", {
        email: user.email,
        name: user.displayName,
        emailVerificationTime: user.emailVerified ? Date.now() : undefined,
      });

      // Create authAccount with existing bcrypt hash
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: user.email,
        secret: user.passwordHash,
        emailVerified: user.emailVerified ? user.email : undefined,
      });

      // Create profile
      await ctx.db.insert("profiles", {
        userId,
        email: user.email,
        displayName: user.displayName,
      });

      // Create user mapping
      await ctx.db.insert("userMappings", {
        supabaseUserId: user.supabaseUserId,
        convexUserId: userId,
        email: user.email,
      });

      mapping[user.supabaseUserId] = userId;
      created++;
      console.log(`[Migration] Created user: ${user.email} -> ${userId}`);
    }

    console.log(
      `[Migration] Users: ${created} created, ${skipped} skipped`
    );
    return mapping;
  },
});

// =============================================================================
// Profile Creation Helper (for migration)
// =============================================================================

/**
 * Create a profile for an existing auth user by email.
 * This is needed because Convex Auth creates the user but not the profile.
 * The profile is required for migration lookups.
 */
export const createProfileForAuthUser = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // First check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingProfile) {
      console.log(`[Migration] Profile already exists for ${args.email}`);
      return { userId: existingProfile.userId, profileId: existingProfile._id };
    }

    // Look up the auth account by email to find the user ID
    // Convex Auth stores email in authAccounts table
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "password"),
          q.eq(q.field("providerAccountId"), args.email)
        )
      )
      .first();

    if (!authAccount) {
      console.log(`[Migration] No auth account found for ${args.email}`);
      return null;
    }

    const userId = authAccount.userId;
    console.log(`[Migration] Found auth user ${userId} for ${args.email}`);

    // Create the profile
    const profileId = await ctx.db.insert("profiles", {
      userId,
      email: args.email,
      displayName: undefined,
    });

    console.log(`[Migration] Created profile ${profileId} for ${args.email}`);
    return { userId, profileId };
  },
});

// =============================================================================
// Migration Status & Helpers
// =============================================================================

/**
 * Get current record counts for migration verification.
 */
export const getMigrationStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const trackers = await ctx.db.query("trackers").collect();
    const entries = await ctx.db.query("trackerEntries").collect();
    const dictionary = await ctx.db.query("dictionaryCache").collect();

    return {
      profiles: profiles.length,
      trackers: trackers.length,
      entries: entries.length,
      dictionary: dictionary.length,
    };
  },
});

/**
 * Clear all data (for testing migrations).
 * WARNING: This deletes all data!
 */
export const clearAllData = internalMutation({
  args: {
    confirmPhrase: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confirmPhrase !== "DELETE_ALL_DATA") {
      throw new Error("Must confirm with DELETE_ALL_DATA");
    }

    const tables = [
      "profiles",
      "trackers",
      "trackerEntries",
      "dictionaryCache",
      "auditLog",
    ];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const docs = await (ctx.db.query(table as any) as any).collect();
      counts[table] = docs.length;
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    console.log("[Migration] Cleared data:", counts);
    return counts;
  },
});
