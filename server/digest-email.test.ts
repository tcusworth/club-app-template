import { describe, it, expect } from "vitest";
import { buildWeeklyDigestEmail } from "./email";

const baseOpts = {
  recipientName: "Trevor",
  discussions: [
    { title: "What is OPA?", replyCount: 12, viewCount: 45, slug: "what-is-opa", authorName: "Alice" },
    { title: "O-PAS Architecture", replyCount: 8, viewCount: 30, slug: "o-pas-arch", authorName: "Bob" },
  ],
  blogPosts: [
    { title: "Getting Started with OPA", slug: "getting-started", authorName: "Trevor", excerpt: "A beginner's guide to Open Process Automation standards and practices." },
  ],
  events: [
    { title: "OPA Webinar", startDate: new Date("2026-05-01T14:00:00Z"), eventType: "webinar" },
  ],
  newMembers: [
    { name: "Jane Doe", organization: "Acme Corp" },
    { name: "John Smith" },
  ],
  stats: { totalMembers: 150, totalDiscussions: 42, totalArticles: 25, newThisWeek: 7 },
  baseUrl: "http://localhost:3000",
};

describe("buildWeeklyDigestEmail", () => {
  it("returns subject, html, and text fields", () => {
    const result = buildWeeklyDigestEmail(baseOpts);
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });

  it("subject includes 'OPA Community Weekly Digest'", () => {
    const { subject } = buildWeeklyDigestEmail(baseOpts);
    expect(subject).toContain("OPA Community Weekly Digest");
  });

  it("html contains recipient name", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("Hi Trevor");
  });

  it("html contains platform stats", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("150"); // totalMembers
    expect(html).toContain("42"); // totalDiscussions
    expect(html).toContain("25"); // totalArticles
    expect(html).toContain("+7"); // newThisWeek
  });

  it("html contains discussion titles with links", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("What is OPA?");
    expect(html).toContain("/community/what-is-opa");
    expect(html).toContain("12 replies");
    expect(html).toContain("45 views");
    expect(html).toContain("by Alice");
  });

  it("html contains blog post titles with links", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("Getting Started with OPA");
    expect(html).toContain("/blog/getting-started");
    expect(html).toContain("by Trevor");
  });

  it("html contains event titles with type badges", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("OPA Webinar");
    expect(html).toContain("Webinar"); // capitalized badge
  });

  it("html contains new member names", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("Jane Doe");
    expect(html).toContain("(Acme Corp)");
    expect(html).toContain("John Smith");
  });

  it("html contains Visit OPA Community CTA", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("Visit OPA Community");
    expect(html).toContain(baseOpts.baseUrl);
  });

  it("html contains manage preferences link", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("/settings");
    expect(html).toContain("Manage preferences");
  });

  it("text fallback contains discussion titles", () => {
    const { text } = buildWeeklyDigestEmail(baseOpts);
    expect(text).toContain("What is OPA?");
    expect(text).toContain("12 replies");
  });

  it("text fallback contains blog post titles", () => {
    const { text } = buildWeeklyDigestEmail(baseOpts);
    expect(text).toContain("Getting Started with OPA");
  });

  it("handles empty discussions gracefully", () => {
    const { html } = buildWeeklyDigestEmail({ ...baseOpts, discussions: [] });
    expect(html).not.toContain("Top Discussions This Week");
    expect(html).toContain("Hi Trevor");
  });

  it("handles empty blog posts gracefully", () => {
    const { html } = buildWeeklyDigestEmail({ ...baseOpts, blogPosts: [] });
    expect(html).not.toContain("Latest Blog Posts");
  });

  it("handles empty events gracefully", () => {
    const { html } = buildWeeklyDigestEmail({ ...baseOpts, events: [] });
    expect(html).not.toContain("Upcoming Events");
  });

  it("handles empty new members gracefully", () => {
    const { html } = buildWeeklyDigestEmail({ ...baseOpts, newMembers: [] });
    expect(html).not.toContain("Welcome New Members");
  });

  it("handles all empty sections gracefully", () => {
    const { html, text } = buildWeeklyDigestEmail({
      ...baseOpts,
      discussions: [],
      blogPosts: [],
      events: [],
      newMembers: [],
    });
    expect(html).toContain("Hi Trevor");
    expect(html).toContain("Visit OPA Community");
    expect(text).toContain("OPA Community Weekly Digest");
  });

  it("truncates blog excerpt to 80 chars", () => {
    const longExcerpt = "A".repeat(120);
    const { html } = buildWeeklyDigestEmail({
      ...baseOpts,
      blogPosts: [{ title: "Long Post", slug: "long", authorName: "X", excerpt: longExcerpt }],
    });
    expect(html).toContain("...");
    // Should contain first 80 chars
    expect(html).toContain("A".repeat(80));
  });

  it("shows 'and X more' when more than 5 new members", () => {
    const manyMembers = Array.from({ length: 8 }, (_, i) => ({ name: `Member ${i + 1}` }));
    const { html } = buildWeeklyDigestEmail({ ...baseOpts, newMembers: manyMembers });
    expect(html).toContain("and 3 more");
  });

  it("limits discussions to 5 items", () => {
    const manyDiscussions = Array.from({ length: 10 }, (_, i) => ({
      title: `Discussion ${i + 1}`,
      replyCount: i,
      slug: `disc-${i + 1}`,
    }));
    const { html } = buildWeeklyDigestEmail({ ...baseOpts, discussions: manyDiscussions });
    expect(html).toContain("Discussion 5");
    expect(html).not.toContain("Discussion 6");
  });

  it("html is valid HTML with doctype", () => {
    const { html } = buildWeeklyDigestEmail(baseOpts);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });
});

describe("executeWeeklyDigest (import check)", () => {
  it("exports executeWeeklyDigest function", async () => {
    const mod = await import("./digestCron");
    expect(typeof mod.executeWeeklyDigest).toBe("function");
  });

  it("exports startDigestCron function", async () => {
    const mod = await import("./digestCron");
    expect(typeof mod.startDigestCron).toBe("function");
  });
});
