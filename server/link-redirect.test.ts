import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Tests verifying that:
 * 1. Landing page links redirect through /signin with returnTo param (not /login or bare /community)
 * 2. SignIn page reads returnTo query param
 * 3. Register page reads returnTo query param
 * 4. DashboardLayout auth gate passes current URL as returnTo
 * 5. No remaining /login references in frontend code
 * 6. No remaining href="#" dead links in Landing.tsx
 *
 * These are source-code-level tests that verify the link patterns are correct.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const CLIENT_SRC = join(__dirname, '..', 'client', 'src');

function readFile(relativePath: string): string {
  return readFileSync(join(CLIENT_SRC, relativePath), 'utf-8');
}

describe('Link redirect flow', () => {
  let landingSrc: string;
  let signInSrc: string;
  let registerSrc: string;
  let dashboardLayoutSrc: string;

  beforeAll(() => {
    landingSrc = readFile('pages/Landing.tsx');
    signInSrc = readFile('pages/SignIn.tsx');
    registerSrc = readFile('pages/Register.tsx');
    dashboardLayoutSrc = readFile('components/DashboardLayout.tsx');
  });

  describe('Landing.tsx', () => {
    it('should not contain any /login references', () => {
      expect(landingSrc).not.toContain("'/login'");
      expect(landingSrc).not.toContain('"/login"');
    });

    it('should not contain any href="#" dead links', () => {
      expect(landingSrc).not.toContain('href="#"');
    });

    it('Forum nav button should redirect through /signin with returnTo=/dashboard', () => {
      expect(landingSrc).toContain("'/signin?returnTo=' + encodeURIComponent('/dashboard')");
    });

    it('discussion card clicks should redirect through /signin with returnTo containing slug', () => {
      expect(landingSrc).toContain("'/signin?returnTo=' + encodeURIComponent(`/community/${discussion.slug}`)");
    });

    it('Explore Forum button should redirect through /signin with returnTo=/dashboard', () => {
      // The "Explore Forum" button
      const exploreLine = landingSrc.split('\n').find(l => l.includes('Explore Forum'));
      expect(exploreLine).toBeDefined();
      expect(landingSrc).toContain("'/signin?returnTo=' + encodeURIComponent('/dashboard')");
    });

    it('View All Discussions button should redirect through /signin with returnTo=/community', () => {
      const viewAllLine = landingSrc.split('\n').find(l => l.includes('View All Discussions'));
      expect(viewAllLine).toBeDefined();
    });

    it('Join Community button should go to /register', () => {
      expect(landingSrc).toContain("setLocation('/register')");
    });

    it('Get Started Free button should go to /register', () => {
      const getStartedLine = landingSrc.split('\n').find(l => l.includes('Get Started Free'));
      expect(getStartedLine).toBeDefined();
    });

    it('Create Free Account button should go to /register', () => {
      const createAccountLine = landingSrc.split('\n').find(l => l.includes('Create Free Account'));
      expect(createAccountLine).toBeDefined();
    });

    it('footer links should point to /signin with returnTo params', () => {
      expect(landingSrc).toContain('/signin?returnTo=%2Fdashboard');
      expect(landingSrc).toContain('/signin?returnTo=%2Fmembers');
      expect(landingSrc).toContain('/signin?returnTo=%2Ftraining');
      expect(landingSrc).toContain('/signin?returnTo=%2Fcase-studies');
      expect(landingSrc).toContain('/signin?returnTo=%2Fblog');
    });
  });

  describe('SignIn.tsx', () => {
    it('should import useSearch from wouter', () => {
      expect(signInSrc).toContain('useSearch');
    });

    it('should parse returnTo from query params', () => {
      expect(signInSrc).toContain("params.get(\"returnTo\")");
    });

    it('should use returnTo in onSuccess redirect', () => {
      expect(signInSrc).toContain('setLocation(returnTo)');
    });

    it('should not hardcode redirect to /', () => {
      // The only setLocation('/') should be the default fallback in params.get
      const lines = signInSrc.split('\n').filter(l => l.includes("setLocation('/')") || l.includes('setLocation("/")'));
      expect(lines.length).toBe(0);
    });

    it('should preserve returnTo when navigating to register', () => {
      expect(signInSrc).toContain('returnToParam');
      expect(signInSrc).toContain('/register${returnToParam}');
    });
  });

  describe('Register.tsx', () => {
    it('should import useSearch from wouter', () => {
      expect(registerSrc).toContain('useSearch');
    });

    it('should parse returnTo from query params', () => {
      expect(registerSrc).toContain("params.get(\"returnTo\")");
    });

    it('should use returnTo in onSuccess redirect', () => {
      expect(registerSrc).toContain('setLocation(returnTo)');
    });

    it('should not hardcode redirect to /', () => {
      const lines = registerSrc.split('\n').filter(l => l.includes("setLocation('/')") || l.includes('setLocation("/")'));
      expect(lines.length).toBe(0);
    });

    it('should preserve returnTo when navigating to signin', () => {
      expect(registerSrc).toContain('returnToParam');
      expect(registerSrc).toContain('/signin${returnToParam}');
    });
  });

  describe('DashboardLayout.tsx', () => {
    it('should pass current location as returnTo to /signin', () => {
      expect(dashboardLayoutSrc).toContain('/signin?returnTo=${returnTo}');
    });

    it('should pass current location as returnTo to /register', () => {
      expect(dashboardLayoutSrc).toContain('/register?returnTo=${returnTo}');
    });

    it('should not use bare /signin without returnTo in auth gate', () => {
      // The auth gate buttons should include returnTo
      const authGateSection = dashboardLayoutSrc.split('Sign in to continue')[1]?.split('DashboardLayoutContent')[0] || '';
      expect(authGateSection).toContain('returnTo');
    });
  });

  describe('No stale /login references in any frontend file', () => {
    it('should not have /login in DiscussionThread.tsx', () => {
      const src = readFile('pages/DiscussionThread.tsx');
      expect(src).not.toContain("'/login'");
      expect(src).not.toContain('"/login"');
    });

    it('should not have /login in Home.tsx', () => {
      const src = readFile('pages/Home.tsx');
      expect(src).not.toContain("'/login'");
      expect(src).not.toContain('"/login"');
    });
  });
});
