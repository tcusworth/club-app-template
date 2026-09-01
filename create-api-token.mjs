/**
 * Personal API Token Script
 * Mints a personal API token for MCP access (Claude/ChatGPT posting to the community).
 * Run: node create-api-token.mjs <email> ["label"]
 *
 * The raw token is only ever shown once, right here — only its SHA-256 hash
 * is stored. If lost, run this again to mint a new one (the old one still
 * works until revoked separately).
 */
import mysql from "mysql2/promise";
import crypto from "crypto";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const email = process.argv[2];
const label = process.argv[3] || "MCP (Claude/ChatGPT)";
if (!email) {
  console.error("Usage: node create-api-token.mjs <email> [\"label\"]");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const [users] = await conn.execute("SELECT id, name, email FROM users WHERE email = ? LIMIT 1", [email]);
if (users.length === 0) {
  console.error(`No user found with email ${email}`);
  process.exit(1);
}
const user = users[0];

const token = "opa_live_" + crypto.randomBytes(32).toString("hex");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

await conn.execute(
  "INSERT INTO api_tokens (userId, label, tokenHash) VALUES (?, ?, ?)",
  [user.id, label, tokenHash]
);

console.log(`\nToken created for ${user.name} <${user.email}>\n`);
console.log(token);
console.log(`\nThis is shown once — store it now. Use it as a Bearer token against POST/GET ${process.env.APP_BASE_URL || "https://app.opacommunity.com"}/mcp\n`);

await conn.end();
