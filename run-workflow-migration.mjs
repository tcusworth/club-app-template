import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { config } from "dotenv";
config();

const sql = readFileSync("./drizzle/0013_clever_tyger_tiger.sql", "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map(s => s.trim())
  .filter(Boolean);

const conn = await createConnection(process.env.DATABASE_URL);
for (const stmt of statements) {
  console.log("Executing:", stmt.slice(0, 60) + "...");
  await conn.execute(stmt);
}

// Seed default workflow settings
const defaults = [
  ["new_member_welcome", "New Member Welcome", "Send a welcome notification when a new member joins the community"],
  ["post_submitted_moderation", "Post Submitted for Moderation", "Notify admin when a new post is submitted for review"],
  ["post_approved", "Post Approved", "Notify author when their post is approved"],
  ["post_rejected", "Post Rejected", "Notify author when their post is rejected with reason"],
  ["new_discussion_reply", "New Discussion Reply", "Notify discussion author when someone replies"],
  ["new_follower", "New Follower", "Notify user when someone follows them"],
  ["new_blog_comment", "New Blog Comment", "Notify blog author when someone comments on their post"],
  ["new_event_rsvp", "New Event RSVP", "Notify event creator when someone RSVPs"],
];

for (const [key, label, description] of defaults) {
  await conn.execute(
    "INSERT IGNORE INTO workflow_settings (workflowKey, label, description, enabled) VALUES (?, ?, ?, 1)",
    [key, label, description]
  );
}

await conn.end();
console.log("✅ Workflow tables created and seeded.");
