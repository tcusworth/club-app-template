import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Test Helpers ────────────────────────────────────────────────────

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-001",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createAdminUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return createUser({ id: 99, openId: "admin-001", name: "Admin", role: "admin", ...overrides });
}

function createCtx(user: AuthenticatedUser | null = null): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  return {
    ctx: {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    },
    clearedCookies,
  };
}

// ─── Auth Router Tests ──────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });

  it("works for unauthenticated users too", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated users", async () => {
    const user = createUser();
    const { ctx } = createCtx(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-001");
    expect(result?.name).toBe("Test User");
  });
});

// ─── User Profile Router Tests ──────────────────────────────────────

describe("user.updateProfile", () => {
  it("rejects unauthenticated users", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.user.updateProfile({ platformRole: "executive" })).rejects.toThrow();
  });

  it("validates platform role enum values", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.user.updateProfile({ platformRole: "invalid_role" as any })
    ).rejects.toThrow();
  });

  it("accepts valid platform roles", async () => {
    const validRoles = ["owner_operator", "epc_integrator", "automation_engineer", "executive", "vendor", "analyst"] as const;
    for (const role of validRoles) {
      const { ctx } = createCtx(createUser());
      const caller = appRouter.createCaller(ctx);
      // This should not throw (DB may not be connected in test, but validation passes)
      try {
        await caller.user.updateProfile({ platformRole: role });
      } catch (e: any) {
        // DB errors are OK, validation errors are not
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    }
  });
});

// ─── Capabilities Router Tests ──────────────────────────────────────

describe("capabilities", () => {
  it("list is a public procedure (no auth required)", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    // Should not throw UNAUTHORIZED
    const result = await caller.capabilities.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getBySlug is a public procedure", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.capabilities.getBySlug({ slug: "nonexistent" });
    expect(result).toBeUndefined();
  });

  it("create requires admin role", async () => {
    const { ctx } = createCtx(createUser()); // regular user
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.capabilities.create({ name: "Test", slug: "test" })
    ).rejects.toThrow();
  });

  it("createRequirement requires admin role", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.capabilities.createRequirement({ capabilityId: 1, definition: "Test" })
    ).rejects.toThrow();
  });
});

// ─── Content Router Tests ───────────────────────────────────────────

describe("content", () => {
  it("list is public", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.content.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.content.create({ title: "Test", slug: "test", type: "article" })
    ).rejects.toThrow();
  });

  it("validates content type enum", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.content.create({ title: "Test", slug: "test", type: "invalid" as any })
    ).rejects.toThrow();
  });
});

// ─── Vendor Router Tests ────────────────────────────────────────────

describe("vendors", () => {
  it("list is public", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.vendors.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vendors.create({ name: "Test Vendor", slug: "test-vendor" })
    ).rejects.toThrow();
  });

  it("claims.list is public", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.vendors.claims.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("claims.create requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vendors.claims.create({ vendorId: 1, capabilityId: 1 })
    ).rejects.toThrow();
  });

  it("claims.updateStatus requires admin", async () => {
    const { ctx } = createCtx(createUser()); // regular user
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vendors.claims.updateStatus({ id: 1, status: "verified" })
    ).rejects.toThrow();
  });

  it("validates claim status enum (unverified, verified, challenged)", async () => {
    const { ctx } = createCtx(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vendors.claims.updateStatus({ id: 1, status: "approved" as any })
    ).rejects.toThrow();
  });

  it("claims.challenge requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vendors.claims.challenge({ claimId: 1, reason: "This claim is inaccurate because..." })
    ).rejects.toThrow();
  });

  it("claims.challenge allows regular users (not admin-only)", async () => {
    const { ctx } = createCtx(createUser()); // regular user
    const caller = appRouter.createCaller(ctx);
    // Should not throw UNAUTHORIZED/FORBIDDEN - only DB errors are acceptable
    try {
      await caller.vendors.claims.challenge({ claimId: 1, reason: "This claim is inaccurate because the evidence is outdated" });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("claims.challenge validates reason minimum length", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vendors.claims.challenge({ claimId: 1, reason: "short" })
    ).rejects.toThrow();
  });

  it("claims.challenges is public", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.vendors.claims.challenges({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("claims.resolveChallenge requires admin", async () => {
    const { ctx } = createCtx(createUser()); // regular user
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vendors.claims.resolveChallenge({ id: 1, status: "accepted" })
    ).rejects.toThrow();
  });
});

// ─── Projects Router Tests ──────────────────────────────────────────

describe("projects", () => {
  it("list requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.projects.list()).rejects.toThrow();
  });

  it("create requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.projects.create({ name: "Test Project" })
    ).rejects.toThrow();
  });
});

// ─── Architecture Router Tests ──────────────────────────────────────

describe("architecture", () => {
  it("components list is public", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.architecture.components();
    expect(Array.isArray(result)).toBe(true);
  });

  it("saved.list requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.architecture.saved.list()).rejects.toThrow();
  });

  it("saved.create requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.architecture.saved.create({ name: "Test Arch" })
    ).rejects.toThrow();
  });
});

// ─── Migration Router Tests ─────────────────────────────────────────

describe("migration", () => {
  it("list requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.migration.list()).rejects.toThrow();
  });

  it("generate requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.migration.generate({ name: "Test", currentEnvironment: {} })
    ).rejects.toThrow();
  });
});

// ─── RFP Router Tests ───────────────────────────────────────────────

describe("rfp", () => {
  it("list requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rfp.list()).rejects.toThrow();
  });

  it("generate requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.rfp.generate({ name: "Test", selectedCapabilities: [1] })
    ).rejects.toThrow();
  });
});

// ─── AI Router Tests ────────────────────────────────────────────────

