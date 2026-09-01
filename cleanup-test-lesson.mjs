import mysql from "mysql2/promise";
import "dotenv/config";

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [progDel] = await c.query(
  "DELETE lp FROM lesson_progress lp JOIN lessons l ON l.id = lp.lessonId WHERE l.slug LIKE 'test-lesson-%'",
);
const [lesDel] = await c.query("DELETE FROM lessons WHERE slug LIKE 'test-lesson-%'");
console.log(`Deleted ${lesDel.affectedRows} lesson row(s) and ${progDel.affectedRows} progress row(s).`);
await c.end();
