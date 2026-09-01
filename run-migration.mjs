import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const sql = readFileSync("./drizzle/0022_mature_photon.sql", "utf-8");

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(sql);
  console.log("Migration applied successfully.");
} catch (e) {
  if (e.code === "ER_TABLE_EXISTS_ERROR") {
    console.log("Table already exists, skipping.");
  } else {
    console.error("Migration error:", e.message);
    process.exit(1);
  }
} finally {
  await conn.end();
}
