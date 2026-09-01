import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

describe('Dashboard View Count Bug Fix', () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let mockCtx: TrpcContext;

  beforeAll(() => {
    mockCtx = {
      user: {
        id: 1,
        openId: 'test-user-viewcount',
        name: 'View Count Test User',
        email: 'viewcount@example.com',
        role: 'user',
        platformRole: 'automation_engineer',
        loginMethod: 'oauth',
        createdAt: new Date(),
        onboarded: true,
      },
    } as any;
    caller = appRouter.createCaller(mockCtx);
  });

  describe('getDiscussionsByCategory returns viewCount field', () => {
    it('should return discussions with viewCount field (not views)', async () => {
      const discussions = await caller.forum.getDiscussionsByCategory({
        categoryId: 0,
        limit: 5,
      });
      expect(Array.isArray(discussions)).toBe(true);
      // Each discussion should have viewCount as a number, not undefined
      for (const discussion of discussions) {
        expect(discussion).toHaveProperty('viewCount');
        expect(typeof discussion.viewCount).toBe('number');
        // Should NOT have a 'views' property (that was the bug)
        expect(discussion).not.toHaveProperty('views');
      }
    });

    it('should return discussions with replyCount field', async () => {
      const discussions = await caller.forum.getDiscussionsByCategory({
        categoryId: 0,
        limit: 5,
      });
      for (const discussion of discussions) {
        expect(discussion).toHaveProperty('replyCount');
        expect(typeof discussion.replyCount).toBe('number');
      }
    });

    it('should return discussions with slug field for navigation', async () => {
      const discussions = await caller.forum.getDiscussionsByCategory({
        categoryId: 0,
        limit: 5,
      });
      for (const discussion of discussions) {
        expect(discussion).toHaveProperty('slug');
        expect(typeof discussion.slug).toBe('string');
        expect(discussion.slug.length).toBeGreaterThan(0);
      }
    });

    it('should return discussions with isPinned field', async () => {
      const discussions = await caller.forum.getDiscussionsByCategory({
        categoryId: 0,
        limit: 5,
      });
      for (const discussion of discussions) {
        expect(discussion).toHaveProperty('isPinned');
      }
    });

    it('should return discussions with createdAt field for date display', async () => {
      const discussions = await caller.forum.getDiscussionsByCategory({
        categoryId: 0,
        limit: 5,
      });
      for (const discussion of discussions) {
        expect(discussion).toHaveProperty('createdAt');
        // createdAt should be a valid date
        expect(new Date(discussion.createdAt).toString()).not.toBe('Invalid Date');
      }
    });
  });

  describe('getDiscussionBySlug returns viewCount field', () => {
    it('should return discussion with viewCount on individual thread view', async () => {
      // First get a discussion slug
      const discussions = await caller.forum.getDiscussionsByCategory({
        categoryId: 0,
        limit: 1,
      });
      if (discussions.length > 0) {
        const discussion = await caller.forum.getDiscussionBySlug({
          slug: discussions[0].slug,
        });
        expect(discussion).toBeDefined();
        if (discussion) {
          expect(discussion).toHaveProperty('viewCount');
          expect(typeof discussion.viewCount).toBe('number');
        }
      }
    });
  });
});
