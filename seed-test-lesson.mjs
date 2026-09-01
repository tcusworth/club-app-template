import mysql from "mysql2/promise";
import "dotenv/config";

const c = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await c.query("SELECT id, slug, title, status FROM courses ORDER BY id LIMIT 1");
const course = rows[0];
if (!course) {
  console.error("No course rows found; seed courses first.");
  process.exit(1);
}
const slug = "test-lesson-" + Date.now();
const supplementMarkdown =
  "## Test heading\n\nThis is **bold** and *italic* markdown.\n\n- bullet one\n- bullet two\n\n| col1 | col2 |\n|------|------|\n| a    | b    |";
await c.query(
  "INSERT INTO lessons (courseId, title, slug, displayOrder, isPublished, streamVideoId, supplementMarkdown) VALUES (?, ?, ?, 0, true, ?, ?)",
  [course.id, "Smoke Test Lesson", slug, "placeholder-uid-fake", supplementMarkdown],
);
console.log(`Course: ${course.title} (${course.slug}, status=${course.status})`);
console.log(`URL:    http://localhost:3000/training/${course.slug}/lessons/${slug}`);
await c.end();
