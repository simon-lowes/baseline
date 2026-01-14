/**
 * Execute Complete Migration - Supabase to Convex
 *
 * This script runs the complete migration with all data embedded.
 * Run with: VITE_CONVEX_URL=https://your-url.convex.cloud node scripts/execute-migration.mjs
 */

import { ConvexHttpClient } from "convex/browser";

// Convex URL from environment or hardcoded fallback
const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://terrific-labrador-19.convex.cloud";

if (!CONVEX_URL) {
  console.error("Missing VITE_CONVEX_URL environment variable");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

// === USER DATA (from Supabase auth.users) ===
const users = [
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

// === TRACKER DATA (from Supabase public.trackers) ===
const trackers = [
  {"id":"2eb0c7e5-0585-45d6-9777-5daf77ee2441","user_id":"9e49c418-edb5-4d0e-81d0-bf50ea326c6d","name":"Chronic Pain","type":"preset","preset_id":"chronic_pain","icon":"activity","color":"#ef4444","is_default":true,"schema_version":1,"generated_config":null,"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-2eb0c7e5-0585-45d6-9777-5daf77ee2441-1766870200891.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLTJlYjBjN2U1LTA1ODUtNDVkNi05Nzc3LTVkYWY3N2VlMjQ0MS0xNzY2ODcwMjAwODkxLnBuZyIsImlhdCI6MTc2Njg3MDIwMSwiZXhwIjoxNzk4NDA2MjAxfQ.G1bT2wyyrEHDIAlfrm-9dKvamAgMwC2O7zrs_RdqWcE","image_generated_at":"2025-12-27 21:16:41.447+00","image_model_name":"gemini-2.5-flash-image","confirmed_interpretation":null},
  {"id":"f5a73037-bfba-40e3-914b-edcceb6d5f09","user_id":"9e49c418-edb5-4d0e-81d0-bf50ea326c6d","name":"LoadTest Tracker","type":"custom","preset_id":null,"icon":"activity","color":"#6366f1","is_default":false,"schema_version":1,"generated_config":null,"user_description":null,"image_url":null,"image_generated_at":null,"image_model_name":null,"confirmed_interpretation":null},
  {"id":"ec1ab61e-364f-4b1a-839e-1ece471f0f65","user_id":"a77c9090-12eb-4153-a242-b420d1d72b19","name":"Chronic Pain","type":"preset","preset_id":"chronic_pain","icon":"activity","color":"#ef4444","is_default":true,"schema_version":1,"generated_config":null,"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-ec1ab61e-364f-4b1a-839e-1ece471f0f65-1766870207155.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLWVjMWFiNjFlLTM2NGYtNGIxYS04MzllLTFlY2U0NzFmMGY2NS0xNzY2ODcwMjA3MTU1LnBuZyIsImlhdCI6MTc2Njg3MDIwNywiZXhwIjoxNzk4NDA2MjA3fQ.l2Q_235PlkhiMP8QMWECqFzlGCaYT2g-0hQmHL0Vm_o","image_generated_at":"2025-12-27 21:16:47.513+00","image_model_name":"gemini-2.5-flash-image","confirmed_interpretation":null},
  {"id":"8616134f-ef2d-4574-8817-4c15ad1724f0","user_id":"aa256442-3d7b-4669-aaf0-369cfe4d5985","name":"Chronic Pain","type":"preset","preset_id":"chronic_pain","icon":"activity","color":"#ef4444","is_default":true,"schema_version":1,"generated_config":null,"user_description":null,"image_url":null,"image_generated_at":null,"image_model_name":null,"confirmed_interpretation":null},
  {"id":"0f58e2de-421e-43d0-83cf-8b0268f7961e","user_id":"aa256442-3d7b-4669-aaf0-369cfe4d5985","name":"Sleep","type":"preset","preset_id":"sleep","icon":"moon","color":"#3b82f6","is_default":true,"schema_version":1,"generated_config":null,"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-0f58e2de-421e-43d0-83cf-8b0268f7961e-1767984406230.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLTBmNThlMmRlLTQyMWUtNDNkMC04M2NmLThiMDI2OGY3OTYxZS0xNzY3OTg0NDA2MjMwLnBuZyIsImlhdCI6MTc2Nzk4NDQwNiwiZXhwIjoxNzk5NTIwNDA2fQ.53yofxahVAq_5R9yY0mKebqHjYNSX2XQjqyEzjkdUKM","image_generated_at":"2026-01-09 18:46:46.767+00","image_model_name":"gemini-2.5-flash-image","confirmed_interpretation":null},
  {"id":"74dfb38e-434e-462b-bb18-5e0d53a995ba","user_id":"c444184b-98a7-4e1b-ae2e-4bc19624e8f6","name":"Chronic Pain","type":"preset","preset_id":"chronic_pain","icon":"activity","color":"#ef4444","is_default":true,"schema_version":1,"generated_config":null,"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-74dfb38e-434e-462b-bb18-5e0d53a995ba-1766870213262.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLTc0ZGZiMzhlLTQzNGUtNDYyYi1iYjE4LTVlMGQ1M2E5OTViYS0xNzY2ODcwMjEzMjYyLnBuZyIsImlhdCI6MTc2Njg3MDIxMywiZXhwIjoxNzk4NDA2MjEzfQ.s9KMpWN5GhUQRDczEtjW5rTwJQf-i2hX5I8kR13P3eM","image_generated_at":"2025-12-27 21:16:53.63+00","image_model_name":"gemini-2.5-flash-image","confirmed_interpretation":null},
  {"id":"4786d989-0e21-4403-9bc4-d554a4ddb30c","user_id":"c444184b-98a7-4e1b-ae2e-4bc19624e8f6","name":"Mood & Mental Health","type":"preset","preset_id":"mood","icon":"smile","color":"#8b5cf6","is_default":false,"schema_version":1,"generated_config":null,"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-4786d989-0e21-4403-9bc4-d554a4ddb30c-1766870221607.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLTQ3ODZkOTg5LTBlMjEtNDQwMy05YmM0LWQ1NTRhNGRkYjMwYy0xNzY2ODcwMjIxNjA3LnBuZyIsImlhdCI6MTc2Njg3MDIyMiwiZXhwIjoxNzk4NDA2MjIyfQ.dIbRwExWYRnh3R9Yz8B2uhCovsPzRM57yloO7rISCfo","image_generated_at":"2025-12-27 21:17:02.064+00","image_model_name":"gemini-2.5-flash-image","confirmed_interpretation":null},
  {"id":"8454eb70-8dd0-41ae-b5f5-1b301b262a1f","user_id":"c444184b-98a7-4e1b-ae2e-4bc19624e8f6","name":"Sleep","type":"preset","preset_id":"sleep","icon":"moon","color":"#3b82f6","is_default":false,"schema_version":1,"generated_config":null,"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-8454eb70-8dd0-41ae-b5f5-1b301b262a1f-1766870227053.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLTg0NTRlYjcwLThkZDAtNDFhZS1iNWY1LTFiMzAxYjI2MmExZi0xNzY2ODcwMjI3MDUzLnBuZyIsImlhdCI6MTc2Njg3MDIyNywiZXhwIjoxNzk4NDA2MjI3fQ.mPdCQFfVv9cu8i9eDJ6WaGmzvUH3oFiao63LOibuIiM","image_generated_at":"2025-12-27 21:17:07.609+00","image_model_name":"gemini-2.5-flash-image","confirmed_interpretation":null},
  {"id":"1639e8fb-f815-4397-a276-ca74de5e0ca9","user_id":"c444184b-98a7-4e1b-ae2e-4bc19624e8f6","name":"Diet","type":"custom","preset_id":null,"icon":"activity","color":"#6366f1","is_default":false,"schema_version":1,"generated_config":{"triggers":["Stress","Boredom","Social Gathering","Time Constraints","Cravings","Physical Hunger","Emotional State","Meal Prep Availability","Dehydration","Work/Schedule","Celebration","Travel"],"formTitle":"Log Food & Beverage","locations":[{"label":"Breakfast","value":"breakfast"},{"label":"Lunch","value":"lunch"},{"label":"Dinner","value":"dinner"},{"label":"Morning Snack","value":"morning-snack"},{"label":"Afternoon Snack","value":"afternoon-snack"},{"label":"Evening Snack","value":"evening-snack"},{"label":"Beverage / Hydration","value":"beverage"},{"label":"Pre/Post Workout","value":"pre-post-workout"}],"entryTitle":"Diet Entry","notesLabel":"Notes","locationLabel":"Meal Category","triggersLabel":"Influencing Factors","addButtonLabel":"Log Meal","intensityLabel":"Nutritional Quality","intensityScale":"low_bad","emptyStateTitle":"Start Your Food Journal","notesPlaceholder":"List foods, portion sizes, or specific ingredients consumed...","emptyStateBullets":["Identify food sensitivities and how they affect your energy and mood.","Monitor macronutrient balance and portion control for weight management.","Build sustainable healthy eating habits through mindful awareness."],"intensityMaxLabel":"10 - Whole Foods / Optimal","intensityMinLabel":"1 - Highly Processed / Poor","suggestedHashtags":["mindfuleating","nutrition","hydration","wholefoods","mealprep","balanceddiet","guthealth"],"locationPlaceholder":"Select meal or category...","deleteConfirmMessage":"Are you sure you want to delete this food entry?","emptyStateDescription":"Tracking your diet helps you identify patterns between what you eat and how you feel, while ensuring you meet your nutritional goals."},"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-1639e8fb-f815-4397-a276-ca74de5e0ca9-1766870162219.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLTE2MzllOGZiLWY4MTUtNDM5Ny1hMjc2LWNhNzRkZTVlMGNhOS0xNzY2ODcwMTYyMjE5LnBuZyIsImlhdCI6MTc2Njg3MDE2MywiZXhwIjoxNzk4NDA2MTYzfQ.E_U5-L2XkCq8Ei4IgsR_nVEcE0W-AFjBc8Es1AiCXeo","image_generated_at":null,"image_model_name":null,"confirmed_interpretation":null},
  {"id":"018939ee-07f6-44f9-9774-fbab31802934","user_id":"c444184b-98a7-4e1b-ae2e-4bc19624e8f6","name":"Hypertension","type":"custom","preset_id":null,"icon":"activity","color":"#6366f1","is_default":false,"schema_version":1,"generated_config":{"triggers":["High Sodium/Salt Intake","Stress","Caffeine","Alcohol Consumption","Missed Medication","Poor Sleep","Anxiety","Physical Exertion","Smoking","Pain","Dehydration","Cold Weather"],"formTitle":"New Hypertension Entry","locations":[{"label":"Morning Reading","value":"morning-reading"},{"label":"Afternoon Reading","value":"afternoon-reading"},{"label":"Evening Reading","value":"evening-reading"},{"label":"Before Bed","value":"before-bed"},{"label":"Post-Exercise","value":"post-exercise"},{"label":"Post-Medication","value":"post-medication"},{"label":"Doctor's Office","value":"doctors-office"},{"label":"Pharmacy Kiosk","value":"pharmacy-kiosk"}],"entryTitle":"Blood Pressure Reading","notesLabel":"Reading & Notes","locationLabel":"Measurement Context","triggersLabel":"Potential Factors","addButtonLabel":"Log Reading","intensityLabel":"Blood Pressure Severity","intensityScale":"high_bad","emptyStateTitle":"Track Your Blood Pressure","notesPlaceholder":"Record your Systolic/Diastolic (e.g., 130/85) and any symptoms.","emptyStateBullets":["Identify trends and spikes throughout the day","Monitor the effectiveness of lifestyle changes or medication","Share an accurate history with your medical team"],"intensityMaxLabel":"10 - Hypertensive Crisis","intensityMinLabel":"1 - Normal/Healthy","suggestedHashtags":["hypertension","bloodpressure","hearthealth","cardio","wellness","bplog","healthyhabits"],"locationPlaceholder":"Select when or where...","deleteConfirmMessage":"Are you sure you want to delete this blood pressure entry?","emptyStateDescription":"Consistently logging your readings helps you and your healthcare provider manage your heart health and identify long-term patterns."},"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-018939ee-07f6-44f9-9774-fbab31802934-1766962681009.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLTAxODkzOWVlLTA3ZjYtNDRmOS05Nzc0LWZiYWIzMTgwMjkzNC0xNzY2OTYyNjgxMDA5LnBuZyIsImlhdCI6MTc2Njk2MjY4MiwiZXhwIjoxNzk4NDk4NjgyfQ.S_me8HPH8fEZDqDmpY0RrHyPEAauG-i33dwYZNlVd6o","image_generated_at":"2025-12-28 22:58:02.363+00","image_model_name":"gemini-2.5-flash-image","confirmed_interpretation":null},
  {"id":"0d96667a-6afd-465c-bb0b-1e14dc04c03c","user_id":"c444184b-98a7-4e1b-ae2e-4bc19624e8f6","name":"Medication & Supplements","type":"preset","preset_id":"medication","icon":"pill","color":"#10b981","is_default":false,"schema_version":1,"generated_config":null,"user_description":null,"image_url":"https://pklapqontsftzmblmnwv.supabase.co/storage/v1/object/sign/tracker-images/tracker-0d96667a-6afd-465c-bb0b-1e14dc04c03c-1766996459986.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82YWM4OTUxNC1mOWI5LTQyODItOGJkZC1hMjNiNTY4ODM2MDAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0cmFja2VyLWltYWdlcy90cmFja2VyLTBkOTY2NjdhLTZhZmQtNDY1Yy1iYjBiLTFlMTRkYzA0YzAzYy0xNzY2OTk2NDU5OTg2LnBuZyIsImlhdCI6MTc2Njk5NjQ2MCwiZXhwIjoxNzk4NTMyNDYwfQ.a2yUTilE5pIQn5FD_4_CFcHcGbBaS6y9lA7QQ5Nvml0","image_generated_at":"2025-12-29 08:21:00.83+00","image_model_name":"gemini-2.5-flash-image","confirmed_interpretation":null}
];

// === ENTRY DATA (from Supabase public.tracker_entries) ===
// Entries stored in separate file due to size
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let entries;
try {
  entries = JSON.parse(readFileSync(join(__dirname, "migration-entries.json"), "utf-8"));
} catch (e) {
  console.error("Could not load entries from migration-entries.json");
  console.error("Please create this file first by running the data export");
  process.exit(1);
}

async function main() {
  console.log("=".repeat(60));
  console.log("COMPLETE DATA MIGRATION: SUPABASE -> CONVEX");
  console.log("=".repeat(60));
  console.log(`\nMigrating:`);
  console.log(`  Users:    ${users.length}`);
  console.log(`  Trackers: ${trackers.length}`);
  console.log(`  Entries:  ${entries.length}`);
  console.log();

  try {
    // Import the API dynamically
    const { api } = await import("../convex/_generated/api.js");

    console.log("[1/3] Migrating users with existing passwords...");
    const result = await convex.action(api.runMigrations.runCompleteMigration, {
      users,
      trackers,
      entries,
    });

    console.log("\n" + "=".repeat(60));
    console.log("MIGRATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`  Users created:     ${result.users.created}/${result.users.total}`);
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

    const expected = { users: 4, profiles: 4, trackers: 11, entries: 90 };

    if (
      stats.users === expected.users &&
      stats.profiles === expected.profiles &&
      stats.trackers === expected.trackers &&
      stats.entries === expected.entries
    ) {
      console.log("\n✓ ALL COUNTS MATCH - MIGRATION SUCCESSFUL!");
    } else {
      console.log("\n⚠ COUNT MISMATCH - Please verify:");
      console.log(`  Users:    ${stats.users}/${expected.users}`);
      console.log(`  Profiles: ${stats.profiles}/${expected.profiles}`);
      console.log(`  Trackers: ${stats.trackers}/${expected.trackers}`);
      console.log(`  Entries:  ${stats.entries}/${expected.entries}`);
    }
  } catch (error) {
    console.error("\nMigration failed:", error);
    process.exit(1);
  }
}

main();
