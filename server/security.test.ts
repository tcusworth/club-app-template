import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserById: vi.fn(),
    getSavedArchitecture: vi.fn(),
    updateSavedArchitecture: vi.fn(),
    getMigrationPlan: vi.fn(),
    updateMigrationPlan: vi.fn(),
    getRfpDocument: vi.fn(),
    getAiChat: vi.fn(),
    getBlogPostById: vi.fn(),
    getBlogPostBySlug: vi.fn(),
    listBlogPosts: vi.fn(),
    updateBlogPost: vi.fn(),
    deleteBlogPost: vi.fn(),
    createBlogPost: vi.fn(),
    markNotificationAsRead: vi.fn(),
    addPoints: vi.fn(),
    getQuizByLesson: vi.fn(),
    getQuizByCourse: vi.fn(),
    listAllUsers: vi.fn(),
  };
});

import { appRouter } from "./routers";
import * as db from "./db";
import { toPublicUser, SECRET_USER_FIELDS } from "./publicUser";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 2,
    openId: "user-a",
    email: "a@example.com",
    name: "User A",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: "$2b$12$not-a-real-hash",
    resetToken: "reset-token-secret",
    resetTokenExpiresAt: new Date(),
    ...overrides,
  } as AuthenticatedUser;
}

function createCtx(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("user payloads never include secrets", () => {
  it("toPublicUser strips passwordHash, resetToken, and resetTokenExpiresAt", () => {
    const user = createUser() as User;
    const publicUser = toPublicUser(user);
    expect(publicUser).not.toBeNull();
    for (const field of SECRET_USER_FIELDS) {
      expect(publicUser).not.toHaveProperty(field);
    }
    expect(publicUser?.id).toBe(2);
    expect(publicUser?.email).toBe("a@example.com");
  });

  it("auth.me omits credential fields from the session user", async () => {
    const caller = appRouter.createCaller(createCtx(createUser()));
    const me = await caller.auth.me();
    expect(me).toBeTruthy();
    expect(me).not.toHaveProperty("passwordHash");
    expect(me).not.toHaveProperty("resetToken");
    expect(me).not.toHaveProperty("resetTokenExpiresAt");
    expect(me?.id).toBe(2);
  });

  it("user.getById omits credential fields", async () => {
    vi.mocked(db.getUserById).mockResolvedValue(createUser({ id: 7 }) as any);
    const caller = appRouter.createCaller(createCtx(null));
    const user = await caller.user.getById({ id: 7 });
    expect(user).toBeTruthy();
    expect(user).not.toHaveProperty("passwordHash");
    expect(user).not.toHaveProperty("resetToken");
    expect(user).not.toHaveProperty("resetTokenExpiresAt");
  });
});

describe("private object authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("member A cannot read B's saved architecture", async () => {
    vi.mocked(db.getSavedArchitecture).mockResolvedValue({ id: 5, userId: 99, name: "B arch" } as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(caller.architecture.saved.getById({ id: 5 })).rejects.toThrow(/authorized|FORBIDDEN/i);
  });

  it("member A cannot update B's architecture", async () => {
    vi.mocked(db.getSavedArchitecture).mockResolvedValue({ id: 5, userId: 99, name: "B arch" } as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(caller.architecture.saved.update({ id: 5, name: "stolen" })).rejects.toThrow(/authorized|FORBIDDEN/i);
    expect(db.updateSavedArchitecture).not.toHaveBeenCalled();
  });

  it("member A cannot read B's migration plan", async () => {
    vi.mocked(db.getMigrationPlan).mockResolvedValue({ id: 3, userId: 99, name: "B plan" } as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(caller.migration.getById({ id: 3 })).rejects.toThrow(/authorized|FORBIDDEN/i);
  });

  it("member A cannot read B's RFP document", async () => {
    vi.mocked(db.getRfpDocument).mockResolvedValue({ id: 4, userId: 99, name: "B rfp" } as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(caller.rfp.getById({ id: 4 })).rejects.toThrow(/authorized|FORBIDDEN/i);
  });

  it("member A cannot read B's AI chat", async () => {
    vi.mocked(db.getAiChat).mockResolvedValue({ id: 8, userId: 99, messages: [] } as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(caller.ai.getChat({ id: 8 })).rejects.toThrow(/authorized|FORBIDDEN/i);
  });

  it("member A cannot update or delete B's blog post", async () => {
    vi.mocked(db.getBlogPostById).mockResolvedValue({ id: 12, authorId: 99, status: "draft", title: "B post" } as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(caller.blog.updatePost({ id: 12, title: "hijack" })).rejects.toThrow(/authorized|FORBIDDEN/i);
    await expect(caller.blog.deletePost({ id: 12 })).rejects.toThrow(/authorized|FORBIDDEN/i);
    expect(db.updateBlogPost).not.toHaveBeenCalled();
    expect(db.deleteBlogPost).not.toHaveBeenCalled();
  });

  it("notification mark-read is scoped to the caller", async () => {
    vi.mocked(db.markNotificationAsRead).mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await caller.notifications.markRead({ id: 44 });
    expect(db.markNotificationAsRead).toHaveBeenCalledWith(44, 2);
  });
});

describe("gamification, quizzes, and uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("members cannot call addPoints", async () => {
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2, role: "user" })));
    await expect(
      (caller.gamification as any).addPoints({ points: 10000, reason: "self deal" })
    ).rejects.toThrow();
    expect(db.addPoints).not.toHaveBeenCalled();
  });

  it("player quiz payloads omit correctIndex even for admins", async () => {
    vi.mocked(db.getQuizByLesson).mockResolvedValue({
      id: 1,
      title: "Quiz",
      passingScore: 70,
      questions: [
        { id: 1, question: "Q1", options: ["a", "b"], correctIndex: 1, explanation: "because" },
      ],
    } as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 1, role: "admin", openId: "admin" })));
    const quiz = await caller.quiz.getByLesson({ lessonId: 9 });
    expect(quiz!.questions[0]).not.toHaveProperty("correctIndex");
  });

  it("player quiz payloads omit correctIndex", async () => {
    vi.mocked(db.getQuizByLesson).mockResolvedValue({
      id: 1,
      title: "Quiz",
      passingScore: 70,
      questions: [
        { id: 1, question: "Q1", options: ["a", "b"], correctIndex: 1, explanation: "because" },
      ],
    } as any);
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2, role: "user" })));
    const quiz = await caller.quiz.getByLesson({ lessonId: 9 });
    expect(quiz).toBeTruthy();
    expect(quiz!.questions[0]).not.toHaveProperty("correctIndex");
    expect(quiz!.questions[0]).not.toHaveProperty("explanation");
    expect(quiz!.questions[0].question).toBe("Q1");
  });

  it("rejects disallowed upload types without storing", async () => {
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    await expect(
      caller.upload.file({
        fileName: "payload.html",
        mimeType: "text/html",
        base64Data: Buffer.from("<script>alert(1)</script>").toString("base64"),
      })
    ).rejects.toThrow(/not allowed/i);
  });

  it("rejects oversized uploads", async () => {
    const caller = appRouter.createCaller(createCtx(createUser({ id: 2 })));
    const big = Buffer.alloc(11 * 1024 * 1024, 1).toString("base64");
    await expect(
      caller.upload.file({
        fileName: "photo.png",
        mimeType: "image/png",
        base64Data: big,
      })
    ).rejects.toThrow(/limit/i);
  });
});
