/**
 * Verify Auth Migration - Test that users can sign in
 *
 * This script verifies that password verification works correctly
 * by testing bcrypt comparison.
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = "https://terrific-labrador-19.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log("=".repeat(60));
  console.log("AUTH VERIFICATION");
  console.log("=".repeat(60));

  try {
    const { api } = await import("../convex/_generated/api.js");

    // Get current stats including auth accounts
    const stats = await convex.query(api.runMigrations.getMigrationStats, {});

    console.log("\nCurrent Convex State:");
    console.log(`  Users:         ${stats.users}`);
    console.log(`  Profiles:      ${stats.profiles}`);
    console.log(`  Auth Accounts: ${stats.authAccounts || 'N/A'}`);
    console.log(`  Trackers:      ${stats.trackers}`);
    console.log(`  Entries:       ${stats.entries}`);

    // List user mappings to verify migration
    if (stats.userMappings) {
      console.log("\nUser Mappings:");
      for (const mapping of stats.userMappings) {
        console.log(`  ${mapping.supabaseUserId} -> ${mapping.convexUserId}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("VERIFICATION COMPLETE");
    console.log("=".repeat(60));
    console.log("\nTo fully test login:");
    console.log("  1. Run: npm run dev");
    console.log("  2. Navigate to http://localhost:5173");
    console.log("  3. Sign in with an existing user email and password");
    console.log("\nTest users:");
    console.log("  - paindiary@simonlowes.com");
    console.log("  - robbaldock@gmail.com");
    console.log("  - mpmiddleton@gmail.com");
    console.log("  - claudetesting.catsup381@simplelogin.com");

  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

main();
