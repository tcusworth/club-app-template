import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const conn = await mysql.createConnection(url);
try {
  const sql = `CREATE TABLE IF NOT EXISTS \`digest_sends\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`sentAt\` timestamp NOT NULL DEFAULT (now()),
    \`sentByUserId\` int,
    \`recipientCount\` int NOT NULL DEFAULT 0,
    \`newDiscussions\` int NOT NULL DEFAULT 0,
    \`newBlogPosts\` int NOT NULL DEFAULT 0,
    \`upcomingEvents\` int NOT NULL DEFAULT 0,
    \`newMembers\` int NOT NULL DEFAULT 0,
    \`contentSummary\` text,
    CONSTRAINT \`digest_sends_id\` PRIMARY KEY(\`id\`)
  )`;
  await conn.execute(sql);
  console.log("Migration applied: digest_sends table created (or already exists)");
} finally {
  await conn.end();
}
