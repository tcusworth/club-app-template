import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-key-for-magic-link-tests";
});

vi.mock("./db", () => ({
  getMagicLinkToken: vi.fn(),
  markMagicLinkUsed: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  createMagicLinkToken: vi.fn(),
}));

vi.mock("./email", () => ({
  sendMagicLinkEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  sendConsultingInquiryEmails: vi.fn().mockResolvedValue({ memberSent: true, adminSent: true }),
}));

import { appRouter } from "./routers";
import * as db from "./db";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createCtx(): { ctx: TrpcContext; cookies: CookieCall[] } {
  const cookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx, cookies };
}

describe("auth.verifyMagicLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues a session and returns the user on a valid unexpired unused token", async () => {
    const token = "a".repeat(64);
    vi.mocked(db.getMagicLinkToken).mockResolvedValueOnce({
      id: 42,
      token,
      userId: 7,
      email: "person@example.com",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    } as any);
    vi.mocked(db.getUserById).mockResolvedValueOnce({
      id: 7,
      openId: "local_abc",
      email: "person@example.com",
      name: "Person",
    } as any);

    const { ctx, cookies } = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.verifyMagicLink({ token });

    expect(result.success).toBe(true);
    expect(result.user.id).toBe(7);
    expect(db.markMagicLinkUsed).toHaveBeenCalledWith(42);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBeDefined();
  });

  it("rejects an already-used token", async () => {
    const token = "b".repeat(64);
    vi.mocked(db.getMagicLinkToken).mockResolvedValueOnce({
      id: 1,
      token,
      userId: 7,
      email: "person@example.com",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    } as any);

    const { ctx } = createCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.verifyMagicLink({ token })).rejects.toThrow(/already been used/);
    expect(db.markMagicLinkUsed).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    const token = "c".repeat(64);
    vi.mocked(db.getMagicLinkToken).mockResolvedValueOnce({
      id: 2,
      token,
      userId: 7,
      email: "person@example.com",
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null,
    } as any);

    const { ctx } = createCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.verifyMagicLink({ token })).rejects.toThrow(/expired/);
  });
});
