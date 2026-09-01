import crypto from "crypto";
import { z } from "zod";
import {
  McpServer,
  createMcpHandler,
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";
import * as db from "./db";
import { resolveBlogCreateStatus } from "./authz";
import { sanitizeUserHtml } from "./sanitizeHtml";
import { ENV } from "./_core/env";

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) + "-" + Date.now();
}

export function hashApiToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateApiToken(): string {
  return "opa_live_" + crypto.randomBytes(32).toString("hex");
}

const verifier: OAuthTokenVerifier = {
  async verifyAccessToken(token): Promise<AuthInfo> {
    const record = await db.getApiTokenByHash(hashApiToken(token));
    if (!record || record.revokedAt) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid or revoked API token");
    }
    const user = await db.getUserById(record.userId);
    if (!user) {
      throw new OAuthError(OAuthErrorCode.InvalidToken, "Token owner no longer exists");
    }
    db.touchApiTokenLastUsed(record.id).catch(() => {});
    return {
      token,
      clientId: user.email ?? String(user.id),
      scopes: ["post"],
      // Personal tokens don't expire on a schedule; the verifier itself (via
      // the api_tokens table) is the source of truth for revocation. A
      // far-future expiresAt satisfies the SDK's requirement that it be set.
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
      extra: { userId: user.id, role: user.role, name: user.name },
    };
  },
};

export { verifier as apiTokenVerifier };

const CreateDiscussionInput = z.object({
  title: z.string().min(3).max(256).describe("Discussion title"),
  content: z.string().min(10).describe("Discussion body. Plain text or basic HTML."),
  category: z.string().describe("Forum category name to post into (case-insensitive, e.g. \"Technical Guides\"). Use list_categories to see valid options."),
  tags: z.array(z.string()).max(10).optional().describe("Optional tags to attach"),
});

const CreateBlogPostInput = z.object({
  title: z.string().min(3).max(256).describe("Blog post title"),
  content: z.string().min(10).describe("Blog post body. Plain text or basic HTML."),
  excerpt: z.string().max(500).optional().describe("Short summary shown in post listings"),
  publish: z.boolean().optional().describe("Publish immediately instead of saving as a draft. Only takes effect for admin accounts — other accounts always save as a draft pending review."),
});

/** Builds a fresh McpServer for one request, scoped to the authenticated caller. */
export function buildMcpServer(authInfo: AuthInfo | undefined): McpServer {
  const server = new McpServer({ name: "opa-community", version: "1.0.0" });
  const extra = authInfo?.extra as { userId?: number; role?: string; name?: string } | undefined;
  const userId = extra?.userId;
  const role = extra?.role ?? "user";

  server.registerTool(
    "list_categories",
    { description: "List the forum categories available for create_discussion." },
    async () => {
      const categories = await db.getForumCategories();
      const names = categories.map((c: any) => c.name).join("\n");
      return { content: [{ type: "text", text: names || "No categories found." }] };
    }
  );

  server.registerTool(
    "create_discussion",
    {
      title: "Create Discussion",
      description: "Post a new discussion thread to the OPA Community forum.",
      inputSchema: CreateDiscussionInput,
    },
    async (input) => {
      if (!userId) {
        return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
      }
      const categories = await db.getForumCategories();
      const match = categories.find((c: any) => c.name.toLowerCase() === input.category.toLowerCase());
      if (!match) {
        const names = categories.map((c: any) => c.name).join(", ");
        return {
          content: [{ type: "text", text: `Unknown category "${input.category}". Available categories: ${names}` }],
          isError: true,
        };
      }
      const slug = slugify(input.title);
      const result = await db.createDiscussion({
        title: input.title,
        slug,
        content: sanitizeUserHtml(input.content),
        categoryId: match.id,
        authorId: userId,
      });
      if (input.tags && input.tags.length > 0) {
        const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;
        if (insertId) {
          const tagIds = await Promise.all(input.tags.map((name) => db.findOrCreateTag(name)));
          await db.addTagsToPost(tagIds, "discussion", insertId);
        }
      }
      return {
        content: [{ type: "text", text: `Discussion posted: ${ENV.appBaseUrl}/community/${slug}` }],
      };
    }
  );

  server.registerTool(
    "create_blog_post",
    {
      title: "Create Blog Post",
      description: "Publish a blog post to the OPA Community blog. Non-admin accounts always save as a draft pending review.",
      inputSchema: CreateBlogPostInput,
    },
    async (input) => {
      if (!userId) {
        return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
      }
      const slug = slugify(input.title);
      const status = resolveBlogCreateStatus(role, input.publish ? "published" : "draft");
      const post = await db.createBlogPost({
        title: input.title,
        slug,
        content: sanitizeUserHtml(input.content),
        excerpt: input.excerpt,
        authorId: userId,
        status,
      });
      const url = status === "published" ? `${ENV.appBaseUrl}/blog/${slug}` : `${ENV.appBaseUrl}/blog/${slug} (draft, pending review)`;
      return { content: [{ type: "text", text: `Blog post ${status === "published" ? "published" : "saved as draft"}: ${url}` }] };
    }
  );

  return server;
}

export const mcpHandler = createMcpHandler(({ authInfo }) => buildMcpServer(authInfo));
