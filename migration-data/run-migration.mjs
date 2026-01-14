import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { readFileSync } from "fs";

const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://mellow-fox-536.convex.cloud";

async function main() {
  const client = new ConvexHttpClient(CONVEX_URL);
  
  // Load data from JSON files
  const trackers = JSON.parse(readFileSync("./migration-data/trackers.json", "utf-8"));
  
  // Entries from Supabase (I'll include them inline since they're complex)
  const entries = ENTRIES_DATA;
  
  console.log(`Loaded ${trackers.length} trackers, ${entries.length} entries`);
  
  const email = "paindiary@simonlowes.com";
  const supabaseUserId = "c444184b-98a7-4e1b-ae2e-4bc19624e8f6";
  
  console.log("Running migrateUserData action...");
  
  const result = await client.action(api.runMigrations.migrateUserData, {
    email,
    supabaseUserId,
    trackers,
    entries,
  });
  
  console.log("Migration result:", result);
}

// Run
main().catch(console.error);
