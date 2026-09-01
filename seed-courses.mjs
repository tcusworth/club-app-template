// Run with: node --loader tsx/esm seed-courses.mjs
// Or: npx tsx seed-courses.mjs
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await createConnection(DATABASE_URL);

const courseSeed = [
  { title: "O-PAS Fundamentals", slug: "opas-fundamentals", description: "A comprehensive introduction to the Open Process Automation Standard — architecture, goals, and key concepts for engineers and executives.", excerpt: "Start here: core O-PAS concepts, architecture layers, and why it matters.", level: "beginner", category: "Foundations", duration: "3h 20m", lesson_count: 12, is_free: 1, status: "published", enrolled_count: 142, rating: 48 },
  { title: "DCSA & Advanced Computing Platform", slug: "dcsa-acp", description: "Deep dive into the Distributed Control Node, Advanced Computing Platform, and how they replace traditional DCS architectures.", excerpt: "Hardware architecture for O-PAS: DCN, ACP, and the physical layer.", level: "intermediate", category: "Architecture", duration: "4h 45m", lesson_count: 18, is_free: 0, status: "published", enrolled_count: 89, rating: 49 },
  { title: "Connectivity Framework & Interoperability", slug: "connectivity-framework", description: "How the O-PAS Connectivity Framework enables vendor-neutral data exchange, OPC UA integration, and system portability.", excerpt: "OPC UA, connectivity framework, and achieving true interoperability.", level: "intermediate", category: "Integration", duration: "3h 10m", lesson_count: 14, is_free: 0, status: "published", enrolled_count: 76, rating: 47 },
  { title: "Security in Open Process Automation", slug: "opa-security", description: "Cybersecurity principles, threat modeling, and IEC 62443 alignment for OPA-based systems in industrial environments.", excerpt: "Cybersecurity for OPA: threat modeling, IEC 62443, and risk management.", level: "advanced", category: "Security", duration: "5h 00m", lesson_count: 20, is_free: 0, status: "published", enrolled_count: 54, rating: 49 },
  { title: "Building the Business Case for OPA", slug: "opa-business-case", description: "How to quantify the ROI of OPA migration, structure RFP language, and present capital justification to executives.", excerpt: "ROI modeling, procurement strategy, and executive communication for OPA.", level: "beginner", category: "Business", duration: "2h 30m", lesson_count: 10, is_free: 1, status: "published", enrolled_count: 198, rating: 46 },
  { title: "OPA System Integration Practicum", slug: "opa-integration-practicum", description: "Hands-on project-based course covering real-world OPA system integration, vendor selection, and commissioning workflows.", excerpt: "Hands-on OPA integration: vendor selection, commissioning, and real-world projects.", level: "advanced", category: "Practicum", duration: "8h 00m", lesson_count: 28, is_free: 0, status: "published", enrolled_count: 41, rating: 50 },
  { title: "AI & Analytics in OPA Environments", slug: "opa-ai-analytics", description: "Leveraging edge AI, digital twins, and advanced analytics within O-PAS-compliant architectures for operational intelligence.", excerpt: "AI, digital twins, and analytics in O-PAS environments.", level: "advanced", category: "Advanced Topics", duration: "4h 15m", lesson_count: 16, is_free: 0, status: "published", enrolled_count: 63, rating: 48 },
  { title: "OPA Migration Planning", slug: "opa-migration-planning", description: "Step-by-step methodology for planning a brownfield or greenfield migration to an OPA architecture — from assessment to go-live.", excerpt: "Migration methodology: assessment, phasing, risk management, and execution.", level: "intermediate", category: "Architecture", duration: "3h 50m", lesson_count: 15, is_free: 0, status: "published", enrolled_count: 112, rating: 47 },
];

for (const c of courseSeed) {
  await conn.execute(
    `INSERT INTO courses (title, slug, description, excerpt, level, category, duration, lessonCount, isFree, status, enrollmentCount, authorId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), enrollmentCount = VALUES(enrollmentCount)`,
    [c.title, c.slug, c.description, c.excerpt, c.level, c.category, c.duration, c.lesson_count, c.is_free, c.status, c.enrolled_count]
  );
  console.log(`Seeded: ${c.title}`);
}

await conn.end();
console.log('Done!');
