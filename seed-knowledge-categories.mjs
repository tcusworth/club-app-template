import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await createConnection(url);

// Check if categories already exist
const [rows] = await conn.execute("SELECT COUNT(*) as count FROM knowledge_categories");
const count = rows[0].count;

if (count > 0) {
  console.log(`Knowledge categories already seeded (${count} categories exist). Skipping.`);
  await conn.end();
  process.exit(0);
}

const categories = [
  { name: "Glossary", slug: "glossary", description: "Key terms, definitions, and OPA-specific vocabulary", icon: "📚", order: 1 },
  { name: "Beginner FAQ", slug: "beginner-faq", description: "Frequently asked questions for newcomers to OPA", icon: "❓", order: 2 },
  { name: "Starter Kit", slug: "starter-kit", description: "Getting started guides and quick start resources", icon: "🚀", order: 3 },
  { name: "Architecture & Modernization", slug: "architecture-modernization", description: "Deep dives into architecture patterns, modernization strategies, and system design", icon: "🏗️", order: 4 },
  { name: "Technical Guides", slug: "technical-guides", description: "Implementation guides, best practices, and technical documentation", icon: "⚙️", order: 5 },
  { name: "Business & Strategy", slug: "business-strategy", description: "ROI analysis, business case development, and strategic planning", icon: "💼", order: 6 },
  { name: "Community Discussions", slug: "community-discussions", description: "Curated discussions and insights from the OPA community", icon: "💬", order: 7 },
  { name: "Custom Pages", slug: "custom-pages", description: "Custom content pages and resources", icon: "📄", order: 8 },
];

for (const cat of categories) {
  await conn.execute(
    "INSERT INTO knowledge_categories (name, slug, description, icon, `order`, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
    [cat.name, cat.slug, cat.description, cat.icon, cat.order]
  );
  console.log(`✓ Seeded: ${cat.name}`);
}

console.log(`\n✅ Seeded ${categories.length} knowledge base categories.`);
await conn.end();
