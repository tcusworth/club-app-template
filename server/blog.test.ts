import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

// Blog post CRUD tests
describe("Blog CRUD", () => {
  let createdId: number;
  const slug = `test-blog-post-${Date.now()}`;

  it("should create a published blog post", async () => {
    const post = await db.createBlogPost({
      title: "Test Blog Post",
      slug,
      content: "This is the content of the test blog post.",
      excerpt: "A short excerpt.",
      authorId: 1,
      status: "published",
    });
    expect(post).toBeDefined();
    expect(post.title).toBe("Test Blog Post");
    createdId = post.id;
  });

  it("should list published blog posts", async () => {
    const posts = await db.listBlogPosts("published");
    expect(Array.isArray(posts)).toBe(true);
    const found = posts.find((p) => p.slug === slug);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Test Blog Post");
  });

  it("should get a blog post by slug", async () => {
    const post = await db.getBlogPostBySlug(slug);
    expect(post).toBeDefined();
    expect(post?.title).toBe("Test Blog Post");
    expect(post?.content).toBe("This is the content of the test blog post.");
  });

  it("should update a blog post", async () => {
    await db.updateBlogPost(createdId, { title: "Updated Blog Post" });
    const updated = await db.getBlogPostBySlug(slug);
    expect(updated?.title).toBe("Updated Blog Post");
  });

  it("should delete a blog post", async () => {
    await db.deleteBlogPost(createdId);
    const deleted = await db.getBlogPostBySlug(slug);
    expect(deleted).toBeNull();
  });

  it("should return null for non-existent slug", async () => {
    const result = await db.getBlogPostBySlug("this-slug-does-not-exist-xyz");
    expect(result).toBeNull();
  });
});
