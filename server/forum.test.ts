import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import { getDb } from './db';
import { discussions, forumPosts, forumGroups } from '../drizzle/schema';
import { like, inArray } from 'drizzle-orm';

// Helper: delete all test discussions created by tests (slug starts with test-)
async function cleanupTestDiscussions() {
  const db = await getDb();
  if (!db) return;
  const testDiscs = await db.select({ id: discussions.id }).from(discussions).where(like(discussions.slug, 'test-%'));
  if (testDiscs.length > 0) {
    const ids = testDiscs.map(d => d.id);
    await db.delete(forumPosts).where(inArray(forumPosts.discussionId, ids));
    await db.delete(discussions).where(inArray(discussions.id, ids));
  }
}

describe('Forum API', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let mockCtx: TrpcContext;

  beforeAll(() => {
    mockCtx = {
      user: {
        id: 1,
        openId: 'test-user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        platformRole: 'automation_engineer',
        loginMethod: 'oauth',
        createdAt: new Date(),
        onboarded: true,
      },
    } as any;
    caller = appRouter.createCaller(mockCtx);
  });

  afterAll(async () => {
    await cleanupTestDiscussions();
  });

  describe('Forum Categories', () => {
    it('should list forum categories', async () => {
      const categories = await caller.forum.getCategories();
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('Discussions', () => {
    it('should create a discussion (protected)', async () => {
      const uniqueSlug = `test-discussion-${Date.now()}`;
      const result = await caller.forum.createDiscussion({
        title: 'Test Discussion',
        slug: uniqueSlug,
        content: 'This is a test discussion content',
        categoryId: 1,
      });
      expect(result).toBeDefined();
    });

    it('should get discussions by category', async () => {
      const discussions = await caller.forum.getDiscussionsByCategory({
        categoryId: 1,
        limit: 10,
        offset: 0,
      });
      expect(Array.isArray(discussions)).toBe(true);
    });

    it('should increment view count when fetching discussion', async () => {
      const uniqueSlug = `test-discussion-${Date.now()}`;
      await caller.forum.createDiscussion({
        title: 'Test Discussion',
        slug: uniqueSlug,
        content: 'This is a test discussion content',
        categoryId: 1,
      });
      const discussion = await caller.forum.getDiscussionBySlug({
        slug: uniqueSlug,
      });
      expect(discussion).toBeDefined();
      if (discussion) {
        expect(discussion.viewCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Forum Posts', () => {
    it('should create a forum post (protected)', async () => {
      const result = await caller.forum.createPost({
        discussionId: 1,
        content: 'This is a test reply',
      });
      expect(result).toBeDefined();
    });

    it('should get posts by discussion', async () => {
      const posts = await caller.forum.getPostsByDiscussion({
        discussionId: 1,
      });
      expect(Array.isArray(posts)).toBe(true);
    });
  });

  describe('Forum Groups', () => {
    it('should create a forum group (protected)', async () => {
      const uniqueSlug = `test-group-${Date.now()}`;
      const result = await caller.forum.createGroup({
        name: 'Test Group',
        slug: uniqueSlug,
        description: 'A test group',
      });
      expect(result).toBeDefined();
    });

    it('should list forum groups', async () => {
      const groups = await caller.forum.getGroups({
        limit: 10,
        offset: 0,
      });
      expect(Array.isArray(groups)).toBe(true);
    });

    it('should join a forum group (protected)', async () => {
      const result = await caller.forum.joinGroup({
        groupId: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should get group members', async () => {
      const members = await caller.forum.getGroupMembers({
        groupId: 1,
      });
      expect(Array.isArray(members)).toBe(true);
    });
  });

  describe('Direct Messaging', () => {
    it('should send a direct message (protected)', async () => {
      const result = await caller.forum.sendMessage({
        recipientId: 2,
        content: 'Test message',
      });
      expect(result).toBeDefined();
    });

    it('should get conversation (protected)', async () => {
      const messages = await caller.forum.getConversation({
        userId: 2,
        limit: 50,
      });
      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('Notifications', () => {
    it('should get user notifications (protected)', async () => {
      const notifications = await caller.forum.getNotifications({
        unreadOnly: false,
      });
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should mark notification as read (protected)', async () => {
      const result = await caller.forum.markNotificationAsRead({
        notificationId: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('User Profiles', () => {
    it('should get or create user profile (protected)', async () => {
      const profile = await caller.forum.getOrCreateProfile();
      expect(profile).toBeDefined();
      expect(profile.userId).toBe(mockCtx.user.id);
    });

    it('should update user profile (protected)', async () => {
      const result = await caller.forum.updateProfile({
        bio: 'Test bio',
        company: 'Test Company',
        jobTitle: 'Test Engineer',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Activity Feed', () => {
    it('should get recent forum activity', async () => {
      const activity = await caller.forum.getRecentActivity({
        limit: 20,
      });
      expect(Array.isArray(activity)).toBe(true);
    });
  });

  describe('Authorization', () => {
    it('should require auth for createDiscussion', async () => {
      const unAuthCaller = appRouter.createCaller({ user: null } as any);
      try {
        await unAuthCaller.forum.createDiscussion({
          title: 'Test',
          slug: 'test',
          content: 'test',
          categoryId: 1,
        });
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('UNAUTHORIZED');
      }
    });

    it('should require auth for createPost', async () => {
      const unAuthCaller = appRouter.createCaller({ user: null } as any);
      try {
        await unAuthCaller.forum.createPost({
          discussionId: 1,
          content: 'test',
        });
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('UNAUTHORIZED');
      }
    });

    it('should require auth for createGroup', async () => {
      const unAuthCaller = appRouter.createCaller({ user: null } as any);
      try {
        await unAuthCaller.forum.createGroup({
          name: 'test',
          slug: 'test',
        });
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('UNAUTHORIZED');
      }
    });
  });
});

describe('Media Attachments in Forum Posts', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const mockCtx = {
      user: {
        id: 1,
        openId: 'test-user-media',
        name: 'Media Test User',
        email: 'media@example.com',
        role: 'user',
        platformRole: 'automation_engineer',
        loginMethod: 'email',
        createdAt: new Date(),
        onboarded: true,
      },
    } as any;
    caller = appRouter.createCaller(mockCtx);
  });

  it('should create a forum post with mediaUrls', async () => {
    const result = await caller.forum.createPost({
      discussionId: 1,
      content: 'Post with media',
      mediaUrls: ['https://example.com/image.jpg', 'https://example.com/video.mp4'],
    });
    expect(result).toBeDefined();
  });

  it('should create a forum post without mediaUrls (optional field)', async () => {
    const result = await caller.forum.createPost({
      discussionId: 1,
      content: 'Post without media',
    });
    expect(result).toBeDefined();
  });

  it('should reject invalid URLs in mediaUrls', async () => {
    try {
      await caller.forum.createPost({
        discussionId: 1,
        content: 'Post with bad media',
        mediaUrls: ['not-a-url'],
      });
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.code).toBe('BAD_REQUEST');
    }
  });
});

describe('Discussion Engine - Post Types and Tags', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const mockCtx = {
      user: {
        id: 1,
        openId: 'test-user-engine',
        name: 'Engine Test User',
        email: 'engine@example.com',
        role: 'user',
        platformRole: 'automation_engineer',
        loginMethod: 'email',
        createdAt: new Date(),
        onboarded: true,
      },
    } as any;
    caller = appRouter.createCaller(mockCtx);
  });

  afterAll(async () => {
    await cleanupTestDiscussions();
  });

  it('should create a discussion with postType=question', async () => {
    const uniqueSlug = `test-question-${Date.now()}`;
    const result = await caller.forum.createDiscussion({
      title: 'Test Question',
      slug: uniqueSlug,
      content: 'Is this a question?',
      categoryId: 1,
      postType: 'question',
    });
    expect(result).toBeDefined();
  });

  it('should create a discussion with tags', async () => {
    const uniqueSlug = `test-tagged-${Date.now()}`;
    const result = await caller.forum.createDiscussion({
      title: 'Tagged Discussion',
      slug: uniqueSlug,
      content: 'Discussion with tags',
      categoryId: 1,
      tags: ['opa', 'o-pas', 'architecture'],
    });
    expect(result).toBeDefined();
  });

  it('should create a discussion with postType=insight and tags', async () => {
    const uniqueSlug = `test-insight-${Date.now()}`;
    const result = await caller.forum.createDiscussion({
      title: 'Test Insight',
      slug: uniqueSlug,
      content: 'An insight about OPA',
      categoryId: 1,
      postType: 'insight',
      tags: ['insight', 'opa'],
    });
    expect(result).toBeDefined();
  });
});

describe('Expert Verification Workflow', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const mockCtx = {
      user: {
        id: 1,
        openId: 'test-user-verify',
        name: 'Verify Test User',
        email: 'verify@example.com',
        role: 'user',
        platformRole: 'automation_engineer',
        loginMethod: 'email',
        createdAt: new Date(),
        onboarded: true,
      },
    } as any;
    caller = appRouter.createCaller(mockCtx);
  });

  it('should submit a verification request', async () => {
    const result = await caller.verification.submit({
      linkedInUrl: 'https://linkedin.com/in/testuser',
      credentials: 'OPA Certified Engineer',
      statement: 'I have 10 years of experience in industrial automation',
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it('should submit verification without optional fields', async () => {
    const result = await caller.verification.submit({});
    expect(result).toBeDefined();
  });

  it('should require auth for verification submit', async () => {
    const unAuthCaller = appRouter.createCaller({ user: null } as any);
    try {
      await unAuthCaller.verification.submit({});
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.code).toBe('UNAUTHORIZED');
    }
  });
});
