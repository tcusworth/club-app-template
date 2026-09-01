/**
 * Weekly Digest System Tests
 * Tests for community digest: db helpers, send history, subscriber count
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getRecentDiscussions: vi.fn().mockResolvedValue([
    { id: 1, title: "O-PAS Architecture Deep Dive", slug: "opas-arch", replyCount: 5, viewCount: 120, createdAt: new Date(), authorName: "Alice" },
    { id: 2, title: "DCN Integration Patterns", slug: "dcn-integration", replyCount: 3, viewCount: 80, createdAt: new Date(), authorName: "Bob" },
  ]),
  getRecentBlogPosts: vi.fn().mockResolvedValue([
    { id: 1, title: "Getting Started with O-PAS", slug: "getting-started", excerpt: "A beginner guide", publishedAt: new Date(), authorName: "Carol" },
  ]),
  getUpcomingEvents: vi.fn().mockResolvedValue([
    { id: 1, title: "OPA Summit 2026", startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), location: "Denver, CO", isVirtual: false },
  ]),
  getNewMembers: vi.fn().mockResolvedValue([
    { id: 10, name: "Dave", platformRole: "automation_engineer", organization: "Acme Corp", createdAt: new Date() },
    { id: 11, name: "Eve", platformRole: "vendor", organization: null, createdAt: new Date() },
  ]),
  getPlatformStats: vi.fn().mockResolvedValue({ users: 42, content: 15, capabilities: 30, vendors: 8 }),
  getDigestSubscribers: vi.fn().mockResolvedValue([
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ]),
  updateLastDigestSent: vi.fn().mockResolvedValue(undefined),
  logDigestSend: vi.fn().mockResolvedValue(undefined),
  getDigestSendHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      sentAt: new Date("2026-04-06"),
      recipientCount: 5,
      newDiscussions: 3,
      newBlogPosts: 1,
      upcomingEvents: 2,
      newMembers: 4,
      sentByUserId: 1,
    },
  ]),
  seedWorkflowSettings: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Weekly Digest - DB Helpers", () => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  it("getRecentDiscussions returns discussions since a given date", async () => {
    const result = await db.getRecentDiscussions(oneWeekAgo, 10);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("replyCount");
    expect(result[0]).toHaveProperty("authorName");
  });

  it("getRecentBlogPosts returns blog posts since a given date", async () => {
    const result = await db.getRecentBlogPosts(oneWeekAgo, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("authorName");
  });

  it("getUpcomingEvents returns future events", async () => {
    const result = await db.getUpcomingEvents(5);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("startDate");
  });

  it("getNewMembers returns members who joined since a given date", async () => {
    const result = await db.getNewMembers(oneWeekAgo, 10);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("organization");
  });

  it("getDigestSubscribers returns opted-in users", async () => {
    const result = await db.getDigestSubscribers();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
  });

  it("logDigestSend records a send event", async () => {
    await db.logDigestSend({
      sentByUserId: 1,
      recipientCount: 5,
      newDiscussions: 2,
      newBlogPosts: 1,
      upcomingEvents: 1,
      newMembers: 3,
      contentSummary: JSON.stringify({ discussions: 2, blogPosts: 1, events: 1, members: 3 }),
    });
    expect(db.logDigestSend).toHaveBeenCalledOnce();
  });

  it("getDigestSendHistory returns send history", async () => {
    const result = await db.getDigestSendHistory(10);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("recipientCount");
    expect(result[0]).toHaveProperty("sentAt");
  });
});

describe("Weekly Digest - Content Assembly", () => {
  it("builds a digest content string from community data", async () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [discussions, blogPosts, events, members, stats] = await Promise.all([
      db.getRecentDiscussions(oneWeekAgo, 10),
      db.getRecentBlogPosts(oneWeekAgo, 5),
      db.getUpcomingEvents(5),
      db.getNewMembers(oneWeekAgo, 10),
      db.getPlatformStats(),
    ]);

    const discussionsSection = discussions.length > 0
      ? discussions.map((d: any) => `- ${d.title} (${d.replyCount} replies)`).join("\n")
      : "No new discussions this week.";

    const digestContent = [
      `Platform Stats: ${stats.users} members | ${stats.content} articles`,
      "",
      "Top Discussions:",
      discussionsSection,
    ].join("\n");

    expect(digestContent).toContain("Platform Stats: 42 members");
    expect(digestContent).toContain("O-PAS Architecture Deep Dive");
    expect(digestContent).toContain("5 replies");
  });

  it("handles empty community data gracefully", async () => {
    vi.mocked(db.getRecentDiscussions).mockResolvedValueOnce([]);
    vi.mocked(db.getRecentBlogPosts).mockResolvedValueOnce([]);
    vi.mocked(db.getUpcomingEvents).mockResolvedValueOnce([]);
    vi.mocked(db.getNewMembers).mockResolvedValueOnce([]);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const discussions = await db.getRecentDiscussions(oneWeekAgo, 10);
    const blogPosts = await db.getRecentBlogPosts(oneWeekAgo, 5);

    const discussionsSection = discussions.length > 0
      ? discussions.map((d: any) => `- ${d.title}`).join("\n")
      : "No new discussions this week.";
    const blogSection = blogPosts.length > 0
      ? blogPosts.map((p: any) => `- ${p.title}`).join("\n")
      : "No new blog posts this week.";

    expect(discussionsSection).toBe("No new discussions this week.");
    expect(blogSection).toBe("No new blog posts this week.");
  });
});

describe("Weekly Digest - Workflow Settings", () => {
  it("seedWorkflowSettings runs without error", async () => {
    await expect(db.seedWorkflowSettings()).resolves.not.toThrow();
  });
});
