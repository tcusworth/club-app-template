import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

// First, clear existing categories to avoid duplicates
await db.execute("DELETE FROM knowledge_categories");
await db.execute("ALTER TABLE knowledge_categories AUTO_INCREMENT = 1");

// Insert parent categories first
const parents = [
  { name: "Architecture & Modernization", slug: "architecture-modernization", description: "System architecture, migration strategies, and modernization approaches", icon: "🏗️", order: 4 },
  { name: "Technical Guides", slug: "technical-guides", description: "Troubleshooting, implementation guides, best practices, and how-tos", icon: "🔧", order: 5 },
  { name: "Business & Strategy", slug: "business-strategy", description: "Economics, ROI, modernization strategy, and executive guides", icon: "📊", order: 6 },
  { name: "Community Discussions", slug: "community-discussions", description: "General Q&A, news, and events", icon: "💬", order: 7 },
  { name: "Custom Pages", slug: "custom-pages", description: "Custom content pages", icon: "📄", order: 8 },
];

const parentIds = {};
for (const parent of parents) {
  const [result] = await db.execute(
    "INSERT INTO knowledge_categories (name, slug, description, icon, `order`, parentId) VALUES (?, ?, ?, ?, ?, NULL)",
    [parent.name, parent.slug, parent.description, parent.icon, parent.order]
  );
  parentIds[parent.slug] = result.insertId;
  console.log(`✓ Parent: ${parent.name} (id: ${result.insertId})`);
}

// Insert top-level standalone categories (no parent)
const topLevel = [
  { name: "Glossary", slug: "glossary", description: "Definitions and terminology for OPA and O-PAS concepts", icon: "📖", order: 1 },
  { name: "Beginner FAQ", slug: "beginner-faq", description: "Frequently asked questions for those new to Open Process Automation", icon: "❓", order: 2 },
  { name: "Starter Kit", slug: "starter-kit", description: "Getting started resources and onboarding materials", icon: "🚀", order: 3 },
];

for (const cat of topLevel) {
  const [result] = await db.execute(
    "INSERT INTO knowledge_categories (name, slug, description, icon, `order`, parentId) VALUES (?, ?, ?, ?, ?, NULL)",
    [cat.name, cat.slug, cat.description, cat.icon, cat.order]
  );
  console.log(`✓ Top-level: ${cat.name} (id: ${result.insertId})`);
}

// Insert children under Architecture & Modernization
const archChildren = [
  { name: "System Architecture", slug: "system-architecture", description: "O-PAS system architecture patterns and reference designs", icon: "🏛️", order: 1 },
  { name: "Migration & Modernizations", slug: "migration-modernizations", description: "Strategies and guides for migrating to OPA-aligned architectures", icon: "🔄", order: 2 },
  { name: "Control Software & Portability", slug: "control-software-portability", description: "Portable control software design and implementation", icon: "💻", order: 3 },
  { name: "Cybersecurity", slug: "cybersecurity", description: "Security considerations for OPA systems", icon: "🔒", order: 4 },
  { name: "O-PAS Profiles", slug: "opas-profiles", description: "O-PAS standard profiles and conformance levels", icon: "📋", order: 5 },
];

for (const cat of archChildren) {
  const [result] = await db.execute(
    "INSERT INTO knowledge_categories (name, slug, description, icon, `order`, parentId) VALUES (?, ?, ?, ?, ?, ?)",
    [cat.name, cat.slug, cat.description, cat.icon, cat.order, parentIds["architecture-modernization"]]
  );
  console.log(`  ✓ Child (Architecture): ${cat.name} (id: ${result.insertId})`);
}

// Insert children under Technical Guides
const techChildren = [
  { name: "Troubleshooting", slug: "troubleshooting", description: "Common issues and solutions for OPA implementations", icon: "🔍", order: 1 },
  { name: "Implementation Guides", slug: "implementation-guides", description: "Step-by-step guides for implementing OPA components", icon: "📝", order: 2 },
  { name: "Best Practices", slug: "best-practices", description: "Recommended practices for OPA system design and operation", icon: "⭐", order: 3 },
  { name: "How-Tos", slug: "how-tos", description: "Practical how-to guides for specific OPA tasks", icon: "🛠️", order: 4 },
  { name: "Architecture Diagrams", slug: "architecture-diagrams", description: "Visual architecture diagrams and reference models", icon: "📐", order: 5 },
];

for (const cat of techChildren) {
  const [result] = await db.execute(
    "INSERT INTO knowledge_categories (name, slug, description, icon, `order`, parentId) VALUES (?, ?, ?, ?, ?, ?)",
    [cat.name, cat.slug, cat.description, cat.icon, cat.order, parentIds["technical-guides"]]
  );
  console.log(`  ✓ Child (Technical): ${cat.name} (id: ${result.insertId})`);
}

// Insert children under Business & Strategy
const bizChildren = [
  { name: "Economics & ROI", slug: "economics-roi", description: "Business case development and ROI analysis for OPA adoption", icon: "💰", order: 1 },
  { name: "Modernization Strategy", slug: "modernization-strategy", description: "Strategic planning for automation modernization", icon: "🎯", order: 2 },
  { name: "Vendor Landscape (neutral)", slug: "vendor-landscape", description: "Neutral analysis of the OPA vendor ecosystem", icon: "🗺️", order: 3 },
  { name: "Executive Guides", slug: "executive-guides", description: "Executive-level summaries and decision frameworks", icon: "👔", order: 4 },
];

for (const cat of bizChildren) {
  const [result] = await db.execute(
    "INSERT INTO knowledge_categories (name, slug, description, icon, `order`, parentId) VALUES (?, ?, ?, ?, ?, ?)",
    [cat.name, cat.slug, cat.description, cat.icon, cat.order, parentIds["business-strategy"]]
  );
  console.log(`  ✓ Child (Business): ${cat.name} (id: ${result.insertId})`);
}

// Insert children under Community Discussions
const communityChildren = [
  { name: "General Q&A", slug: "general-qa", description: "Open questions and answers from the OPA community", icon: "💬", order: 1 },
  { name: "News", slug: "news", description: "Latest news and updates from the OPA ecosystem", icon: "📰", order: 2 },
  { name: "Events & Webinars", slug: "events-webinars", description: "Upcoming and past OPA events, webinars, and conferences", icon: "📅", order: 3 },
];

for (const cat of communityChildren) {
  const [result] = await db.execute(
    "INSERT INTO knowledge_categories (name, slug, description, icon, `order`, parentId) VALUES (?, ?, ?, ?, ?, ?)",
    [cat.name, cat.slug, cat.description, cat.icon, cat.order, parentIds["community-discussions"]]
  );
  console.log(`  ✓ Child (Community): ${cat.name} (id: ${result.insertId})`);
}

await db.end();
console.log("\n✅ All knowledge base categories seeded successfully!");
