/**
 * Convex Tracker Adapter
 *
 * Implements TrackerPort using Convex queries and mutations.
 * This adapter can call Convex functions imperatively via the client.
 */

import type {
  TrackerPort,
  TrackerResult,
} from "@/ports/TrackerPort";
import type {
  Tracker,
  CreateTrackerInput,
  UpdateTrackerInput,
} from "@/types/tracker";
import { convexClient } from "./convexClient";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Validates hex color format (#RRGGBB)
 */
function validateHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Transform Convex tracker document to our Tracker type.
 * Maps Convex field names (camelCase) to our type's field names (snake_case).
 */
function transformTracker(doc: any): Tracker {
  return {
    id: doc._id,
    user_id: doc.userId,
    name: doc.name,
    type: doc.type,
    preset_id: doc.presetId ?? null,
    icon: doc.icon,
    color: doc.color,
    is_default: doc.isDefault,
    created_at: new Date(doc._creationTime).toISOString(),
    updated_at: new Date(doc._creationTime).toISOString(), // Convex doesn't have updated_at
    generated_config: doc.generatedConfig ?? null,
    user_description: doc.userDescription ?? null,
    image_url: doc.imageUrl ?? null,
    image_generated_at: doc.imageGeneratedAt
      ? new Date(doc.imageGeneratedAt).toISOString()
      : null,
    image_model_name: doc.imageModelName ?? null,
  };
}

export const convexTracker: TrackerPort = {
  async getTrackers(): Promise<TrackerResult<Tracker[]>> {
    try {
      const docs = await convexClient.query(api.trackers.list, {});

      const trackers = docs.map(transformTracker);

      return { data: trackers, error: null };
    } catch (err) {
      console.error("[convexTracker] getTrackers error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async getTracker(id: string): Promise<TrackerResult<Tracker>> {
    try {
      const doc = await convexClient.query(api.trackers.get, {
        id: id as Id<"trackers">,
      });

      if (!doc) {
        return { data: null, error: new Error("Tracker not found") };
      }

      return { data: transformTracker(doc), error: null };
    } catch (err) {
      console.error("[convexTracker] getTracker error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async getDefaultTracker(): Promise<TrackerResult<Tracker>> {
    try {
      const doc = await convexClient.query(api.trackers.getDefault, {});

      if (!doc) {
        return { data: null, error: new Error("No default tracker found") };
      }

      return { data: transformTracker(doc), error: null };
    } catch (err) {
      console.error("[convexTracker] getDefaultTracker error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async createTracker(
    input: CreateTrackerInput
  ): Promise<TrackerResult<Tracker>> {
    try {
      // Validate color
      const color = input.color ?? "#6366f1";
      if (!validateHexColor(color)) {
        return {
          data: null,
          error: new Error(
            "Color must be a valid hex color code in #RRGGBB format"
          ),
        };
      }

      const doc = await convexClient.mutation(api.trackers.create, {
        name: input.name,
        type: input.type ?? "custom",
        presetId: input.preset_id ?? undefined,
        icon: input.icon ?? "activity",
        color: color,
        isDefault: input.is_default ?? false,
        generatedConfig: input.generated_config ?? undefined,
        userDescription: input.user_description ?? undefined,
        confirmedInterpretation: input.confirmed_interpretation ?? undefined,
      });

      if (!doc) {
        return { data: null, error: new Error("Failed to create tracker") };
      }

      return { data: transformTracker(doc), error: null };
    } catch (err) {
      console.error("[convexTracker] createTracker error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async updateTracker(
    id: string,
    input: UpdateTrackerInput
  ): Promise<TrackerResult<Tracker>> {
    try {
      // Validate color if provided
      if (input.color && !validateHexColor(input.color)) {
        return {
          data: null,
          error: new Error(
            "Color must be a valid hex color code in #RRGGBB format"
          ),
        };
      }

      const doc = await convexClient.mutation(api.trackers.update, {
        id: id as Id<"trackers">,
        name: input.name,
        icon: input.icon,
        color: input.color,
        isDefault: input.is_default,
        generatedConfig: input.generated_config,
        // Convert null to undefined (Convex doesn't accept null for optional fields)
        userDescription: input.user_description ?? undefined,
      });

      if (!doc) {
        return { data: null, error: new Error("Tracker not found") };
      }

      return { data: transformTracker(doc), error: null };
    } catch (err) {
      console.error("[convexTracker] updateTracker error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async deleteTracker(id: string): Promise<TrackerResult<null>> {
    try {
      await convexClient.mutation(api.trackers.remove, {
        id: id as Id<"trackers">,
      });

      return { data: null, error: null };
    } catch (err) {
      console.error("[convexTracker] deleteTracker error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async setDefaultTracker(id: string): Promise<TrackerResult<Tracker>> {
    try {
      const doc = await convexClient.mutation(api.trackers.setDefault, {
        id: id as Id<"trackers">,
      });

      if (!doc) {
        return { data: null, error: new Error("Tracker not found") };
      }

      return { data: transformTracker(doc), error: null };
    } catch (err) {
      console.error("[convexTracker] setDefaultTracker error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },

  async ensureDefaultTracker(): Promise<TrackerResult<Tracker>> {
    try {
      const doc = await convexClient.mutation(api.trackers.ensureDefault, {});

      if (!doc) {
        return {
          data: null,
          error: new Error("Failed to ensure default tracker"),
        };
      }

      return { data: transformTracker(doc), error: null };
    } catch (err) {
      console.error("[convexTracker] ensureDefaultTracker error:", err);
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Unknown error"),
      };
    }
  },
};
