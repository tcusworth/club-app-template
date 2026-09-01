import mysql from 'mysql2/promise';
import fs from 'fs';

const sql = fs.readFileSync('./drizzle/0012_square_victor_mancha.sql', 'utf8');
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const statements = sql
  .split(/--> statement-breakpoint/g)
  .flatMap(chunk => chunk.split(';'))
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log('OK:', stmt.slice(0, 60));
  } catch(e) {
    if (e.message.includes('already exists') || e.message.includes('Duplicate')) {
      console.log('SKIP:', stmt.slice(0, 60));
    } else { throw e; }
  }
}
await conn.end();
console.log('Migration applied successfully');
