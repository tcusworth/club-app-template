/**
 * Forum Category Seed Script
 * Run: node seed-forum-categories.mjs
 * Seeds all OPA Community Forum categories with parent/child hierarchy.
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

// Helper to slugify
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Clear existing categories
await conn.execute("DELETE FROM forum_categories");
console.log("Cleared existing forum_categories");

// Insert parent categories first (parentId = 0 means top-level)
const parents = [
  { name: "Architecture & Modernization", slug: "architecture-modernization", description: "System design, migration strategies, and modernization approaches for OPA/O-PAS environments.", icon: "🏗️", displayOrder: 10 },
  { name: "Technical Guides", slug: "technical-guides", description: "How-tos, implementation guides, troubleshooting, and best practices for OPA practitioners.", icon: "🔧", displayOrder: 20 },
  { name: "Business & Strategy", slug: "business-strategy", description: "Economics, ROI, vendor landscape, and executive guidance for OPA adoption.", icon: "📊", displayOrder: 30 },
  { name: "Community Discussions", slug: "community-discussions", description: "General Q&A, news, events, and community conversations.", icon: "💬", displayOrder: 40 },
  { name: "Custom Pages", slug: "custom-pages", description: "Custom community pages and resources.", icon: "📄", displayOrder: 50 },
];

const parentIds = {};
for (const p of parents) {
  const [result] = await conn.execute(
    "INSERT INTO forum_categories (name, slug, description, icon, parentId, displayOrder) VALUES (?, ?, ?, ?, 0, ?)",
    [p.name, p.slug, p.description, p.icon, p.displayOrder]
  );
  parentIds[p.slug] = result.insertId;
  console.log(`  ✓ Parent: ${p.name} (id=${result.insertId})`);
}

// Top-level standalone categories (no parent)
const topLevel = [
  { name: "Glossary", slug: "glossary", description: "Definitions and terminology for OPA, O-PAS, and related standards.", icon: "📖", displayOrder: 1 },
  { name: "Beginner FAQ", slug: "beginner-faq", description: "Frequently asked questions for those new to Open Process Automation.", icon: "❓", displayOrder: 2 },
  { name: "Starter Kit", slug: "starter-kit", description: "Getting started resources, guides, and onboarding materials.", icon: "🚀", displayOrder: 3 },
];

for (const t of topLevel) {
  const [result] = await conn.execute(
    "INSERT INTO forum_categories (name, slug, description, icon, parentId, displayOrder) VALUES (?, ?, ?, ?, 0, ?)",
    [t.name, t.slug, t.description, t.icon, t.displayOrder]
  );
  console.log(`  ✓ Top-level: ${t.name} (id=${result.insertId})`);
}

// Children of Architecture & Modernization
const archChildren = [
  { name: "System Architecture", slug: "system-architecture", description: "O-PAS system design, reference architectures, and integration patterns.", displayOrder: 1 },
  { name: "Migration & Modernizations", slug: "migration-modernizations", description: "Strategies and case studies for migrating from legacy DCS/PLC to OPA.", displayOrder: 2 },
  { name: "Control Software & Portability", slug: "control-software-portability", description: "Portable control applications, DCN, and software-defined automation.", displayOrder: 3 },
  { name: "Cybersecurity", slug: "cybersecurity", description: "Security considerations, standards, and best practices for OPA systems.", displayOrder: 4 },
  { name: "O-PAS Profiles", slug: "o-pas-profiles", description: "O-PAS standard profiles, conformance, and certification discussions.", displayOrder: 5 },
];

for (const c of archChildren) {
  const [result] = await conn.execute(
    "INSERT INTO forum_categories (name, slug, description, icon, parentId, displayOrder) VALUES (?, ?, ?, '🔩', ?, ?)",
    [c.name, c.slug, c.description, parentIds["architecture-modernization"], c.displayOrder]
  );
  console.log(`    ✓ Child: ${c.name} (id=${result.insertId})`);
}

// Children of Technical Guides
const techChildren = [
  { name: "Troubleshooting", slug: "troubleshooting", description: "Diagnosing and resolving issues in OPA implementations.", displayOrder: 1 },
  { name: "Implementation Guides", slug: "implementation-guides", description: "Step-by-step guides for deploying OPA components and systems.", displayOrder: 2 },
  { name: "Best Practices", slug: "best-practices", description: "Proven approaches and recommendations from OPA practitioners.", displayOrder: 3 },
  { name: "How-Tos", slug: "how-tos", description: "Practical how-to articles for common OPA tasks and configurations.", displayOrder: 4 },
  { name: "Architecture Diagrams", slug: "architecture-diagrams", description: "Visual diagrams, templates, and reference drawings for OPA systems.", displayOrder: 5 },
];

for (const c of techChildren) {
  const [result] = await conn.execute(
    "INSERT INTO forum_categories (name, slug, description, icon, parentId, displayOrder) VALUES (?, ?, ?, '📋', ?, ?)",
    [c.name, c.slug, c.description, parentIds["technical-guides"], c.displayOrder]
  );
  console.log(`    ✓ Child: ${c.name} (id=${result.insertId})`);
}

// Children of Business & Strategy
const bizChildren = [
  { name: "Economics & ROI", slug: "economics-roi", description: "Cost-benefit analysis, ROI models, and financial justification for OPA.", displayOrder: 1 },
  { name: "Modernization Strategy", slug: "modernization-strategy", description: "Strategic planning frameworks for OPA adoption and transformation.", displayOrder: 2 },
  { name: "Vendor Landscape (neutral)", slug: "vendor-landscape-neutral", description: "Neutral analysis of vendors, products, and market positioning in OPA.", displayOrder: 3 },
  { name: "Executive Guides", slug: "executive-guides", description: "High-level guidance for executives and decision-makers on OPA adoption.", displayOrder: 4 },
];

for (const c of bizChildren) {
  const [result] = await conn.execute(
    "INSERT INTO forum_categories (name, slug, description, icon, parentId, displayOrder) VALUES (?, ?, ?, '💼', ?, ?)",
    [c.name, c.slug, c.description, parentIds["business-strategy"], c.displayOrder]
  );
  console.log(`    ✓ Child: ${c.name} (id=${result.insertId})`);
}

// Children of Community Discussions
const communityChildren = [
  { name: "General Q&A", slug: "general-qa", description: "Open questions and answers for the OPA community.", displayOrder: 1 },
  { name: "News", slug: "news", description: "Industry news, announcements, and updates relevant to OPA.", displayOrder: 2 },
  { name: "Events & Webinars", slug: "events-webinars", description: "Upcoming events, webinars, conferences, and meetups.", displayOrder: 3 },
];

for (const c of communityChildren) {
  const [result] = await conn.execute(
    "INSERT INTO forum_categories (name, slug, description, icon, parentId, displayOrder) VALUES (?, ?, ?, '🗣️', ?, ?)",
    [c.name, c.slug, c.description, parentIds["community-discussions"], c.displayOrder]
  );
  console.log(`    ✓ Child: ${c.name} (id=${result.insertId})`);
}

await conn.end();
console.log("\n✅ Forum categories seeded successfully!");
