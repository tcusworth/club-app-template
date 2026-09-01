import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const sql = readFileSync('./drizzle/0011_glamorous_mandroid.sql', 'utf8');
const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

const conn = await mysql.createConnection(process.env.DATABASE_URL);
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.slice(0, 60));
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('SKIP (exists):', stmt.slice(0, 60));
    } else {
      console.error('ERR:', e.message);
    }
  }
}
await conn.end();
console.log('Migration done.');
