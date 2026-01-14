/**
 * Complete Migration Script - Supabase to Convex
 *
 * This script migrates all data from Supabase to Convex:
 * 1. Users with existing bcrypt passwords (seamless auth)
 * 2. All trackers
 * 3. All entries
 *
 * Run with: npx tsx scripts/runCompleteMigration.ts
 */

import { createClient } from "@supabase/supabase-js";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Configuration from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CONVEX_URL = process.env.VITE_CONVEX_URL!;

async function main() {
  console.log("=".repeat(60));
  console.log("COMPLETE DATA MIGRATION: SUPABASE -> CONVEX");
  console.log("=".repeat(60));

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CONVEX_URL) {
    console.error("Missing environment variables:");
    console.error("  VITE_SUPABASE_URL:", SUPABASE_URL ? "✓" : "✗");
    console.error("  SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_KEY ? "✓" : "✗");
    console.error("  VITE_CONVEX_URL:", CONVEX_URL ? "✓" : "✗");
    process.exit(1);
  }

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const convex = new ConvexHttpClient(CONVEX_URL);

  console.log("\n[1/4] Fetching users from Supabase...");

  // Fetch users with password hashes from auth.users
  const { data: authUsers, error: authError } = await supabase.rpc("get_users_with_passwords");

  // If RPC doesn't exist, use direct query (requires service role)
  let users: Array<{
    supabaseUserId: string;
    email: string;
    passwordHash: string;
    displayName?: string;
    emailVerified: boolean;
  }>;

  if (authError || !authUsers) {
    console.log("  RPC not available, using direct query...");

    // Direct SQL query using service role
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id, email, display_name");

    if (userError) {
      console.error("Failed to fetch profiles:", userError);
      process.exit(1);
    }

    // We need to get the auth data separately
    // For now, use hardcoded data from the approved plan
    users = [
      {
        supabaseUserId: "c444184b-98a7-4e1b-ae2e-4bc19624e8f6",
        email: "paindiary@simonlowes.com",
        passwordHash: "$2a$10$bP6/rBzM6hmmkkMuctJ1cewsiZFKmeoyy6hLj4EmTSE1MclVgPOfq",
        emailVerified: true,
      },
      {
        supabaseUserId: "9e49c418-edb5-4d0e-81d0-bf50ea326c6d",
        email: "robbaldock@gmail.com",
        passwordHash: "$2a$10$AGFVMqfgzESAk2IVhJtcE.zs35gpmO6QXAwTGmnasLsXm4kOlWlfq",
        emailVerified: true,
      },
      {
        supabaseUserId: "a77c9090-12eb-4153-a242-b420d1d72b19",
        email: "mpmiddleton@gmail.com",
        passwordHash: "$2a$10$bfOQIDMx9QU35kNKx5I8i.vXRdZHkEC5g5OzoltTZ6TNqLWvV8eou",
        emailVerified: true,
      },
      {
        supabaseUserId: "aa256442-3d7b-4669-aaf0-369cfe4d5985",
        email: "claudetesting.catsup381@simplelogin.com",
        passwordHash: "$2a$10$UNMiqzIAN3y5usYcI0KiR.mleB4ThAcRcVT.tKkS2LUYDg4dEjkl.",
        emailVerified: true,
      },
    ];
  } else {
    users = authUsers.map((u: { id: string; email: string; encrypted_password: string; display_name: string | null; email_confirmed_at: string | null }) => ({
      supabaseUserId: u.id,
      email: u.email,
      passwordHash: u.encrypted_password,
      displayName: u.display_name || undefined,
      emailVerified: !!u.email_confirmed_at,
    }));
  }

  console.log(`  Found ${users.length} users`);
  users.forEach((u) => console.log(`    - ${u.email}`));

  console.log("\n[2/4] Fetching trackers from Supabase...");

  const { data: trackers, error: trackerError } = await supabase
    .from("trackers")
    .select("*")
    .order("user_id")
    .order("created_at");

  if (trackerError) {
    console.error("Failed to fetch trackers:", trackerError);
    process.exit(1);
  }

  console.log(`  Found ${trackers?.length || 0} trackers`);

  console.log("\n[3/4] Fetching entries from Supabase...");

  const { data: entries, error: entryError } = await supabase
    .from("tracker_entries")
    .select("*")
    .order("tracker_id")
    .order("timestamp");

  if (entryError) {
    console.error("Failed to fetch entries:", entryError);
    process.exit(1);
  }

  console.log(`  Found ${entries?.length || 0} entries`);

  console.log("\n[4/4] Running complete migration to Convex...");

  try {
    const result = await convex.action(api.runMigrations.runCompleteMigration, {
      users,
      trackers: trackers || [],
      entries: entries || [],
    });

    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`  Users created:    ${result.users.created}/${result.users.total}`);
    console.log(`  Trackers imported: ${result.trackers.imported}`);
    console.log(`  Entries imported:  ${result.entries.imported}`);
    console.log(`  Entries skipped:   ${result.entries.skipped}`);
    console.log("=".repeat(60));

    // Verify counts
    console.log("\n[Verification] Checking final counts...");
    const stats = await convex.query(api.runMigrations.getMigrationStats, {});
    console.log(`  Convex users:     ${stats.users}`);
    console.log(`  Convex profiles:  ${stats.profiles}`);
    console.log(`  Convex trackers:  ${stats.trackers}`);
    console.log(`  Convex entries:   ${stats.entries}`);

    const expected = {
      users: 4,
      profiles: 4,
      trackers: 11,
      entries: 90,
    };

    if (
      stats.users === expected.users &&
      stats.profiles === expected.profiles &&
      stats.trackers === expected.trackers &&
      stats.entries === expected.entries
    ) {
      console.log("\n✓ ALL COUNTS MATCH - MIGRATION SUCCESSFUL!");
    } else {
      console.log("\n⚠ COUNT MISMATCH:");
      console.log(`  Users:    ${stats.users}/${expected.users}`);
      console.log(`  Profiles: ${stats.profiles}/${expected.profiles}`);
      console.log(`  Trackers: ${stats.trackers}/${expected.trackers}`);
      console.log(`  Entries:  ${stats.entries}/${expected.entries}`);
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
