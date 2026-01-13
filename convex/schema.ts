/**
 * Convex Database Schema
 *
 * Mirrors the Supabase schema for the Baseline health tracking app.
 * This schema defines all tables, their fields, and indexes.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ==========================================================================
  // USERS TABLE
  // ==========================================================================
  // Replaces Supabase profiles table. Links to Clerk auth via clerkId.
  users: defineTable({
    // Clerk user ID (from identity.subject)
    clerkId: v.string(),
    // User's email address
    email: v.string(),
    // Optional display name
    displayName: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // ==========================================================================
  // TRACKERS TABLE
  // ==========================================================================
  // Health metric tracker definitions
  trackers: defineTable({
    // Owner of this tracker
    userId: v.id("users"),
    // Tracker name (e.g., "Chronic Pain", "Sleep Quality")
    name: v.string(),
    // Type: 'preset' for built-in trackers, 'custom' for user-created
    type: v.union(v.literal("preset"), v.literal("custom")),
    // For preset trackers, which preset template to use
    presetId: v.optional(v.string()),
    // Icon name (e.g., 'activity', 'moon', 'pill')
    icon: v.string(),
    // Hex color code (e.g., '#ef4444')
    color: v.string(),
    // Whether this is the user's default tracker
    isDefault: v.boolean(),
    // Schema version: 1 = legacy fixed fields, 2 = custom fields
    schemaVersion: v.number(),
    // AI-generated configuration for custom trackers (JSONB equivalent)
    generatedConfig: v.optional(v.any()),
    // User-provided description when dictionary lookup fails
    userDescription: v.optional(v.string()),
    // AI-generated image URL for tracker icon
    imageUrl: v.optional(v.string()),
    // Timestamp when image was generated (Unix ms)
    imageGeneratedAt: v.optional(v.number()),
    // Model used to generate the image
    imageModelName: v.optional(v.string()),
    // User-confirmed interpretation for ambiguous names
    confirmedInterpretation: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_default", ["userId", "isDefault"])
    .index("by_user_name", ["userId", "name"]),

  // ==========================================================================
  // TRACKER ENTRIES TABLE
  // ==========================================================================
  // Individual data points logged by users
  trackerEntries: defineTable({
    // Owner of this entry
    userId: v.id("users"),
    // Which tracker this entry belongs to
    trackerId: v.id("trackers"),
    // Timestamp when the entry was logged (Unix ms)
    timestamp: v.number(),
    // Intensity level (1-10)
    intensity: v.number(),
    // Body locations or categories selected
    locations: v.array(v.string()),
    // Free-text notes
    notes: v.string(),
    // Selected triggers
    triggers: v.array(v.string()),
    // Hashtags for categorization
    hashtags: v.array(v.string()),
    // Custom field values for schema_version 2 trackers (JSONB equivalent)
    fieldValues: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_tracker", ["trackerId"])
    .index("by_tracker_timestamp", ["trackerId", "timestamp"])
    .index("by_user_timestamp", ["userId", "timestamp"]),

  // ==========================================================================
  // DICTIONARY CACHE TABLE
  // ==========================================================================
  // Caches word definitions from external dictionary API
  dictionaryCache: defineTable({
    // The word being cached
    word: v.string(),
    // Primary definition
    definition: v.string(),
    // Part of speech (noun, verb, etc.)
    partOfSpeech: v.optional(v.string()),
    // Example sentences
    examples: v.array(v.string()),
    // Synonyms
    synonyms: v.array(v.string()),
    // When this was fetched (Unix ms)
    fetchedAt: v.number(),
  }).index("by_word", ["word"]),

  // ==========================================================================
  // AUDIT LOG TABLE
  // ==========================================================================
  // Tracks changes to important tables for debugging and compliance
  auditLog: defineTable({
    // Which table was modified
    tableName: v.string(),
    // ID of the record that was modified
    recordId: v.string(),
    // Action: INSERT, UPDATE, DELETE
    action: v.string(),
    // Previous data (for UPDATE/DELETE)
    oldData: v.optional(v.any()),
    // New data (for INSERT/UPDATE)
    newData: v.optional(v.any()),
    // Which fields changed (for UPDATE)
    changedFields: v.optional(v.array(v.string())),
    // User who made the change
    changedBy: v.optional(v.id("users")),
    // When the change occurred (Unix ms) - auto-set by Convex _creationTime
  })
    .index("by_record", ["recordId"])
    .index("by_table", ["tableName"])
    .index("by_user", ["changedBy"]),
});
