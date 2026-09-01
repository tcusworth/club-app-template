import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import { requireBearerAuth } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { appRouter } from "../routers";
import { seedWorkflowSettings, getInactiveUsers } from "../db";
import { startDigestCron } from "../digestCron";
import { startEventReminderCron } from "../eventReminderCron";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { mcpHandler, apiTokenVerifier } from "../mcp";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));
  // Seed workflow settings on startup (idempotent upsert)
  seedWorkflowSettings().catch(console.error);

  // ── Weekly digest cron: every Monday at 9:00 AM ──────────────────────────
  startDigestCron();
  // ── Event reminder cron: hourly, sends 24h-ahead reminders ────────────────
  startEventReminderCron();

  // ── Re-engagement scheduler: daily at midnight ──────────────────────────
  // Runs once on startup (offset by 5s to avoid blocking boot), then every 24h
  const runReEngagement = async () => {
    try {
      const inactive = await getInactiveUsers(30);
      if (inactive.length === 0) return;
      const { sendReEngagementEmail } = await import('../email');
      let sent = 0;
      for (const u of inactive) {
        if (u.email) {
          await sendReEngagementEmail(u.email, u.name ?? 'Member').catch(() => {});
          sent++;
        }
      }
      if (sent > 0) console.log(`[re-engagement] Sent ${sent} re-engagement emails to inactive members.`);
    } catch (err) {
      console.error('[re-engagement] Scheduler error:', err);
    }
  };
  // Run once 5s after boot, then every 24 hours
  setTimeout(() => {
    runReEngagement();
    setInterval(runReEngagement, 24 * 60 * 60 * 1000);
  }, 5000);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // MCP server — lets Claude/ChatGPT post to the community via a personal API token.
  // CORS runs before auth so the browser's preflight OPTIONS request (which never
  // carries the Authorization header) gets a clean response instead of a 401 with
  // no Access-Control-* headers, which the browser would otherwise treat as a
  // failed/unreachable request before the real POST is ever sent.
  const mcpNodeHandler = toNodeHandler(mcpHandler);
  app.use(
    "/mcp",
    cors({
      origin: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept", "Mcp-Session-Id"],
      exposedHeaders: ["Mcp-Session-Id"],
    })
  );
  app.all("/mcp", requireBearerAuth({ verifier: apiTokenVerifier }), (req, res) => {
    void mcpNodeHandler(req, res, req.body);
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
