/**
 * Convex Database Adapter
 *
 * Implements DbPort for Convex backend.
 * Handles tracker_entries table operations via Convex queries/mutations.
 */

import type { DbPort, SelectOptions, DbResult } from "@/ports/DbPort";
import { convexClient } from "./convexClient";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Transform Convex entry document to the expected PainEntry format.
 * Maps Convex field names (camelCase) to Supabase-style (snake_case).
 */
function transformEntry(doc: any): any {
  return {
    id: doc._id,
    user_id: doc.userId,
    tracker_id: doc.trackerId,
    timestamp: new Date(doc.timestamp).toISOString(),
    intensity: doc.intensity,
    locations: doc.locations,
    notes: doc.notes,
    triggers: doc.triggers,
    hashtags: doc.hashtags,
    field_values: doc.fieldValues ?? null,
    created_at: new Date(doc._creationTime).toISOString(),
    updated_at: new Date(doc._creationTime).toISOString(),
  };
}

export const convexDb: DbPort = {
  async select<T>(table: string, options?: SelectOptions): Promise<DbResult<T[]>> {
    try {
      // Only handle tracker_entries table
      if (table !== "tracker_entries") {
        console.warn(`[convexDb] Table "${table}" not supported, returning empty`);
        return { data: [], error: null };
      }

      const trackerId = options?.where?.tracker_id as string | undefined;

      if (!trackerId) {
        // If no tracker_id specified, get all entries for the user
        const entries = await convexClient.query(api.entries.listAll, {
          limit: options?.limit,
        });
        return { data: entries.map(transformEntry) as T[], error: null };
      }

      // Get entries for specific tracker
      const entries = await convexClient.query(api.entries.list, {
        trackerId: trackerId as Id<"trackers">,
        limit: options?.limit,
        order: options?.orderBy?.ascending === false ? "desc" : "asc",
      });

      return { data: entries.map(transformEntry) as T[], error: null };
    } catch (err) {
      console.error("[convexDb] select error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async insert<T>(
    table: string,
    values: Partial<T> | Partial<T>[]
  ): Promise<DbResult<T>> {
    try {
      if (table !== "tracker_entries") {
        return { data: null, error: new Error(`Table "${table}" not supported`) };
      }

      // Handle single insert (we don't support batch inserts for now)
      const entry = Array.isArray(values) ? values[0] : values;
      const v = entry as any;

      const doc = await convexClient.mutation(api.entries.create, {
        trackerId: v.tracker_id as Id<"trackers">,
        timestamp: v.timestamp ? new Date(v.timestamp).getTime() : undefined,
        intensity: v.intensity,
        locations: v.locations || [],
        notes: v.notes || "",
        triggers: v.triggers || [],
        hashtags: v.hashtags || [],
        fieldValues: v.field_values,
      });

      return { data: transformEntry(doc) as T, error: null };
    } catch (err) {
      console.error("[convexDb] insert error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async update<T>(
    table: string,
    where: Record<string, unknown>,
    values: Partial<T>
  ): Promise<DbResult<T>> {
    try {
      if (table !== "tracker_entries") {
        return { data: null, error: new Error(`Table "${table}" not supported`) };
      }

      const id = where.id as string;
      if (!id) {
        return { data: null, error: new Error("Entry ID required for update") };
      }

      const v = values as any;

      const doc = await convexClient.mutation(api.entries.update, {
        id: id as Id<"trackerEntries">,
        timestamp: v.timestamp ? new Date(v.timestamp).getTime() : undefined,
        intensity: v.intensity,
        locations: v.locations,
        notes: v.notes,
        triggers: v.triggers,
        hashtags: v.hashtags,
        fieldValues: v.field_values,
      });

      return { data: transformEntry(doc) as T, error: null };
    } catch (err) {
      console.error("[convexDb] update error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async delete(
    table: string,
    where: Record<string, unknown>
  ): Promise<DbResult<null>> {
    try {
      if (table !== "tracker_entries") {
        return { data: null, error: new Error(`Table "${table}" not supported`) };
      }

      const id = where.id as string;
      if (!id) {
        return { data: null, error: new Error("Entry ID required for delete") };
      }

      await convexClient.mutation(api.entries.remove, {
        id: id as Id<"trackerEntries">,
      });

      return { data: null, error: null };
    } catch (err) {
      console.error("[convexDb] delete error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  // Raw SQL not supported in Convex
  sql: undefined,
};
