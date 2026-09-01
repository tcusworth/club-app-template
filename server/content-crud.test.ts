import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getContentNodeById: vi.fn(),
    getContentNodeBySlug: vi.fn(),
    listContentNodes: vi.fn(),
    updateContentNode: vi.fn(),
    deleteContentNode: vi.fn(),
    createContentNode: vi.fn(),
    adjustReputation: vi.fn(),
    submitContentForReview: vi.fn(),
  };
});

import { appRouter } from "./routers";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as AuthenticatedUser;
}

function createCtx(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

const ownerNode = {
  id: 10,
  title: "Owner draft",
  slug: "owner-draft",
  type: "article" as const,
  body: "<p>secret</p>",
  authorId: 2,
  status: "draft" as const,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const otherNode = {
  ...ownerNode,
  id: 11,
  title: "B's private article",
  slug: "b-private",
  authorId: 99,
  status: "draft" as const,
};

describe("content.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects delete from a member who does not own the content", async () => {
    vi.mocked(db.getContentNodeById).mockResolvedValue(otherNode as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(caller.content.delete({ id: 11 })).rejects.toThrow(/authorized|FORBIDDEN/i);
    expect(db.deleteContentNode).not.toHaveBeenCalled();
  });

  it("rejects delete for non-existent content", async () => {
    vi.mocked(db.getContentNodeById).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 1, role: "admin", openId: "admin-user" })));
    await expect(caller.content.delete({ id: 999999 })).rejects.toThrow();
    expect(db.deleteContentNode).not.toHaveBeenCalled();
  });

  it("allows the owner to delete their own content", async () => {
    vi.mocked(db.getContentNodeById).mockResolvedValue(ownerNode as any);
    vi.mocked(db.deleteContentNode).mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    const result = await caller.content.delete({ id: 10 });
    expect(result).toEqual({ success: true });
    expect(db.deleteContentNode).toHaveBeenCalledWith(10);
  });
});

describe("content.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects update from unauthenticated users", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.content.update({ id: 999, title: "Updated Title" })
    ).rejects.toThrow();
  });

  it("member A cannot update member B's private content", async () => {
    vi.mocked(db.getContentNodeById).mockResolvedValue(otherNode as any);
    const callerA = appRouter.createCaller(createCtx(createUser({ id: 2, openId: "user-a" })));
    await expect(
      callerA.content.update({ id: 11, title: "Hijacked" })
    ).rejects.toThrow(/authorized|FORBIDDEN/i);
    expect(db.updateContentNode).not.toHaveBeenCalled();
  });

  it("member A cannot read member B's draft", async () => {
    vi.mocked(db.getContentNodeById).mockResolvedValue(otherNode as any);
    const callerA = appRouter.createCaller(createCtx(createUser({ id: 2, openId: "user-a" })));
    await expect(callerA.content.getById({ id: 11 })).rejects.toThrow();
  });

  it("allows the owner to update their own content", async () => {
    vi.mocked(db.getContentNodeById).mockResolvedValue(ownerNode as any);
    vi.mocked(db.updateContentNode).mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    const result = await caller.content.update({ id: 10, title: "Updated Title" });
    expect(result).toEqual({ success: true });
    expect(db.updateContentNode).toHaveBeenCalled();
  });

  it("rejects a member setting status published", async () => {
    vi.mocked(db.getContentNodeById).mockResolvedValue(ownerNode as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(
      caller.content.update({ id: 10, status: "published" })
    ).rejects.toThrow(/admin/i);
    expect(db.updateContentNode).not.toHaveBeenCalled();
  });
});

describe("content.list and create publication rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.listContentNodes).mockResolvedValue([]);
    vi.mocked(db.createContentNode).mockResolvedValue(1 as any);
    vi.mocked(db.adjustReputation).mockResolvedValue(undefined as any);
  });

  it("public content lists request published status only, even if a member asks for drafts", async () => {
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await caller.content.list({ status: "draft" });
    expect(db.listContentNodes).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" })
    );
  });

  it("unauthenticated list also defaults to published", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await caller.content.list();
    expect(db.listContentNodes).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" })
    );
  });

  it("sanitizes script tags out of member HTML on create", async () => {
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await caller.content.create({
      title: "XSS",
      slug: "xss-post",
      type: "article",
      body: `<p>ok</p><script>alert(1)</script>`,
    });
    const payload = vi.mocked(db.createContentNode).mock.calls[0][0];
    expect(payload.body).toContain("ok");
    expect(payload.body).not.toMatch(/script/i);
  });

  it("coerces member creates to draft even if they send published", async () => {
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await caller.content.create({
      title: "Sneaky",
      slug: "sneaky",
      type: "article",
      status: "published",
    });
    expect(db.createContentNode).toHaveBeenCalledWith(
      expect.objectContaining({ status: "draft", authorId: 2 })
    );
  });
});
