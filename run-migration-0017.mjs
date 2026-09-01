import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const sql = readFileSync("./drizzle/0017_melodic_legion.sql", "utf-8");
const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const statements = sql.split(";").map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    console.log("Executing:", stmt.slice(0, 80));
    await conn.execute(stmt);
  }
  console.log("Migration 0017 applied successfully");
} catch (e) {
  if (e.message?.includes("Duplicate column")) {
    console.log("Column already exists, skipping");
  } else {
    throw e;
  }
} finally {
  await conn.end();
}