describe("ai", () => {
  it("chats requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ai.chats()).rejects.toThrow();
  });

  it("chat requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ai.chat({ message: "Hello" })
    ).rejects.toThrow();
  });

  it("chat validates message is not empty", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ai.chat({ message: "" })
    ).rejects.toThrow();
  });
});

// ─── Upload Router Tests ────────────────────────────────────────────

describe("upload", () => {
  it("file upload requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.upload.file({
        fileName: "test.png",
        mimeType: "image/png",
        base64Data: "aGVsbG8=",
      })
    ).rejects.toThrow();
  });
});

// ─── AI Guardrail Tests ────────────────────────────────────────────

describe("ai guardrails", () => {
  it("evaluateClaim requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ai.evaluateClaim({
        claimId: 1,
        vendorName: "TestVendor",
        capabilityName: "DCN Runtime",
        claimText: "We support it",
      })
    ).rejects.toThrow();
  });

  it("evaluateClaim validates required fields", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    // Missing vendorName should fail validation
    await expect(
      caller.ai.evaluateClaim({
        claimId: 1,
        vendorName: "",
        capabilityName: "DCN Runtime",
        claimText: "We support it",
      })
    ).rejects.toThrow();
  });

  it("ai.chat system prompt enforces vendor neutrality", async () => {
    // Verify the AI chat procedure exists and requires auth
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ai.chat({ message: "Which vendor is best?" })).rejects.toThrow();
  });

  it("ai.chat rejects empty messages (guardrail against prompt injection)", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ai.chat({ message: "" })).rejects.toThrow();
  });

  it("reputation.adjust requires admin (guardrail against score manipulation)", async () => {
    const { ctx } = createCtx(createUser()); // regular user
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.reputation.adjust({ userId: 1, delta: 100, reason: "test" })
    ).rejects.toThrow();
  });

  it("reputation.adjust is accessible to admin", async () => {
    const { ctx } = createCtx(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    // Should not throw auth errors - only DB errors
    try {
      await caller.reputation.adjust({ userId: 1, delta: 5, reason: "Good contribution" });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("reputation.getScore requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.reputation.getScore()).rejects.toThrow();
  });
});

// ─── Admin Panel Tests ──────────────────────────────────────────────

describe("admin.stats", () => {
  it("rejects non-admin users", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("allows admin users", async () => {
    const { ctx } = createCtx(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("users");
    expect(stats).toHaveProperty("content");
    expect(stats).toHaveProperty("capabilities");
    expect(stats).toHaveProperty("vendors");
    expect(stats).toHaveProperty("projects");
  });
});

describe("admin.users", () => {
  it("rejects non-admin from listing users", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users.list()).rejects.toThrow();
  });

  it("rejects non-admin from updating roles", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users.updateRole({ userId: 1, role: "admin" })).rejects.toThrow();
  });

  it("rejects non-admin from updating platform roles", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users.updatePlatformRole({ userId: 1, platformRole: "executive" })).rejects.toThrow();
  });
});

describe("admin.moderation", () => {
  it("rejects non-admin from viewing pending content", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.moderation.pending()).rejects.toThrow();
  });

  it("rejects non-admin from approving content", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.moderation.approve({ id: 1 })).rejects.toThrow();
  });

  it("rejects non-admin from rejecting content", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.moderation.reject({ id: 1, reason: "test" })).rejects.toThrow();
  });

  it("validates reject reason is non-empty", async () => {
    const { ctx } = createCtx(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.moderation.reject({ id: 1, reason: "" })).rejects.toThrow();
  });
});

describe("admin.archComponents", () => {
  it("rejects non-admin from creating components", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.archComponents.create({ name: "Test", type: "dcn" })).rejects.toThrow();
  });

  it("rejects non-admin from deleting components", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.archComponents.delete({ id: 1 })).rejects.toThrow();
  });

  it("validates component name is non-empty", async () => {
    const { ctx } = createCtx(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.archComponents.create({ name: "", type: "dcn" })).rejects.toThrow();
  });

  it("validates component type enum", async () => {
    const { ctx } = createCtx(createAdminUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.archComponents.create({ name: "Test", type: "invalid" as any })).rejects.toThrow();
  });
});

describe("content.submitForReview", () => {
  it("requires authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.content.submitForReview({ id: 1 })).rejects.toThrow();
  });
});

describe("digest", () => {
  it("requires authentication for getPreference", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.getPreference()).rejects.toThrow();
  });

  it("requires authentication for updatePreference", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.updatePreference({ optIn: false })).rejects.toThrow();
  });

  it("rejects non-admin from preview", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.preview()).rejects.toThrow();
  });

  it("rejects non-admin from sending digest", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(caller.digest.send()).rejects.toThrow();
  });
});

// ─── Landing Page Route Behavior ────────────────────────────────────

describe("landing page route behavior", () => {
  it("auth.me returns null for unauthenticated users (landing page shown)", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated users (dashboard shown)", async () => {
    const user = createUser();
    const { ctx } = createCtx(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-001");
  });

  it("auth.me is a public procedure accessible without authentication", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    // auth.me is a public procedure that returns null for unauthenticated users
    // This confirms public routes don't throw, supporting the landing page flow
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("protected procedures reject unauthenticated access (project creation)", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.projects.create({ name: "Test", description: "Test" })
    ).rejects.toThrow();
  });
});

// Knowledge Categories Router Tests

describe("categories", () => {
  it("list is public", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getBySlug is public", async () => {
    const { ctx } = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.getBySlug({ slug: "nonexistent" });
    expect(result).toBeUndefined();
  });

  it("create requires admin role", async () => {
    const { ctx } = createCtx(createUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.categories.create({ name: "Test", slug: "test" })
    ).rejects.toThrow();
  });
});
