#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is required"); process.exit(1); }

const journalPath = path.resolve("drizzle/meta/_journal.json");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

// Backfill only 0000–0025; 0026 and 0027 must actually run on the next migrate.
const toBackfill = journal.entries.filter(e => e.idx <= 25);

const conn = await mysql.createConnection(url);
try {
  const [rows] = await conn.query("SELECT COUNT(*) AS c FROM __drizzle_migrations");
  if (rows[0].c !== 0) {
    console.error(`Refusing to run: __drizzle_migrations already has ${rows[0].c} rows.`);
    process.exit(2);
  }

  for (const entry of toBackfill) {
    const sqlPath = path.resolve(`drizzle/${entry.tag}.sql`);
    const query = fs.readFileSync(sqlPath).toString();
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    await conn.execute(
      "INSERT INTO __drizzle_migrations (`hash`, `created_at`) VALUES (?, ?)",
      [hash, entry.when]
    );
    console.log(`backfilled idx=${entry.idx}  when=${entry.when}  tag=${entry.tag}  hash=${hash.slice(0, 12)}…`);
  }

  const [final] = await conn.query("SELECT COUNT(*) AS c, MAX(created_at) AS maxCreated FROM __drizzle_migrations");
  console.log(`done. rows=${final[0].c}  max(created_at)=${final[0].maxCreated}`);
} finally {
  await conn.end();
}
