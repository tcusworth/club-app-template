import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const sql = readFileSync("drizzle/0016_wealthy_cassandra_nova.sql", "utf-8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 60));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME" || e.code === "ER_TABLE_EXISTS_ERROR" || e.code === "ER_DUP_KEYNAME") {
      console.log("SKIP (already exists):", stmt.slice(0, 60));
    } else {
      console.error("ERROR:", e.message, "\nSQL:", stmt.slice(0, 120));
    }
  }
}
await conn.end();
console.log("Migration complete.");
