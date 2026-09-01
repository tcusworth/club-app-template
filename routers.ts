import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import * as stream from "./stream";
import { nanoid } from "nanoid";
import * as db from "./db";
import * as workflows from "./workflows";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";
import crypto from "crypto";
import { sendPasswordResetEmail, sendConsultingInquiryEmails, sendMagicLinkEmail } from "./email";
import { marked } from "marked";
import { SlidingWindowRateLimiter } from "./rateLimit";
import { toPublicUser } from "./publicUser";
import { sanitizeUserHtml, sanitizeOptionalHtml } from "./sanitizeHtml";
import {
  assertOwnerOrAdmin,
  canViewUnpublished,
  isAdmin,
  resolveBlogCreateStatus,
  resolveBlogUpdateStatus,
  resolveContentCreateStatus,
  resolveContentUpdateStatus,
  toPlayerQuiz,
} from "./authz";
import { assertUploadSize, resolveUploadMeta } from "./uploadPolicy";

const magicLinkLimiter = new SlidingWindowRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => toPublicUser(opts.ctx.user)),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    register: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(128),
        email: z.string().email(),
        password: z.string().min(8).max(128),
        platformRole: z.enum(["owner_operator", "epc_integrator", "automation_engineer", "executive", "vendor", "analyst"]).optional(),
        organization: z.string().max(256).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if email already exists
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `local_${crypto.randomUUID()}`;
        await db.createLocalUser({
          openId,
          name: input.name,
          email: input.email,
          passwordHash,
          platformRole: input.platformRole,
          organization: input.organization,
        });
        const user = await db.getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account." });
        // Fire welcome workflow (non-blocking)
        workflows.triggerNewMemberWelcome(user.id, input.name).catch(console.error);
        // Issue session cookie
        const token = await sdk.signSession({ openId, name: input.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: toPublicUser(user) };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
        const token = await sdk.signSession({ openId: user.openId, name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: toPublicUser(user) };
      }),

    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().optional() }))
      .mutation(async ({ input }) => {
        console.log('[forgotPassword] Request received for:', input.email, 'origin:', input.origin);
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          console.log('[forgotPassword] No user found for email:', input.email);
          return { success: true };
        }
        console.log('[forgotPassword] User found:', user.id, user.name, user.email);
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        await db.setPasswordResetToken(user.id, resetToken, expiresAt);
        console.log('[forgotPassword] Reset token saved, sending email...');
        const resetUrl = `${input.origin || ''}/reset-password?token=${resetToken}`;
        console.log('[forgotPassword] Reset URL:', resetUrl);
        try {
          const sent = await sendPasswordResetEmail(user.email!, user.name || 'Member', resetUrl);
          console.log('[forgotPassword] Email send result:', sent);
        } catch (err) {
          console.error('[forgotPassword] Email send error:', err);
        }
        return { success: true };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        password: z.string().min(8).max(128),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByResetToken(input.token);
        if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link. Please request a new one." });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        await db.updatePasswordHash(user.id, passwordHash);
        return { success: true };
      }),

    requestMagicLink: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const email = input.email.toLowerCase().trim();
        // Always return success to prevent email enumeration and rate-limit signaling.
        if (!magicLinkLimiter.check(email)) return { success: true } as const;
        const user = await db.getUserByEmail(email);
        if (!user) return { success: true } as const;
        const token = crypto.randomBytes(32).toString("hex"); // 64 hex chars
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await db.createMagicLinkToken({ token, userId: user.id, email, expiresAt });
        const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
        const magicUrl = `${baseUrl}/auth/magic-link?token=${token}`;
        try {
          await sendMagicLinkEmail(user.email!, user.name ?? "there", magicUrl);
        } catch (err) {
          console.error("[requestMagicLink] email send error:", err);
        }
        return { success: true } as const;
      }),

    verifyMagicLink: publicProcedure
      .input(z.object({ token: z.string().length(64) }))
      .mutation(async ({ ctx, input }) => {
        const record = await db.getMagicLinkToken(input.token);
        if (!record) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This sign-in link is invalid." });
        }
        if (record.usedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This sign-in link has already been used." });
        }
        if (record.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This sign-in link has expired. Request a new one." });
        }
        const user = await db.getUserById(record.userId);
        if (!user) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This sign-in link is invalid." });
        }
        await db.markMagicLinkUsed(record.id);
        const sessionToken = await sdk.signSession({ openId: user.openId, name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: toPublicUser(user) };
      }),
  }),

  // ─── User Profile & Onboarding ─────────────────────────────────────
  user: router({
    updateProfile: protectedProcedure
      .input(z.object({
        platformRole: z.enum(["owner_operator", "epc_integrator", "automation_engineer", "executive", "vendor", "analyst"]).optional(),
        bio: z.string().max(2000).optional(),
        organization: z.string().max(256).optional(),
        credentials: z.array(z.string()).optional(),
        onboarded: z.boolean().optional(),
        linkedInUrl: z.string().url().optional().or(z.literal('')),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.id);
        return toPublicUser(user);
      }),
  }),

  // ─── Capabilities (Knowledge Graph) ────────────────────────────────
  capabilities: router({
    list: publicProcedure.query(async () => {
      return db.listCapabilities();
    }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getCapabilityBySlug(input.slug);
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCapabilityById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        opasLayer: z.string().optional(),
        parentId: z.number().optional(),
        icon: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createCapability(input);
        return { success: true };
      }),
    requirements: publicProcedure
      .input(z.object({ capabilityId: z.number() }))
      .query(async ({ input }) => {
        return db.listRequirementsByCapability(input.capabilityId);
      }),
    createRequirement: adminProcedure
      .input(z.object({
        capabilityId: z.number(),
        definition: z.string().min(1),
        validationCriteria: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createRequirement(input);
        return { success: true };
      }),
  }),

  // ─── Content Nodes ─────────────────────────────────────────────────
  content: router({
    list: publicProcedure
      .input(z.object({
        type: z.enum(["article", "diagram", "case_study", "post", "guide"]).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const status = isAdmin(ctx.user) ? input?.status : "published";
        return db.listContentNodes({ ...input, status: status ?? "published" });
      }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ ctx, input }) => {
        const node = await db.getContentNodeBySlug(input.slug);
        if (!node) return undefined;
        if (!canViewUnpublished(node.authorId, node.status, ctx.user)) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return node;
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const node = await db.getContentNodeById(input.id);
        if (!node) return undefined;
        if (!canViewUnpublished(node.authorId, node.status, ctx.user)) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return node;
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        type: z.enum(["article", "diagram", "case_study", "post", "guide"]),
        body: z.string().optional(),
        summary: z.string().optional(),
        status: z.enum(["draft", "pending_review", "published", "rejected", "archived"]).optional(),
        linkedCapabilities: z.array(z.number()).optional(),
        tags: z.array(z.string()).optional(),
        categoryId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createContentNode({
          ...input,
          body: sanitizeOptionalHtml(input.body),
          status: resolveContentCreateStatus(ctx.user.role, input.status),
          authorId: ctx.user.id,
        });
        // Reward content creation: +5 reputation
        await db.adjustReputation(ctx.user.id, 5);
        return { id };
      }),
    submitForReview: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const node = await db.getContentNodeById(input.id);
        if (!node) throw new TRPCError({ code: "NOT_FOUND" });
        if (node.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.submitContentForReview(input.id);
        // Notify owner about pending review
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({ title: "Content Pending Review", content: `"${node.title}" by user #${ctx.user.id} is awaiting review.` }).catch(() => {});
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        body: z.string().optional(),
        summary: z.string().optional(),
        status: z.enum(["draft", "pending_review", "published", "rejected", "archived"]).optional(),
        linkedCapabilities: z.array(z.number()).optional(),
        tags: z.array(z.string()).optional(),
        categoryId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const node = await db.getContentNodeById(input.id);
        if (!node) throw new TRPCError({ code: "NOT_FOUND" });
        assertOwnerOrAdmin(node.authorId, ctx.user);
        const { id, ...data } = input;
        const status = resolveContentUpdateStatus(ctx.user.role, data.status);
        const update = {
          ...data,
          ...(data.body !== undefined ? { body: sanitizeUserHtml(data.body) } : {}),
          ...(status !== undefined ? { status } : { status: undefined }),
        };
        if (update.status === undefined) delete (update as { status?: unknown }).status;
        await db.updateContentNode(id, update);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const node = await db.getContentNodeById(input.id);
        if (!node) throw new TRPCError({ code: "NOT_FOUND" });
        // Only author or admin can delete
        if (node.authorId !== ctx.user.id && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.deleteContentNode(input.id);
        return { success: true };
      }),
    media: publicProcedure
      .input(z.object({ contentNodeId: z.number() }))
      .query(async ({ ctx, input }) => {
        const node = await db.getContentNodeById(input.contentNodeId);
        if (!node) return [];
        if (!canViewUnpublished(node.authorId, node.status, ctx.user)) return [];
        return db.listMediaByContentNode(input.contentNodeId);
      }),
  }),

  // ─── File Upload ───────────────────────────────────────────────────
  upload: router({
    file: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
        contentNodeId: z.number().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.contentNodeId) {
          const node = await db.getContentNodeById(input.contentNodeId);
          if (!node) throw new TRPCError({ code: "NOT_FOUND" });
          assertOwnerOrAdmin(node.authorId, ctx.user);
        }
        if (input.projectId) {
          const isMember = await db.isProjectMember(input.projectId, ctx.user.id);
          if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { safeName, mimeType } = resolveUploadMeta(input.fileName);
        const buffer = Buffer.from(input.base64Data, "base64");
        assertUploadSize(buffer.length);
        const suffix = nanoid(8);
        const fileKey = `uploads/${ctx.user.id}/${suffix}-${safeName}`;
        const { url } = await storagePut(fileKey, buffer, mimeType);
        const mediaId = await db.createMediaAttachment({
          contentNodeId: input.contentNodeId,
          projectId: input.projectId,
          uploaderId: ctx.user.id,
          fileName: safeName,
          fileKey,
          url,
          mimeType,
          sizeBytes: buffer.length,
        });
        return { id: mediaId, url, fileKey };
      }),
  }),

  // ─── Vendors ───────────────────────────────────────────────────────
  vendors: router({
    list: publicProcedure.query(async () => {
      return db.listVendors();
    }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getVendorBySlug(input.slug);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createVendor({ ...input, submittedById: ctx.user.id });
        return { id };
      }),
    claims: router({
      list: publicProcedure
        .input(z.object({ vendorId: z.number().optional() }).optional())
        .query(async ({ input }) => {
          return db.listVendorClaims(input?.vendorId);
        }),
      create: protectedProcedure
        .input(z.object({
          vendorId: z.number(),
          capabilityId: z.number(),
          claimText: z.string().optional(),
          evidenceLinks: z.array(z.string()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const id = await db.createVendorClaim({ ...input, submittedById: ctx.user.id });
          return { id };
        }),
      updateStatus: adminProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["unverified", "verified", "challenged"]),
          reviewNotes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          await db.updateVendorClaimStatus(input.id, input.status, ctx.user.id, input.reviewNotes);
          return { success: true };
        }),
      // Community challenge — any authenticated user can submit
      challenge: protectedProcedure
        .input(z.object({
          claimId: z.number(),
          reason: z.string().min(10, "Please provide at least 10 characters explaining your challenge"),
        }))
        .mutation(async ({ ctx, input }) => {
          const id = await db.createClaimChallenge({
            claimId: input.claimId,
            challengerId: ctx.user.id,
            reason: input.reason,
          });
          // Reward community challenge: +3 reputation
          await db.adjustReputation(ctx.user.id, 3);
          return { id, success: true };
        }),
      challenges: publicProcedure
        .input(z.object({ claimId: z.number().optional() }).optional())
        .query(async ({ input }) => {
          return db.listClaimChallenges(input?.claimId);
        }),
      resolveChallenge: adminProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["accepted", "rejected"]),
        }))
        .mutation(async ({ input }) => {
          await db.updateChallengeStatus(input.id, input.status);
          return { success: true };
        }),
    }),
  }),

  // ─── Projects ──────────────────────────────────────────────────────
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listUserProjects(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await db.isProjectMember(input.id, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        return db.getProjectById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createProject({ ...input, ownerId: ctx.user.id });
        return { id };
      }),
    members: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await db.isProjectMember(input.projectId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        return db.getProjectMembers(input.projectId);
      }),
    addMember: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        userId: z.number(),
        memberRole: z.enum(["owner", "editor", "viewer"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await db.isProjectMember(input.projectId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        await db.addProjectMember(input.projectId, input.userId, input.memberRole ?? "editor");
        return { success: true };
      }),
    decisions: router({
      list: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ ctx, input }) => {
          const isMember = await db.isProjectMember(input.projectId, ctx.user.id);
          if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
          return db.listDecisionLogs(input.projectId);
        }),
      create: protectedProcedure
        .input(z.object({
          projectId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          decision: z.string().optional(),
          rationale: z.string().optional(),
          linkedCapabilities: z.array(z.number()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const isMember = await db.isProjectMember(input.projectId, ctx.user.id);
          if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
          const id = await db.createDecisionLog({ ...input, authorId: ctx.user.id });
          // Reward decision logging: +2 reputation
          await db.adjustReputation(ctx.user.id, 2);
          return { id };
        }),
    }),
    media: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isMember = await db.isProjectMember(input.projectId, ctx.user.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });
        return db.listMediaByProject(input.projectId);
      }),
  }),

  // ─── Architecture Builder ──────────────────────────────────────────
  architecture: router({
    components: publicProcedure.query(async () => {
      return db.listArchitectureComponents();
    }),
    saved: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.listSavedArchitectures(ctx.user.id);
      }),
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          const arch = await db.getSavedArchitecture(input.id);
          if (!arch) throw new TRPCError({ code: "NOT_FOUND" });
          assertOwnerOrAdmin(arch.userId, ctx.user);
          return arch;
        }),
      create: protectedProcedure
        .input(z.object({
          name: z.string().min(1),
          projectId: z.number().optional(),
          components: z.any().optional(),
          connections: z.any().optional(),
          riskSummary: z.any().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const id = await db.createSavedArchitecture({ ...input, userId: ctx.user.id });
          return { id };
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          components: z.any().optional(),
          connections: z.any().optional(),
          riskSummary: z.any().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const existing = await db.getSavedArchitecture(input.id);
          if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
          assertOwnerOrAdmin(existing.userId, ctx.user);
          const { id, ...data } = input;
          await db.updateSavedArchitecture(id, data);
          return { success: true };
        }),
    }),
  }),

  // ─── Migration Plans ───────────────────────────────────────────────
  migration: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listMigrationPlans(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const plan = await db.getMigrationPlan(input.id);
        if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
        assertOwnerOrAdmin(plan.userId, ctx.user);
        return plan;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        projectId: z.number().optional(),
        currentEnvironment: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createMigrationPlan({ ...input, userId: ctx.user.id });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        currentEnvironment: z.any().optional(),
        phases: z.any().optional(),
        riskProfile: z.any().optional(),
        costImplications: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getMigrationPlan(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        assertOwnerOrAdmin(existing.userId, ctx.user);
        const { id, ...data } = input;
        await db.updateMigrationPlan(id, data);
        return { success: true };
      }),
    generate: protectedProcedure
      .input(z.object({
        name: z.string(),
        currentEnvironment: z.object({
          dcsVendor: z.string().optional(),
          controllerCount: z.number().optional(),
          ioCount: z.number().optional(),
          age: z.number().optional(),
          description: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const prompt = `You are an Open Process Automation (OPA/O-PAS) migration expert. Generate a detailed phased migration plan for transitioning from the following DCS environment to an O-PAS compliant architecture.

Current Environment:
- DCS Vendor: ${input.currentEnvironment.dcsVendor || "Unknown"}
- Controller Count: ${input.currentEnvironment.controllerCount || "Unknown"}
- I/O Count: ${input.currentEnvironment.ioCount || "Unknown"}
- System Age: ${input.currentEnvironment.age || "Unknown"} years
- Description: ${input.currentEnvironment.description || "No additional details"}

Provide a JSON response with:
1. phases: Array of migration phases, each with name, description, duration, tasks[], risks[], and dependencies[]
2. riskProfile: Overall risk assessment with categories (technical, operational, financial) each rated high/medium/low with explanation
3. costImplications: Estimated cost breakdown by category

Be specific to O-PAS standards and reference specific capabilities where relevant.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an OPA/O-PAS migration planning expert. Always respond with valid JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "migration_plan",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  phases: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, duration: { type: "string" }, tasks: { type: "array", items: { type: "string" } }, risks: { type: "array", items: { type: "string" } }, dependencies: { type: "array", items: { type: "string" } } }, required: ["name", "description", "duration", "tasks", "risks", "dependencies"], additionalProperties: false } },
                  riskProfile: { type: "object", properties: { technical: { type: "object", properties: { level: { type: "string" }, explanation: { type: "string" } }, required: ["level", "explanation"], additionalProperties: false }, operational: { type: "object", properties: { level: { type: "string" }, explanation: { type: "string" } }, required: ["level", "explanation"], additionalProperties: false }, financial: { type: "object", properties: { level: { type: "string" }, explanation: { type: "string" } }, required: ["level", "explanation"], additionalProperties: false } }, required: ["technical", "operational", "financial"], additionalProperties: false },
                  costImplications: { type: "object", properties: { hardware: { type: "string" }, software: { type: "string" }, engineering: { type: "string" }, training: { type: "string" }, downtime: { type: "string" }, total: { type: "string" } }, required: ["hardware", "software", "engineering", "training", "downtime", "total"], additionalProperties: false },
                },
                required: ["phases", "riskProfile", "costImplications"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = result.choices[0]?.message?.content;
        const parsed = typeof content === "string" ? JSON.parse(content) : null;

        const planId = await db.createMigrationPlan({
          name: input.name,
          userId: ctx.user.id,
          currentEnvironment: input.currentEnvironment,
          phases: parsed?.phases,
          riskProfile: parsed?.riskProfile,
          costImplications: parsed?.costImplications,
        });

        return { id: planId, plan: parsed };
      }),
  }),

  // ─── RFP Documents ─────────────────────────────────────────────────
  rfp: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listRfpDocuments(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const doc = await db.getRfpDocument(input.id);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
        assertOwnerOrAdmin(doc.userId, ctx.user);
        return doc;
      }),
    generate: protectedProcedure
      .input(z.object({
        name: z.string(),
        selectedCapabilities: z.array(z.number()),
        projectContext: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const caps = await db.listCapabilities();
        const selectedCaps = caps.filter(c => input.selectedCapabilities.includes(c.id));
        const capNames = selectedCaps.map(c => `- ${c.name}: ${c.description || "No description"} (O-PAS Layer: ${c.opasLayer || "General"})`).join("\n");

        const prompt = `You are an Open Process Automation procurement expert. Generate professional RFP (Request for Proposal) language and evaluation criteria for the following O-PAS capabilities:

${capNames}

${input.projectContext ? `Project Context: ${input.projectContext}` : ""}

Generate:
1. A comprehensive RFP document section with scope, requirements, and evaluation methodology
2. Specific evaluation criteria with weighted scoring for each capability
3. Required vendor response format

The language must be vendor-neutral and reference O-PAS standards. Focus on capabilities, not specific vendor products.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an OPA/O-PAS procurement and RFP expert. Generate professional, vendor-neutral procurement language." },
            { role: "user", content: prompt },
          ],
        });

        const generatedContent = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "";

        const docId = await db.createRfpDocument({
          name: input.name,
          userId: ctx.user.id,
          selectedCapabilities: input.selectedCapabilities,
          generatedContent,
        });

        return { id: docId, content: generatedContent };
      }),
  }),

  // ─── AI Assistant ──────────────────────────────────────────────────
  ai: router({
    chats: protectedProcedure.query(async ({ ctx }) => {
      return db.listAiChats(ctx.user.id);
    }),
    getChat: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const chat = await db.getAiChat(input.id);
        if (!chat) throw new TRPCError({ code: "NOT_FOUND" });
        assertOwnerOrAdmin(chat.userId, ctx.user);
        return chat;
      }),
    chat: protectedProcedure
      .input(z.object({
        chatId: z.number().optional(),
        message: z.string().min(1),
        context: z.object({
          capabilities: z.array(z.number()).optional(),
          projectId: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let chatId = input.chatId;
        let existingMessages: Array<{ role: string; content: string; timestamp: number }> = [];

        if (chatId) {
          const chat = await db.getAiChat(chatId);
          if (!chat) throw new TRPCError({ code: "NOT_FOUND" });
          assertOwnerOrAdmin(chat.userId, ctx.user);
          existingMessages = (chat.messages as any) || [];
        }

        const userMsg = { role: "user", content: input.message, timestamp: Date.now() };
        const allMessages = [...existingMessages, userMsg];

        const caps = await db.listCapabilities();
        const capContext = caps.map(c => `${c.name} (${c.opasLayer || "General"}): ${c.description || ""}`).join("\n");

        const systemPrompt = `You are the OPA Community AI Assistant — an expert in Open Process Automation (OPA) and the O-PAS standard (The Open Group Open Process Automation Standard).

Your role:
- Help users understand O-PAS architecture, capabilities, and implementation
- Assist with architecture design decisions
- Generate RFP language and procurement guidance
- Evaluate vendor claims against O-PAS capabilities
- Provide explainable reasoning tied to specific capabilities

Available O-PAS Capabilities in the platform:
${capContext}

CRITICAL RULES:
1. Always reference specific O-PAS capabilities when providing advice
2. Remain strictly vendor-neutral unless the user asks about a specific vendor
3. Show your reasoning by citing which capabilities or requirements your answer maps to
4. Format responses as: "Based on [Capability X], [your recommendation]..."
5. If a question is outside O-PAS scope, acknowledge it and redirect to relevant capabilities`;

        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...allMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];

        const result = await invokeLLM({ messages: llmMessages });
        const assistantContent = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "I apologize, I was unable to generate a response. Please try again.";

        const assistantMsg = { role: "assistant", content: assistantContent, timestamp: Date.now() };
        const updatedMessages = [...allMessages, assistantMsg];

        if (!chatId) {
          const title = input.message.slice(0, 100);
          chatId = await db.createAiChat({
            userId: ctx.user.id,
            title,
            messages: updatedMessages,
            context: input.context,
          });
        } else {
          await db.updateAiChat(chatId, { messages: updatedMessages });
        }

        return { chatId, response: assistantContent };
      }),
    // Dedicated vendor claim evaluation AI tool
    evaluateClaim: protectedProcedure
      .input(z.object({
        claimId: z.number(),
        vendorName: z.string().min(1),
        capabilityName: z.string().min(1),
        claimText: z.string(),
        evidenceLinks: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const caps = await db.listCapabilities();
        const cap = caps.find(c => c.name === input.capabilityName);
        const reqs = cap ? await db.listRequirementsByCapability(cap.id) : [];
        const reqContext = reqs.map(r => `- ${r.definition}${r.validationCriteria ? ` (Validation: ${r.validationCriteria})` : ""}`).join("\n");

        const prompt = `You are an O-PAS vendor claim evaluation expert. Evaluate the following vendor capability claim against the O-PAS standard requirements.

Vendor: ${input.vendorName}
Claimed Capability: ${input.capabilityName}
Claim Description: ${input.claimText}
Evidence Provided: ${input.evidenceLinks?.join(", ") || "None"}

O-PAS Requirements for this capability:
${reqContext || "No specific requirements documented yet."}

Capability Description: ${cap?.description || "Not available"}
O-PAS Layer: ${cap?.opasLayer || "General"}

Provide a structured evaluation with:
1. ASSESSMENT: Overall assessment (Strong/Moderate/Weak/Insufficient)
2. STRENGTHS: What the claim does well
3. GAPS: What is missing or unclear
4. REQUIREMENTS_COVERAGE: Which specific requirements are met vs unmet
5. RECOMMENDATION: Specific recommendation for the claim status (verify/challenge/request more evidence)
6. REASONING: Detailed reasoning tied to specific O-PAS capabilities and requirements

Be thorough, vendor-neutral, and always cite specific capabilities or requirements in your reasoning.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an O-PAS vendor claim evaluation expert. Always provide explainable, evidence-based assessments tied to specific O-PAS capabilities and requirements. Be vendor-neutral." },
            { role: "user", content: prompt },
          ],
        });

        const evaluation = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "Unable to generate evaluation. Please try again.";

        return { evaluation };
      }),
  }),

  // ─── Contribution Scoring ───────────────────────────────────────
  reputation: router({
    getScore: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return { score: user?.reputationScore ?? 0 };
    }),
    adjust: adminProcedure
      .input(z.object({
        userId: z.number(),
        delta: z.number(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await db.adjustReputation(input.userId, input.delta);
        return { success: true };
      }),
  }),

  // ─── Admin Panel ──────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getPlatformStats();
    }),
    blastRecipientCount: adminProcedure.query(async () => {
      const recipients = await db.getBlastRecipients();
      return { count: recipients.length };
    }),
    listBlasts: adminProcedure.query(async () => db.listEmailBlasts(20)),
    sendBlastTest: adminProcedure
      .input(z.object({ subject: z.string().min(1).max(512), bodyMarkdown: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const { sendBlastEmail } = await import("./email");
        if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Your account has no email address on file." });
        const ok = await sendBlastEmail({ to: ctx.user.email, subject: `[TEST] ${input.subject}`, bodyMarkdown: input.bodyMarkdown });
        if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Test email failed to send." });
        return { sentTo: ctx.user.email };
      }),
    sendBlast: adminProcedure
      .input(z.object({ subject: z.string().min(1).max(512), bodyMarkdown: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const { sendBlastEmail } = await import("./email");
        const recipients = await db.getBlastRecipients();
        let sentCount = 0;
        let failedCount = 0;
        for (const r of recipients) {
          const ok = await sendBlastEmail({ to: r.email, subject: input.subject, bodyMarkdown: input.bodyMarkdown })
            .catch(() => false);
          if (ok) sentCount++;
          else failedCount++;
        }
        await db.recordEmailBlast({
          sentBy: ctx.user.id,
          subject: input.subject,
          bodyMarkdown: input.bodyMarkdown,
          recipientCount: recipients.length,
          sentCount,
          failedCount,
        });
        return { recipientCount: recipients.length, sentCount, failedCount };
      }),
    users: router({
      list: adminProcedure
        .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
        .query(async ({ input }) => {
          const rows = await db.listAllUsers(input?.limit ?? 100, input?.offset ?? 0);
          return rows.map(toPublicUser);
        }),
      count: adminProcedure.query(async () => {
        return { count: await db.countUsers() };
      }),
      updateRole: adminProcedure
        .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
        .mutation(async ({ input }) => {
          await db.updateUserRole(input.userId, input.role);
          return { success: true };
        }),
      updatePlatformRole: adminProcedure
        .input(z.object({ userId: z.number(), platformRole: z.enum(["owner_operator", "epc_integrator", "automation_engineer", "executive", "vendor", "analyst"]) }))
        .mutation(async ({ input }) => {
          await db.updateUserPlatformRole(input.userId, input.platformRole);
          return { success: true };
        }),
    }),
    moderation: router({
      pending: adminProcedure.query(async () => {
        return db.listPendingContent();
      }),
      approve: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const node = await db.getContentNodeById(input.id);
          await db.approveContent(input.id);
          // Notify author
          if (node) {
            const { notifyOwner } = await import("./_core/notification");
            await notifyOwner({ title: "Content Approved", content: `"${node.title}" has been approved and published.` }).catch(() => {});
          }
          return { success: true };
        }),
      reject: adminProcedure
        .input(z.object({ id: z.number(), reason: z.string().min(1) }))
        .mutation(async ({ input }) => {
          const node = await db.getContentNodeById(input.id);
          await db.rejectContent(input.id, input.reason);
          if (node) {
            const { notifyOwner } = await import("./_core/notification");
            await notifyOwner({ title: "Content Rejected", content: `"${node.title}" was rejected. Reason: ${input.reason}` }).catch(() => {});
          }
          return { success: true };
        }),
    }),
    capabilities: router({
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          slug: z.string().optional(),
          description: z.string().optional(),
          opasLayer: z.string().optional(),
          parentId: z.number().optional(),
          icon: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          await db.updateCapability(id, data);
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteCapability(input.id);
          return { success: true };
        }),
    }),
    archComponents: router({
      create: adminProcedure
        .input(z.object({
          name: z.string().min(1),
          type: z.enum(["dcn", "runtime", "network", "controller", "gateway", "sensor", "actuator"]),
          description: z.string().optional(),
          opasLayer: z.string().optional(),
          icon: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          await db.createArchitectureComponent(input);
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteArchitectureComponent(input.id);
          return { success: true };
        }),
    }),
    vendors: router({
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          slug: z.string().optional(),
          description: z.string().optional(),
          website: z.string().optional(),
          logoUrl: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          await db.updateVendor(id, data);
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteVendor(input.id);
          return { success: true };
        }),
    }),
  }),

  // ─── Digest Preferences & Weekly Digest ──────────────────────────
  digest: router({
    getPreference: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      return { optIn: user?.digestOptIn ?? true };
    }),
    updatePreference: protectedProcedure
      .input(z.object({ optIn: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDigestPreference(ctx.user.id, input.optIn);
        return { success: true };
      }),
    // Admin: preview community digest content
    preview: adminProcedure.query(async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [recentDiscussions, recentBlogPosts, upcomingEvents, newMembers, stats, subscribers] = await Promise.all([
        db.getRecentDiscussions(oneWeekAgo, 10),
        db.getRecentBlogPosts(oneWeekAgo, 5),
        db.getUpcomingEvents(5),
        db.getNewMembers(oneWeekAgo, 10),
        db.getPlatformStats(),
        db.getDigestSubscribers(),
      ]);
      return {
        discussions: recentDiscussions,
        blogPosts: recentBlogPosts,
        upcomingEvents,
        newMembers,
        stats,
        subscriberCount: subscribers.length,
        period: { from: oneWeekAgo, to: new Date() },
      };
    }),
    // Admin: send weekly digest to all opted-in members
    send: adminProcedure.mutation(async ({ ctx }) => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [recentDiscussions, recentBlogPosts, upcomingEvents, newMembers, stats, subscribers] = await Promise.all([
        db.getRecentDiscussions(oneWeekAgo, 10),
        db.getRecentBlogPosts(oneWeekAgo, 5),
        db.getUpcomingEvents(5),
        db.getNewMembers(oneWeekAgo, 10),
        db.getPlatformStats(),
        db.getDigestSubscribers(),
      ]);
      const discussionsSection = recentDiscussions.length > 0
        ? recentDiscussions.map((d: any) => `- ${d.title} (${d.replyCount} replies)`).join("\n")
        : "No new discussions this week.";
      const blogSection = recentBlogPosts.length > 0
        ? recentBlogPosts.map((p: any) => `- ${p.title} by ${p.authorName ?? "Community Member"}`).join("\n")
        : "No new blog posts this week.";
      const eventsSection = upcomingEvents.length > 0
        ? upcomingEvents.map((e: any) => `- ${e.title} (${new Date(e.startDate).toLocaleDateString()})`).join("\n")
        : "No upcoming events.";
      const membersSection = newMembers.length > 0
        ? newMembers.map((m: any) => `- ${m.name ?? "New Member"}${m.organization ? " (" + m.organization + ")" : ""}`).join("\n")
        : "No new members this week.";
      const digestContent = [
        `Platform Stats: ${stats.users} members | ${stats.content} articles`,
        "",
        "Top Discussions:",
        discussionsSection,
        "",
        "New Blog Posts:",
        blogSection,
        "",
        "Upcoming Events:",
        eventsSection,
        "",
        "New Members:",
        membersSection,
      ].join("\n");
      const contentSummary = JSON.stringify({
        discussions: recentDiscussions.length,
        blogPosts: recentBlogPosts.length,
        events: upcomingEvents.length,
        members: newMembers.length,
      });
      // Send in-app notification to each subscriber
      let sentCount = 0;
      const { notificationsTable } = await import("../drizzle/schema");
      const { getDb } = await import("./db");
      const dbConn = await getDb();
      if (dbConn) {
        for (const sub of subscribers) {
          try {
            await dbConn.insert(notificationsTable).values({
              userId: sub.id,
              type: "digest",
              title: `OPA Community Weekly Digest`,
              content: digestContent,
              link: "/community",
              isRead: false,
            });
            await db.updateLastDigestSent(sub.id);
            sentCount++;
          } catch (e) {
            console.error(`[Digest] Failed to notify user ${(sub as any).id}:`, e);
          }
        }
      }
      // Notify owner with digest summary
      const { notifyOwner } = await import("./_core/notification");
      await notifyOwner({
        title: `Weekly Digest Sent - ${sentCount} members notified`,
        content: `Digest delivered to ${sentCount} opted-in members.\n\n${digestContent}`,
      }).catch(() => {});
      // Log the send
      await db.logDigestSend({
        sentByUserId: ctx.user.id,
        recipientCount: sentCount,
        newDiscussions: recentDiscussions.length,
        newBlogPosts: recentBlogPosts.length,
        upcomingEvents: upcomingEvents.length,
        newMembers: newMembers.length,
        contentSummary,
      });
      return { success: true, subscriberCount: sentCount, digestContent };
    }),
    // Admin: get send history
    history: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => db.getDigestSendHistory(input?.limit ?? 10)),
  }),

  // ─── Knowledge Categories ─────────────────────────────────────────────
  categories: router({
    list: publicProcedure.query(async () => {
      return db.getKnowledgeCategories();
    }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getKnowledgeCategoryBySlug(input.slug);
      }),
    getContentByCategory: publicProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return db.getContentNodesByCategory(input.categoryId);
      }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(256),
        slug: z.string().min(1).max(256),
        description: z.string().optional(),
        icon: z.string().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createKnowledgeCategory(input);
      }),
  }),
  forum: router({
    getCategories: publicProcedure.query(async () => {
      return db.getForumCategories();
    }),
    getStats: publicProcedure.query(async () => {
      return db.getForumStats();
    }),
    createDiscussion: protectedProcedure
      .input(z.object({
        title: z.string().min(3).max(256),
        slug: z.string().min(3).max(256),
        content: z.string().min(10),
        categoryId: z.number(),
        groupId: z.number().optional(),
        postType: z.enum(['question', 'discussion', 'insight', 'announcement', 'case_study']).optional(),
        tags: z.array(z.string()).optional(),
        youtubeUrl: z.string().url().optional().or(z.literal('')),
        mediaUrls: z.array(z.string().url()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createDiscussion({
          ...input,
          content: sanitizeUserHtml(input.content),
          authorId: ctx.user.id,
        });
        // Save global tags to post_tags join table
        if (input.tags && input.tags.length > 0) {
          const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;
          if (insertId) {
            const tagIds = await Promise.all(
              input.tags.map((name) => db.findOrCreateTag(name))
            );
            await db.addTagsToPost(tagIds, 'discussion', insertId);
          }
        }
        return result;
      }),
    getDiscussionsByCategory: publicProcedure
      .input(z.object({ categoryId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getDiscussionsByCategory(input.categoryId, input.limit || 20, input.offset || 0);
      }),
    getDiscussionBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const discussion = await db.getDiscussionBySlug(input.slug);
        if (discussion) {
          await db.incrementDiscussionViewCount(discussion.id);
        }
        return discussion;
      }),
    createPost: protectedProcedure
      .input(z.object({
        discussionId: z.number(),
        content: z.string().min(1),
        parentPostId: z.number().optional(),
        mediaUrls: z.array(z.string().url()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createForumPost({
          ...input,
          content: sanitizeUserHtml(input.content),
          authorId: ctx.user.id,
        });
        
        // Get the discussion to find the author
        const discussion = await db.getDiscussionById(input.discussionId);
        
        // Notify discussion author if the reply is from a different user
        if (discussion && discussion.authorId !== ctx.user.id) {
          const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;
          await db.createForumNotification({
            userId: discussion.authorId,
            type: 'reply',
            relatedUserId: ctx.user.id,
            discussionId: input.discussionId,
            postId: insertId,
          });
        }
        
        // Parse @mentions and notify mentioned users
        const mentions = db.parseMentions(input.content);
        if (mentions.length) {
          const insertId = (result as any).insertId ?? (result as any)[0]?.insertId;
          await db.notifyMentionedUsers(mentions, {
            authorId: ctx.user.id,
            discussionId: input.discussionId,
            postId: insertId,
          });
        }
        return result;
      }),
    getPostsByDiscussion: publicProcedure
      .input(z.object({ discussionId: z.number() }))
      .query(async ({ input }) => {
        return db.getForumPostsByDiscussion(input.discussionId);
      }),
    createGroup: protectedProcedure
      .input(z.object({
        name: z.string().min(3).max(256),
        slug: z.string().min(3).max(256),
        description: z.string().optional(),
        visibility: z.enum(["public", "private", "secret"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createForumGroup({
          ...input,
          creatorId: ctx.user.id,
        });
      }),
    getGroups: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return db.getForumGroups(input.limit || 20, input.offset || 0, ctx.user?.id);
      }),
    getGroupBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getForumGroupBySlug(input.slug);
      }),
    getGroupDiscussions: publicProcedure
      .input(z.object({ groupId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getDiscussionsByGroup(input.groupId, input.limit || 20, input.offset || 0);
      }),
    getGroupAnnouncements: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return db.getGroupAnnouncements(input.groupId);
      }),
    joinGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Private groups now require approval instead of joining instantly —
        // see db.joinForumGroup. Returns requiresApproval so the client can
        // show "request sent" instead of "joined".
        return db.joinForumGroup(input.groupId, ctx.user.id);
      }),
    getPendingJoinRequests: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getPendingGroupJoinRequests(input.groupId, ctx.user.id);
      }),
    respondToJoinRequest: protectedProcedure
      .input(z.object({ requestId: z.number(), approve: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        return db.respondToGroupJoinRequest(input.requestId, ctx.user.id, input.approve);
      }),
    updateGroupImages: protectedProcedure
      .input(z.object({ groupId: z.number(), avatarUrl: z.string().optional(), coverImageUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateGroupImages(input.groupId, ctx.user.id, { avatarUrl: input.avatarUrl, coverImageUrl: input.coverImageUrl });
        return { success: true };
      }),
    getGroupMembers: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return db.getGroupMembers(input.groupId);
      }),
    sendMessage: protectedProcedure
      .input(z.object({
        recipientId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.sendDirectMessage({
          senderId: ctx.user.id,
          recipientId: input.recipientId,
          content: input.content,
        });
        await db.createForumNotification({
          userId: input.recipientId,
          type: 'message',
          relatedUserId: ctx.user.id,
        });
        return result;
      }),
    getConversation: protectedProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return db.getDirectMessageConversation(ctx.user.id, input.userId, input.limit || 50);
      }),
    getNotifications: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input.unreadOnly || false);
      }),
    markNotificationAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationAsRead(input.notificationId, ctx.user.id);
        return { success: true };
      }),
    getOrCreateProfile: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrCreateUserProfile(ctx.user.id);
    }),
    updateProfile: protectedProcedure
      .input(z.object({
        bio: z.string().optional(),
        company: z.string().optional(),
        jobTitle: z.string().optional(),
        location: z.string().optional(),
        website: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserForumProfile(ctx.user.id, input);
        return { success: true };
      }),
    getRecentActivity: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getRecentForumActivity(input.limit || 20);
      }),
    updateDiscussion: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        categoryId: z.number().optional(),
        youtubeUrl: z.string().url().optional().or(z.literal('')),
        mediaUrls: z.array(z.string().url()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const discussion = await db.getDiscussionById(input.id);
        if (!discussion || (discussion.authorId !== ctx.user.id && ctx.user.role !== 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
        }
        return db.updateDiscussion(input.id, {
          ...input,
          content: input.content !== undefined ? sanitizeUserHtml(input.content) : undefined,
        });
      }),
    deleteDiscussion: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const discussion = await db.getDiscussionById(input.id);
        if (!discussion || (discussion.authorId !== ctx.user.id && ctx.user.role !== 'admin')) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
        }
        return db.deleteDiscussion(input.id);
      }),
    pinDiscussion: adminProcedure
      .input(z.object({ id: z.number(), isPinned: z.boolean() }))
      .mutation(async ({ input }) => {
        return db.updateDiscussion(input.id, { isPinned: input.isPinned });
      }),
    searchDiscussions: publicProcedure
      .input(z.object({
        query: z.string().optional(),
        authorId: z.number().optional(),
        categoryId: z.number().optional(),
        minReplies: z.number().optional(),
        minViews: z.number().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        sortBy: z.enum(["recent", "popular", "replies", "views"]).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.searchDiscussions(input);
      }),
  }),
  social: router({
    followMember: protectedProcedure
      .input(z.object({ followingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.followMember(ctx.user.id, input.followingId);
        // Fire new follower workflow (non-blocking)
        workflows.triggerNewFollower(ctx.user.id, ctx.user.name ?? "Someone", input.followingId).catch(console.error);
        return { success: true };
      }),
    unfollowMember: protectedProcedure
      .input(z.object({ followingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unfollowMember(ctx.user.id, input.followingId);
        return { success: true };
      }),
    isFollowing: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.isMemberFollowing(ctx.user.id, input.userId);
      }),
    getFollowers: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getFollowers(input.userId, input.limit || 50, input.offset || 0);
      }),
    getFollowing: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getFollowing(input.userId, input.limit || 50, input.offset || 0);
      }),
  }),
  members: router({
    getProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getUserProfile(input.userId);
      }),
    getActivityFeed: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getUserActivityFeed(input.userId, input.limit || 20, input.offset || 0);
      }),
    updateProfile: protectedProcedure
      .input(z.object({
        bio: z.string().optional(),
        location: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        avatarUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateUserProfile(ctx.user.id, input);
      }),
  }),
  gamification: router({
    awardBadge: adminProcedure
      .input(z.object({ userId: z.number(), badgeType: z.string(), title: z.string(), description: z.string().optional(), icon: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.awardBadge(input.userId, input.badgeType, input.title, input.description, input.icon);
        return { success: true };
      }),
    getUserBadges: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getUserBadges(input.userId);
      }),
    addPoints: adminProcedure
      .input(z.object({ userId: z.number(), points: z.number(), reason: z.string(), activityType: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.addPoints(input.userId, input.points, input.reason, input.activityType);
        return { success: true };
      }),
    getUserPoints: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getUserPoints(input.userId);
      }),
    getLeaderboard: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getLeaderboard(input.limit || 50, input.offset || 0);
      }),
  }),
  activity: router({
    getActivityFeed: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getActivityFeed(input.limit || 50, input.offset || 0);
      }),
    getUserActivityFeed: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getUserActivityFeed(input.userId, input.limit || 50, input.offset || 0);
      }),
    toggleReaction: protectedProcedure
      .input(z.object({ activityId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.toggleActivityReaction(input.activityId, ctx.user.id);
      }),
    getReactionCounts: publicProcedure
      .input(z.object({ activityIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        return db.getActivityReactionCounts(input.activityIds);
      }),
  }),
  directory: router({
    searchMembers: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.searchMembers(input.query, input.limit || 50, input.offset || 0);
      }),
    getMembersByRole: publicProcedure
      .input(z.object({ platformRole: z.string(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getMembersByRole(input.platformRole, input.limit || 50, input.offset || 0);
      }),
    getTrendingMembers: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getTrendingMembers(input.limit || 20);
      }),
  }),
  blog: router({
    listPosts: publicProcedure
      .input(z.object({ status: z.enum(["draft", "published"]).optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const status = isAdmin(ctx.user) ? input.status : "published";
        return db.listBlogPosts(status ?? "published", input.limit || 20, input.offset || 0);
      }),
    getPostBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ ctx, input }) => {
        const post = await db.getBlogPostBySlug(input.slug);
        if (!post) return null;
        if (!canViewUnpublished(post.authorId, post.status, ctx.user)) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return post;
      }),
    createPost: protectedProcedure
      .input(z.object({
        title: z.string().min(3).max(256),
        slug: z.string().min(3).max(256),
        content: z.string().min(10),
        excerpt: z.string().optional(),
        coverImageUrl: z.string().optional(),
        status: z.enum(["draft", "published"]).default("draft"),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createBlogPost({
          ...input,
          content: sanitizeUserHtml(input.content),
          status: resolveBlogCreateStatus(ctx.user.role, input.status),
          authorId: ctx.user.id,
        });
      }),
    updatePost: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        coverImageUrl: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getBlogPostById(input.id);
        if (!post) throw new TRPCError({ code: "NOT_FOUND" });
        assertOwnerOrAdmin(post.authorId, ctx.user);
        const { id, ...data } = input;
        const status = resolveBlogUpdateStatus(ctx.user.role, data.status);
        const update = {
          ...data,
          ...(data.content !== undefined ? { content: sanitizeUserHtml(data.content) } : {}),
          ...(status !== undefined ? { status } : { status: undefined }),
        };
        if (update.status === undefined) delete (update as { status?: unknown }).status;
        await db.updateBlogPost(id, update);
        return { success: true };
      }),
    deletePost: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getBlogPostById(input.id);
        if (!post) throw new TRPCError({ code: "NOT_FOUND" });
        assertOwnerOrAdmin(post.authorId, ctx.user);
        await db.deleteBlogPost(input.id);
        return { success: true };
      }),
   }),

  // ─── FCA Import ─────────────────────────────────────────────────────────────
  fcaImport: router({
    // Dry-run or execute import of members from FCA JSON/CSV export
    importMembers: adminProcedure
      .input(z.object({
        members: z.array(z.object({
          display_name: z.string().optional(),
          name: z.string().optional(),
          email: z.string(),
          bio: z.string().optional(),
          organization: z.string().optional(),
          joined_at: z.string().optional(),
          role: z.string().optional(),
        }).passthrough()),
        dryRun: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const results = { created: 0, skipped: 0, errors: [] as string[] };
        for (const m of input.members) {
          const email = m.email?.trim().toLowerCase();
          if (!email) { results.errors.push(`Missing email for: ${m.display_name || m.name || 'unknown'}`); continue; }
          try {
            const existing = await db.getUserByEmail(email);
            if (existing) { results.skipped++; continue; }
            if (!input.dryRun) {
              const openId = `fca-import-${crypto.randomBytes(12).toString('hex')}`;
              const resetToken = crypto.randomBytes(32).toString('hex');
              const resetExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
              // Create with a random unusable password — user must reset
              const unusableHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
              await db.createLocalUser({
                openId,
                name: m.display_name || m.name || email.split('@')[0],
                email,
                passwordHash: unusableHash,
                organization: m.organization,
              });
              const newUser = await db.getUserByEmail(email);
              if (newUser) {
                await db.setPasswordResetToken(newUser.id, resetToken, resetExpiry);
                if (m.bio) await db.updateUserForumProfile(newUser.id, { bio: m.bio });
              }
            }
            results.created++;
          } catch (e: any) {
            results.errors.push(`${email}: ${e.message}`);
          }
        }
        return results;
      }),

    // Dry-run or execute import of posts from FCA JSON/CSV export
    importPosts: adminProcedure
      .input(z.object({
        posts: z.array(z.object({
          title: z.string(),
          content: z.string(),
          space_name: z.string().optional(),
          space_slug: z.string().optional(),
          author_email: z.string().optional(),
          created_at: z.string().optional(),
          type: z.enum(['discussion', 'blog']).default('discussion'),
        })),
        targetType: z.enum(['forum', 'blog']).default('forum'),
        categoryId: z.number().optional(), // fallback category for discussions
        dryRun: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = { created: 0, skipped: 0, errors: [] as string[] };
        // Get categories for space mapping
        const categories = await db.getForumCategories();
        const defaultCategoryId = input.categoryId ?? categories[0]?.id ?? 1;

        // Configure marked for clean HTML output
        marked.setOptions({ breaks: true, gfm: true });

        for (const p of input.posts) {
          try {
            const title = p.title?.trim();
            if (!title) { results.errors.push('Post missing title'); continue; }

            // Convert markdown content to HTML if it contains markdown syntax
            let htmlContent = p.content;
            const hasMarkdown = /[#*_~`|\[\]>-]/.test(p.content) && !p.content.startsWith('<');
            if (hasMarkdown) {
              htmlContent = await marked.parse(p.content);
            }
            htmlContent = sanitizeUserHtml(htmlContent);

            // Resolve author
            let authorId = ctx.user.id;
            if (p.author_email) {
              const author = await db.getUserByEmail(p.author_email.trim().toLowerCase());
              if (author) authorId = author.id;
            }

            const postType = p.type !== 'discussion' ? p.type : (input.targetType === 'blog' ? 'blog' : 'discussion');

            if (!input.dryRun) {
              if (postType === 'blog') {
                const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
                const plainExcerpt = htmlContent.replace(/<[^>]*>/g, '').substring(0, 200);
                await db.createBlogPost({
                  title,
                  slug,
                  content: htmlContent,
                  excerpt: plainExcerpt,
                  authorId,
                  status: 'published',
                });
              } else {
                // Map space to category
                let categoryId = defaultCategoryId;
                if (p.space_slug || p.space_name) {
                  const match = categories.find(c =>
                    c.slug === p.space_slug ||
                    c.name.toLowerCase() === (p.space_name || '').toLowerCase()
                  );
                  if (match) categoryId = match.id;
                }
                const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();
                await db.createDiscussion({ title, slug, content: htmlContent, authorId, categoryId });
              }
            }
            results.created++;
          } catch (e: any) {
            results.errors.push(`"${p.title}": ${e.message}`);
          }
        }
        return results;
      }),

    // List existing forum categories for space mapping UI
    getCategories: adminProcedure.query(async () => {
      return db.getForumCategories();
    }),
  }),

  // ─── LinkedIn Import ──────────────────────────────────────────────────────────
  linkedInImport: router({
    // Import posts from LinkedIn Shares.csv or JSON export
    importPosts: adminProcedure
      .input(z.object({
        posts: z.array(z.object({
          // LinkedIn Shares.csv columns
          Date: z.string().optional(),
          ShareCommentary: z.string().optional(),
          ShareLink: z.string().optional(),
          Visibility: z.string().optional(),
          // Also accept common JSON field names from third-party exporters
          text: z.string().optional(),
          content: z.string().optional(),
          title: z.string().optional(),
          date: z.string().optional(),
          url: z.string().optional(),
          media_url: z.string().optional(),
        })),
        type: z.enum(['blog', 'discussion']).default('blog'),
        categoryId: z.number().optional(),
        dryRun: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const results = { created: 0, skipped: 0, errors: [] as string[] };
        const categories = await db.getForumCategories();
        const defaultCategoryId = input.categoryId ?? categories[0]?.id ?? 1;

        for (const p of input.posts) {
          try {
            // Normalize fields from both CSV and JSON formats
            const rawText = p.ShareCommentary || p.text || p.content || '';
            const rawDate = p.Date || p.date || '';
            const rawUrl = p.ShareLink || p.url || '';
            const rawMedia = p.media_url || '';

            if (!rawText.trim()) { results.skipped++; continue; }

            // Build title from first line or first 80 chars
            const firstLine = rawText.split('\n')[0].trim();
            const title = p.title || (firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine) || 'LinkedIn Post';

            // Build content with optional source link and media
            let content = rawText;
            if (rawMedia) content += `\n\n![Media](${rawMedia})`;
            if (rawUrl) content += `\n\n*[View original post on LinkedIn](${rawUrl})*`;

            if (!input.dryRun) {
              const authorId = ctx.user.id;
              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

              if (input.type === 'blog') {
                await db.createBlogPost({
                  title,
                  slug,
                  content: sanitizeUserHtml(content),
                  excerpt: rawText.substring(0, 200),
                  authorId,
                  status: 'published',
                });
              } else {
                await db.createDiscussion({ title, slug, content: sanitizeUserHtml(content), authorId, categoryId: defaultCategoryId });
              }
            }
            results.created++;
          } catch (e: any) {
            results.errors.push(e.message);
          }
        }
        return results;
      }),
  }),
  events: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return db.listEvents(input.limit || 20, input.offset || 0);
      }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getEventById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        location: z.string().optional(),
        isVirtual: z.boolean().optional(),
        meetingUrl: z.string().optional(),
        coverImageUrl: z.string().optional(),
        maxAttendees: z.number().optional(),
        eventType: z.enum(["webinar", "ama", "roundtable", "working_group", "conference", "office_hours", "training_cohort"]).optional(),
        replayUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createEvent({
          ...input,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          organizerId: ctx.user.id,
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        location: z.string().optional(),
        isVirtual: z.boolean().optional(),
        meetingUrl: z.string().optional(),
        replayUrl: z.string().url().optional().or(z.literal('')),
        coverImageUrl: z.string().optional(),
        maxAttendees: z.number().optional(),
        status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: 'NOT_FOUND' });
        if (event.organizerId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { id, ...rest } = input;
        await db.updateEvent(id, {
          ...rest,
          startDate: rest.startDate ? new Date(rest.startDate) : undefined,
          endDate: rest.endDate ? new Date(rest.endDate) : undefined,
        } as any);
        // Auto-create discussion thread when event is marked completed
        if (input.status === 'completed' && event.status !== 'completed' && !event.relatedDiscussionId) {
          db.createEventDiscussionThread(input.id, ctx.user.id).catch(console.error);
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: 'NOT_FOUND' });
        if (event.organizerId !== ctx.user.id && ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await db.deleteEvent(input.id);
        return { success: true };
      }),
    rsvp: protectedProcedure
      .input(z.object({ eventId: z.number(), status: z.enum(["going", "maybe", "not_going"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.rsvpEvent(input.eventId, ctx.user.id, input.status);
        // Fire RSVP workflow (non-blocking) - get event to find organizer
        db.getEventById(input.eventId).then(event => {
          if (event) workflows.triggerNewEventRsvp(ctx.user.id, ctx.user.name ?? "Someone", event.organizerId, event.title, event.id, input.status).catch(console.error);
        }).catch(console.error);
        return { success: true };
      }),
    getMyRsvp: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getUserRsvp(input.eventId, ctx.user.id);
      }),
    getAttendees: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return db.getEventRsvps(input.eventId);
      }),
    getAttendeeCount: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return db.getEventAttendeeCount(input.eventId);
      }),
  }),
  notifications: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input.unreadOnly ?? false);
      }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationAsRead(input.id, ctx.user.id);
        return { success: true };
      }),
    markAllRead: protectedProcedure
      .query(async ({ ctx }) => {
        const notifs = await db.getUserNotifications(ctx.user.id, true);
        for (const n of notifs) await db.markNotificationAsRead(n.id, ctx.user.id);
        return { success: true, count: notifs.length };
      }),
    getDigestPreferences: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getOrCreateDigestPreferences(ctx.user.id);
      }),
    updateDigestPreferences: protectedProcedure
      .input(z.object({
        enabled: z.boolean().optional(),
        frequency: z.enum(["daily", "weekly", "monthly", "never"]).optional(),
        dayOfWeek: z.number().optional(),
        hourOfDay: z.number().optional(),
        includeNewDiscussions: z.boolean().optional(),
        includePopularDiscussions: z.boolean().optional(),
        includeNewBlogPosts: z.boolean().optional(),
        includeUpcomingEvents: z.boolean().optional(),
        includeNewMembers: z.boolean().optional(),
        minEngagementLevel: z.enum(["all", "high", "very_high"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateDigestPreferences(ctx.user.id, input);
      }),
  }),
  courses: router({
    list: publicProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => db.listCourses(input.status, input.limit, input.offset)),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => db.getCourseBySlug(input.slug)),
    enroll: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .mutation(async ({ ctx, input }) => db.enrollInCourse(input.courseId, ctx.user.id)),
    myEnrollments: protectedProcedure
      .query(async ({ ctx }) => db.getUserEnrollments(ctx.user.id)),
    updateProgress: protectedProcedure
      .input(z.object({ courseId: z.number(), progress: z.number().min(0).max(100).optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.recalcCourseProgress(ctx.user.id, input.courseId);
        return { success: true };
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1), slug: z.string().min(1), description: z.string().optional(),
        excerpt: z.string().optional(), coverImageUrl: z.string().optional(),
        level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
        category: z.string().optional(), duration: z.string().optional(),
        lessonCount: z.number().optional(), isFree: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => db.createCourse({ ...input, authorId: ctx.user.id })),
  }),
  connections: router({
    myConnections: protectedProcedure
      .query(async ({ ctx }) => db.getUserConnections(ctx.user.id)),
    myFollowers: protectedProcedure
      .query(async ({ ctx }) => db.getUserFollowers(ctx.user.id)),
    isFollowing: protectedProcedure
      .input(z.object({ targetId: z.number() }))
      .query(async ({ ctx, input }) => db.isMemberFollowing(ctx.user.id, input.targetId)),
    unfollow: protectedProcedure
      .input(z.object({ targetId: z.number() }))
      .mutation(async ({ ctx, input }) => { await db.unfollowUser(ctx.user.id, input.targetId); return { success: true }; }),
    // Mutual friend-request layer, separate from the one-way follow above.
    sendRequest: protectedProcedure
      .input(z.object({ recipientId: z.number() }))
      .mutation(async ({ ctx, input }) => db.sendConnectionRequest(ctx.user.id, input.recipientId)),
    respondToRequest: protectedProcedure
      .input(z.object({ requestId: z.number(), accept: z.boolean() }))
      .mutation(async ({ ctx, input }) => db.respondToConnectionRequest(input.requestId, ctx.user.id, input.accept)),
    myPendingRequests: protectedProcedure
      .query(async ({ ctx }) => db.getPendingConnectionRequests(ctx.user.id)),
    myMutualConnections: protectedProcedure
      .query(async ({ ctx }) => db.getMutualConnections(ctx.user.id)),
  }),
  documents: router({
    listFolders: publicProcedure
      .input(z.object({ groupId: z.number().optional(), parentFolderId: z.number().optional() }))
      .query(async ({ input }) => db.listDocumentFolders(input)),
    createFolder: protectedProcedure
      .input(z.object({ groupId: z.number().optional(), parentFolderId: z.number().optional(), name: z.string().min(1).max(256) }))
      .mutation(async ({ ctx, input }) => db.createDocumentFolder({ ...input, createdBy: ctx.user.id, requesterRole: ctx.user.role })),
    list: publicProcedure
      .input(z.object({ groupId: z.number().optional(), folderId: z.number().optional() }))
      .query(async ({ input }) => db.listDocuments(input)),
    upload: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        folderId: z.number().optional(),
        groupId: z.number().optional(),
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { safeName, mimeType } = resolveUploadMeta(input.fileName);
        const buffer = Buffer.from(input.base64Data, "base64");
        assertUploadSize(buffer.length);
        const suffix = nanoid(8);
        const fileKey = `documents/${ctx.user.id}/${suffix}-${safeName}`;
        const { url } = await storagePut(fileKey, buffer, mimeType);
        return db.createDocument({
          folderId: input.folderId,
          groupId: input.groupId,
          title: input.title,
          description: input.description,
          fileKey,
          url,
          mimeType,
          sizeBytes: buffer.length,
          uploadedBy: ctx.user.id,
          requesterRole: ctx.user.role,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ ctx, input }) => db.deleteDocument(input.documentId, ctx.user.id, ctx.user.role)),
  }),
  profileFields: router({
    list: publicProcedure
      .query(async () => db.listProfileFieldDefinitions()),
    create: adminProcedure
      .input(z.object({
        fieldKey: z.string().min(1).max(64),
        label: z.string().min(1).max(128),
        fieldType: z.enum(["text", "textarea", "select", "url", "date", "number"]),
        options: z.array(z.string()).optional(),
        isRequired: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => db.createProfileFieldDefinition(input)),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        fieldType: z.enum(["text", "textarea", "select", "url", "date", "number"]).optional(),
        options: z.array(z.string()).optional(),
        isRequired: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateProfileFieldDefinition(id, data);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => db.deleteProfileFieldDefinition(input.id)),
    getValues: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => db.getProfileFieldValues(input.userId)),
    setValue: protectedProcedure
      .input(z.object({ fieldDefinitionId: z.number(), value: z.string() }))
      .mutation(async ({ ctx, input }) => db.setProfileFieldValue(ctx.user.id, input.fieldDefinitionId, input.value)),
  }),
  myGroups: router({
    list: protectedProcedure
      .query(async ({ ctx }) => db.getUserGroups(ctx.user.id)),
  }),
  search: router({
    global: publicProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().optional() }))
      .query(async ({ input }) => db.globalSearch(input.query, input.limit)),
  }),
  workflows: router({
    list: adminProcedure
      .query(async () => db.getWorkflowSettings()),
    toggle: adminProcedure
      .input(z.object({ workflowKey: z.string(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateWorkflowSetting(input.workflowKey, input.enabled);
        return { success: true };
      }),
    events: adminProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => db.getWorkflowEvents(input.limit ?? 50)),
    seed: adminProcedure.mutation(async () => {
      await db.seedWorkflowSettings();
      return { success: true };
    }),
  }),

  // ─── Discussion Engine Extensions ────────────────────────────────────────
  discussionEngine: router({
    markAccepted: protectedProcedure
      .input(z.object({ discussionId: z.number(), postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markAcceptedAnswer(input.discussionId, input.postId, ctx.user.id);
        return { success: true };
      }),
    generateSummary: adminProcedure
      .input(z.object({ discussionId: z.number() }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const disc = await db.getDiscussionBySlug(String(input.discussionId));
        if (!disc) throw new TRPCError({ code: "NOT_FOUND" });
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a technical community moderator. Summarize the following OPA/industrial automation discussion in 2-3 sentences, highlighting the key question, main insights, and any consensus reached. Be concise and professional." },
            { role: "user", content: `Title: ${disc.title}\n\n${disc.content}` },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const summary = typeof rawContent === "string" ? rawContent : "";
        await db.saveDiscussionAISummary(input.discussionId, summary);
        return { summary };
      }),
    promoteToArticle: adminProcedure
      .input(z.object({ discussionId: z.number(), title: z.string().optional(), summary: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.promoteDiscussionToArticle(input.discussionId, ctx.user.id, { title: input.title, summary: input.summary });
        return result;
      }),
  }),

  // ─── Organizations ────────────────────────────────────────────────────────
  organizations: router({
    list: publicProcedure.query(async () => db.getOrganizations()),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => db.getOrganizationById(input.id)),
    create: adminProcedure
      .input(z.object({ name: z.string(), slug: z.string(), type: z.string().optional(), website: z.string().optional(), description: z.string().optional(), industry: z.string().optional() }))
      .mutation(async ({ input }) => {
        const id = await db.createOrganization(input);
        return { id };
      }),
  }),

  // ─── Expertise Tags ───────────────────────────────────────────────────────
  expertise: router({
    listTags: publicProcedure.query(async () => db.getExpertiseTags()),
    getUserExpertise: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => db.getUserExpertise(input.userId)),
    addTag: protectedProcedure
      .input(z.object({ tagId: z.number(), level: z.enum(["beginner", "intermediate", "expert"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.addUserExpertise(ctx.user.id, input.tagId, input.level ?? "intermediate");
        return { success: true };
      }),
    removeTag: protectedProcedure
      .input(z.object({ tagId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeUserExpertise(ctx.user.id, input.tagId);
        return { success: true };
      }),
    seedTags: adminProcedure.mutation(async () => {
      await db.seedExpertiseTags();
      return { success: true };
    }),
  }),

  // ─── Polymorphic Follows ──────────────────────────────────────────────────
  follows: router({
    follow: protectedProcedure
      .input(z.object({ targetType: z.enum(["space", "post", "tag", "user", "course", "event"]), targetId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.followTarget(ctx.user.id, input.targetType, input.targetId);
        return { success: true };
      }),
    unfollow: protectedProcedure
      .input(z.object({ targetType: z.enum(["space", "post", "tag", "user", "course", "event"]), targetId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unfollowTarget(ctx.user.id, input.targetType, input.targetId);
        return { success: true };
      }),
    isFollowing: protectedProcedure
      .input(z.object({ targetType: z.string(), targetId: z.number() }))
      .query(async ({ ctx, input }) => db.isFollowing(ctx.user.id, input.targetType as any, input.targetId)),
    getUserFollows: protectedProcedure
      .input(z.object({ targetType: z.string().optional() }))
      .query(async ({ ctx, input }) => db.getUserFollows(ctx.user.id, input.targetType)),
  }),

  // ─── Expert Verification ──────────────────────────────────────────────────
  verification: router({
    submit: protectedProcedure
      .input(z.object({ linkedInUrl: z.string().optional(), credentials: z.string().optional(), statement: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createVerificationRequest(ctx.user.id, input);
        return { id };
      }),
    list: adminProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
      .query(async ({ input }) => db.getVerificationRequests(input.status)),
    review: adminProcedure
      .input(z.object({ requestId: z.number(), decision: z.enum(["approved", "rejected"]), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.reviewVerificationRequest(input.requestId, ctx.user.id, input.decision, input.notes);
        return { success: true };
      }),
  }),

  // ─── Spaces (Category-based hubs) ────────────────────────────────────────
  spaces: router({
    list: publicProcedure.query(async () => db.getForumCategories()),
    getContent: publicProcedure
      .input(z.object({ categoryId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => db.getSpaceContent(input.categoryId, input.limit ?? 10)),
    getTopContributors: publicProcedure
      .input(z.object({ categoryId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => db.getTopContributorsBySpace(input.categoryId, input.limit ?? 5)),
    getPreview: publicProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => db.getSpacePreview(input.categoryId)),
  }),

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  auditLogs: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => db.getAuditLogs(input.limit ?? 50, input.offset ?? 0)),
  }),

  // ─── Events Extensions ────────────────────────────────────────────────────
  eventEngine: router({
    createDiscussionThread: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const discussionId = await db.createEventDiscussionThread(input.eventId, ctx.user.id);
        return { discussionId };
      }),
  }),

  // ─── Courses (Live) ───────────────────────────────────────────────────────
  coursesLive: router({
    list: publicProcedure
      .input(z.object({ level: z.string().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => db.listCourses(input?.status, 50)),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => db.getCourseById(input.id)),
    enroll: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.enrollInCourse(input.courseId, ctx.user.id);
        return { success: true };
      }),
    updateProgress: protectedProcedure
      .input(z.object({ courseId: z.number(), progress: z.number().min(0).max(100).optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.recalcCourseProgress(ctx.user.id, input.courseId);
        return { success: true };
      }),
    myEnrollments: protectedProcedure
      .query(async ({ ctx }) => db.getUserEnrollments(ctx.user.id)),
    seedCourses: adminProcedure.mutation(async () => {
      await db.seedOPACourses();
      return { success: true };
    }),
  }),
  // ─── Courses (Admin Authoring) ────────────────────────────────────────────
  coursesAdmin: router({
    update: adminProcedure
      .input(z.object({
        courseId: z.number(),
        title: z.string().min(1).max(256).optional(),
        slug: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
        excerpt: z.string().optional(),
        level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        category: z.string().nullable().optional(),
        status: z.enum(["draft", "published", "coming_soon"]).optional(),
        isFree: z.boolean().optional(),
        duration: z.string().nullable().optional(),
        lessonCount: z.number().min(0).optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { courseId, ...fields } = input;
        await db.updateCourseFields(courseId, fields);
        return { success: true };
      }),
    reorder: adminProcedure
      .input(z.object({ courseIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.reorderCourses(input.courseIds);
        return { success: true };
      }),
  }),
  // ─── Profile Tabs ─────────────────────────────────────────────────────────
  profile: router({
    getDiscussions: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => db.getDiscussionsByUser(input.userId, input.limit ?? 20, input.offset ?? 0)),
    getPosts: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => db.getForumPostsByUser(input.userId, input.limit ?? 20, input.offset ?? 0)),
    getArticles: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => db.getContentNodesByUser(input.userId, input.limit ?? 20, input.offset ?? 0)),
    getBlogPosts: publicProcedure
      .input(z.object({ userId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => db.getBlogPostsByUser(input.userId, input.limit ?? 20, input.offset ?? 0)),
    getSpacesFollowed: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => db.getSpacesFollowedByUser(input.userId)),
  }),
  // ─── Content Enrichment ───────────────────────────────────────────────────
  contentEnrich: router({
    getRelated: publicProcedure
      .input(z.object({ nodeId: z.number(), tags: z.array(z.string()).optional() }))
      .query(async ({ input }) => db.getRelatedContentNodes(input.nodeId, input.tags ?? [], 4)),
    getRelatedDiscussions: publicProcedure
      .input(z.object({ nodeId: z.number(), tags: z.array(z.string()).optional() }))
      .query(async ({ input }) => db.getRelatedDiscussionsForContent(input.nodeId, input.tags ?? [], 4)),
    getContributors: publicProcedure
      .input(z.object({ nodeId: z.number() }))
      .query(async ({ input }) => db.getContentNodeContributors(input.nodeId)),
  }),
  // ─── Events On-Demand ─────────────────────────────────────────────────────
  eventsOnDemand: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => db.getOnDemandEvents(input.limit ?? 20, input.offset ?? 0)),
  }),
  // ─── Global Tags ──────────────────────────────────────────────────────────
  tags: router({
    list: publicProcedure.query(async () => db.listGlobalTags(100)),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => db.getTagBySlug(input.slug)),
    getPostsByTag: publicProcedure
      .input(z.object({ tagId: z.number(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => db.getPostsByTag(input.tagId, input.limit ?? 20, input.offset ?? 0)),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1).max(128), slug: z.string().min(1).max(128), description: z.string().optional() }))
      .mutation(async ({ input }) => { await db.createGlobalTag(input); return { success: true }; }),
    addToPost: protectedProcedure
      .input(z.object({ tagId: z.number(), targetType: z.string(), targetId: z.number() }))
      .mutation(async ({ input }) => { await db.addTagToPost(input.tagId, input.targetType, input.targetId); return { success: true }; }),
    findOrCreate: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ input }) => {
        const id = await db.findOrCreateTag(input.name);
        return { id };
      }),
    addToPostBulk: protectedProcedure
      .input(z.object({ tagIds: z.array(z.number()), targetType: z.string(), targetId: z.number() }))
      .mutation(async ({ input }) => {
        await db.addTagsToPost(input.tagIds, input.targetType, input.targetId);
        return { success: true };
      }),
    getForPost: publicProcedure
      .input(z.object({ targetType: z.string(), targetId: z.number() }))
      .query(async ({ input }) => db.getTagsForPost(input.targetType, input.targetId)),
  }),
  // ─── Quizzes ──────────────────────────────────────────────────────────────
  quiz: router({
    getByCourse: publicProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => toPlayerQuiz(await db.getQuizByCourse(input.courseId), false)),
    getByLesson: publicProcedure
      .input(z.object({ lessonId: z.number() }))
      .query(async ({ input }) => toPlayerQuiz(await db.getQuizByLesson(input.lessonId), false)),
    lessonQuizMap: publicProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => db.getLessonQuizMap(input.courseId)),
    create: adminProcedure
      .input(z.object({ courseId: z.number(), title: z.string().min(1), passingScore: z.number().min(1).max(100).optional() }))
      .mutation(async ({ input }) => { const id = await db.createQuiz(input); return { id }; }),
    addQuestion: adminProcedure
      .input(z.object({ quizId: z.number(), question: z.string().min(1), options: z.array(z.string()).min(2), correctIndex: z.number(), explanation: z.string().optional(), displayOrder: z.number().optional() }))
      .mutation(async ({ input }) => { await db.addQuizQuestion(input); return { success: true }; }),
    submit: protectedProcedure
      .input(z.object({ quizId: z.number(), answers: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => db.submitQuizAttempt(input.quizId, ctx.user.id, input.answers)),
    myAttempts: protectedProcedure
      .input(z.object({ quizId: z.number() }))
      .query(async ({ ctx, input }) => db.getMyQuizAttempts(ctx.user.id, input.quizId)),
  }),
  // ─── Quizzes (Admin Authoring) ────────────────────────────────────────────
  quizAdmin: router({
    getByLesson: adminProcedure
      .input(z.object({ lessonId: z.number() }))
      .query(async ({ input }) => db.getQuizByLesson(input.lessonId)),
    getByCourse: adminProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => db.getQuizByCourse(input.courseId)),
    upsertQuiz: adminProcedure
      .input(z.object({
        courseId: z.number(),
        title: z.string().min(1).max(256).optional(),
        passingScore: z.number().min(0).max(100),
      }))
      .mutation(async ({ input }) => db.upsertQuiz(input)),
    upsertLessonQuiz: adminProcedure
      .input(z.object({
        lessonId: z.number(),
        title: z.string().min(1).max(256).optional(),
        passingScore: z.number().min(0).max(100),
      }))
      .mutation(async ({ input }) => db.upsertLessonQuiz(input)),
    importQuestions: adminProcedure
      .input(z.object({
        courseId: z.number(),
        rows: z.array(z.object({
          lessonSlug: z.string().min(1),
          question: z.string().min(1),
          options: z.array(z.string().min(1)).min(2).max(6),
          correctIndex: z.number().int().min(0).max(5),
          explanation: z.string().optional(),
        })).min(1).max(500),
      }))
      .mutation(async ({ input }) => db.importQuizQuestions(input)),
    addQuestion: adminProcedure
      .input(z.object({
        quizId: z.number(),
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(6),
        correctIndex: z.number().int().min(0).max(5),
        explanation: z.string().optional(),
      }))
      .mutation(async ({ input }) => db.addQuizQuestionWithOrder(input)),
    updateQuestion: adminProcedure
      .input(z.object({
        questionId: z.number(),
        question: z.string().min(1).optional(),
        options: z.array(z.string().min(1)).min(2).max(6).optional(),
        correctIndex: z.number().int().min(0).max(5).optional(),
        explanation: z.string().nullable().optional(),
        displayOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { questionId, ...fields } = input;
        await db.updateQuizQuestion(questionId, fields);
        return { success: true };
      }),
    deleteQuestion: adminProcedure
      .input(z.object({ questionId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteQuizQuestion(input.questionId);
        return { success: true };
      }),
    reorderQuestions: adminProcedure
      .input(z.object({ quizId: z.number(), questionIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.reorderQuizQuestions(input.quizId, input.questionIds);
        return { success: true };
      }),
  }),
  // ─── Role Promotion Requests ──────────────────────────────────────────────
  rolePromotion: router({
    request: protectedProcedure
      .input(z.object({ requestedRole: z.string().min(1), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => { await db.createRolePromotionRequest(ctx.user.id, input.requestedRole, input.reason); return { success: true }; }),
    listPending: adminProcedure.query(async () => db.listPendingRolePromotions()),
    review: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['approved', 'rejected']), reviewNotes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => { await db.reviewRolePromotion(input.id, input.status, ctx.user.id, input.reviewNotes); return { success: true }; }),
  }),
  // ─── Re-engagement ────────────────────────────────────────────────────────
  reEngagement: router({
    getInactiveUsers: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).optional() }))
      .query(async ({ input }) => db.getInactiveUsers(input.days ?? 30)),
    sendReEngagementEmail: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
        const { sendReEngagementEmail } = await import('./email');
        await sendReEngagementEmail(user.email ?? '', user.name ?? 'Member');
        return { success: true };
      }),
    sendBulk: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).optional() }))
      .mutation(async ({ input }) => {
        const inactiveUsers = await db.getInactiveUsers(input.days ?? 30);
        const { sendReEngagementEmail } = await import('./email');
        let sent = 0;
        for (const user of inactiveUsers) {
          if (user.email) {
            await sendReEngagementEmail(user.email, user.name ?? 'Member').catch(() => {});
            sent++;
          }
        }
        return { success: true, sent, total: inactiveUsers.length };
      }),
  }),
  // ─── Course Linked Discussion ─────────────────────────────────────────────
  courseDiscussion: router({
    getLinked: publicProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => db.getCourseLinkedDiscussion(input.courseId)),
    setLinked: adminProcedure
      .input(z.object({ courseId: z.number(), discussionId: z.number() }))
      .mutation(async ({ input }) => { await db.updateCourseLinkedDiscussion(input.courseId, input.discussionId); return { success: true }; }),
    createAndLink: adminProcedure
      .input(z.object({ courseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const course = await db.getCourseById(input.courseId);
        if (!course) throw new TRPCError({ code: 'NOT_FOUND' });
        // Find or create a Training category
        const cats = await db.getForumCategories();
        let cat = cats.find(c => /training|course/i.test(c.name));
        if (!cat) cat = cats[0];
        if (!cat) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No forum categories exist' });
        const slug = `course-${input.courseId}-discussion-${Date.now()}`;
        const [r] = await db.createDiscussion({
          title: `Discussion: ${course.title}`,
          slug,
          content: `Welcome to the community discussion thread for **${course.title}**. Ask questions, share insights, and connect with fellow learners.`,
          authorId: ctx.user.id,
          categoryId: cat.id,
        });
        const discussionId = (r as any).insertId;
        await db.updateCourseLinkedDiscussion(input.courseId, discussionId);
        return { discussionId };
      }),
  }),
  // ─── Lessons (Player) ─────────────────────────────────────────────────────
  lessons: router({
    listByCourse: publicProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => db.listPublishedLessonsByCourse(input.courseId)),
    get: publicProcedure
      .input(z.object({ courseSlug: z.string(), lessonSlug: z.string() }))
      .query(async ({ input }) => db.getLessonByCourseAndSlug(input.courseSlug, input.lessonSlug)),
    getProgress: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ ctx, input }) => db.getLessonProgressForUser(ctx.user.id, input.courseId)),
    updateProgress: protectedProcedure
      .input(z.object({ lessonId: z.number(), watchedSeconds: z.number().min(0) }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertLessonProgress(ctx.user.id, input.lessonId, input.watchedSeconds);
        return { success: true };
      }),
    markComplete: protectedProcedure
      .input(z.object({ lessonId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const lesson = await db.getLessonById(input.lessonId);
        if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
        await db.markLessonComplete(ctx.user.id, input.lessonId);
        await db.recalcCourseProgress(ctx.user.id, lesson.courseId);
        return { success: true };
      }),
    getNextIncomplete: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ ctx, input }) => db.getNextIncompleteLesson(ctx.user.id, input.courseId)),
  }),
  // ─── Lessons (Admin Authoring) ────────────────────────────────────────────
  lessonsAdmin: router({
    list: adminProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => db.listAllLessonsByCourse(input.courseId)),
    create: adminProcedure
      .input(z.object({
        courseId: z.number(),
        title: z.string().min(1).max(256),
        slug: z.string().min(1).max(256),
        description: z.string().optional(),
        videoSource: z.enum(["cloudflare_stream", "r2", "youtube", "none"]).optional(),
      }))
      .mutation(async ({ input }) => db.createLesson(input)),
    update: adminProcedure
      .input(z.object({
        lessonId: z.number(),
        title: z.string().min(1).max(256).optional(),
        slug: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
        supplementMarkdown: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { lessonId, ...fields } = input;
        await db.updateLesson(lessonId, fields);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ lessonId: z.number() }))
      .mutation(async ({ input }) => {
        const { streamVideoId } = await db.deleteLesson(input.lessonId);
        if (streamVideoId) {
          await stream.deleteVideo(streamVideoId).catch(err => console.error("[stream] delete failed", err));
        }
        return { success: true };
      }),
    reorder: adminProcedure
      .input(z.object({ courseId: z.number(), lessonIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await db.reorderLessons(input.courseId, input.lessonIds);
        return { success: true };
      }),
    requestVideoUpload: adminProcedure
      .input(z.object({ lessonId: z.number(), maxDurationSeconds: z.number().min(60).max(36000) }))
      .mutation(async ({ input }) => {
        const { uploadURL, uid } = await stream.createDirectUploadUrl(input.maxDurationSeconds);
        await db.setLessonStreamVideoId(input.lessonId, uid);
        return { uploadURL, uid };
      }),
    confirmVideoReady: adminProcedure
      .input(z.object({ lessonId: z.number() }))
      .mutation(async ({ input }) => {
        const lesson = await db.getLessonById(input.lessonId);
        if (!lesson?.streamVideoId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No video uploaded for this lesson" });
        }
        const status = await stream.getVideoStatus(lesson.streamVideoId);
        if (!status.readyToStream) return { ready: false as const };
        await db.setLessonReadyMetadata(input.lessonId, { duration: status.duration, thumbnail: status.thumbnail });
        return { ready: true as const };
      }),
    publish: adminProcedure
      .input(z.object({ lessonId: z.number() }))
      .mutation(async ({ input }) => {
        await db.publishLesson(input.lessonId);
        return { success: true };
      }),
    importLessons: adminProcedure
      .input(z.object({
        courseId: z.number(),
        rows: z.array(z.object({
          title: z.string().min(1).max(256),
          slug: z.string().min(1).max(256),
          description: z.string().optional(),
          supplementMarkdown: z.string().optional(),
          isPublished: z.boolean().optional(),
          displayOrder: z.number().optional(),
        })).min(1).max(200),
      }))
      .mutation(async ({ input }) => db.importLessons(input)),
    unpublish: adminProcedure
      .input(z.object({ lessonId: z.number() }))
      .mutation(async ({ input }) => {
        await db.unpublishLesson(input.lessonId);
        return { success: true };
      }),
  }),
  // ─── Dashboard Widget ─────────────────────────────────────────────────────
  dashboard: router({
    continueLearning: protectedProcedure
      .query(async ({ ctx }) => {
        const active = await db.getActiveCourseEnrollment(ctx.user.id);
        const unread = await db.getUnreadNotificationCount(ctx.user.id);
        return { activeCourse: active, unreadCount: unread };
      }),
   }),

  // ─── Certificates ──────────────────────────────────────────────────────
  certificates: router({
    my: protectedProcedure.query(async ({ ctx }) => db.getUserCertificates(ctx.user.id)),
    verify: publicProcedure
      .input(z.object({ uniqueId: z.string() }))
      .query(async ({ input }) => db.verifyCertificate(input.uniqueId)),
    claim: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const hasCert = await db.hasCourseCertificate(ctx.user.id, input.courseId);
        if (hasCert) throw new TRPCError({ code: 'CONFLICT', message: 'Certificate already issued' });
        await db.recalcCourseProgress(ctx.user.id, input.courseId);
        const refreshed = await db.getUserEnrollments(ctx.user.id);
        const current = refreshed.find((e: any) => e.enrollment.courseId === input.courseId);
        if (!current || !current.enrollment.completedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Course not completed' });
        const result = await db.issueCertificate(ctx.user.id, input.courseId, 'course_completion');
        // Check if eligible for OPA Practitioner
        const completedCount = await db.getCompletedCourseCount(ctx.user.id);
        const allCourses = await db.listCourses(undefined, 100);
        const publishedCount = allCourses.filter((c: any) => c.status === 'published').length;
        if (completedCount >= publishedCount && publishedCount > 0) {
          const hasOPA = await db.hasOPAPractitionerCertificate(ctx.user.id);
          if (!hasOPA) await db.issueCertificate(ctx.user.id, null, 'opa_practitioner');
        }
        return result;
      }),
  }),

  // ─── Case Studies ─────────────────────────────────────────────────────
  caseStudies: router({
    list: publicProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const status = isAdmin(ctx.user)
          ? input?.status
          : (input?.status === "featured" ? "featured" : "approved");
        return db.listCaseStudies(status || "approved", input?.limit, input?.offset);
      }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const study = await db.getCaseStudyById(input.id);
        if (!study) return null;
        if (!canViewUnpublished(study.authorId, study.status, ctx.user)) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return study;
      }),
    submit: protectedProcedure
      .input(z.object({
        title: z.string().min(1), description: z.string().min(1), summary: z.string().optional(),
        industry: z.string().min(1),
        companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']),
        roi: z.string().optional(), implementationTimeline: z.string().optional(),
        techStack: z.string().optional(), keyResults: z.string().optional(),
        challenges: z.string().optional(), lessons: z.string().optional(),
        coverImageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.submitCaseStudy({ ...input, authorId: ctx.user.id });
        return { id };
      }),
    review: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['approved', 'featured', 'draft']) }))
      .mutation(async ({ input }) => {
        await db.reviewCaseStudy(input.id, input.status);
        return { success: true };
      }),
    listAll: adminProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => db.listCaseStudies(input?.status)),
  }),

  // ─── Benchmarking ─────────────────────────────────────────────────────
  benchmarking: router({
    submit: protectedProcedure
      .input(z.object({
        isAnonymous: z.boolean().optional(),
        industry: z.string().min(1),
        companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']),
        roi: z.string().optional(), implementationTimeline: z.string().optional(),
        teamSize: z.number().optional(), techStack: z.string().optional(),
        challenges: z.string().optional(), keySuccesses: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.submitBenchmarkEntry({ ...input, userId: input.isAnonymous ? undefined : ctx.user.id });
        return { id };
      }),
    dashboard: publicProcedure.query(async () => db.getBenchmarkAggregates()),
  }),

  // ─── Consulting ───────────────────────────────────────────────────────
  consulting: router({
    services: publicProcedure.query(async () => db.listConsultingServices()),
    getService: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => db.getConsultingServiceById(input.id)),
    inquire: protectedProcedure
      .input(z.object({
        serviceId: z.number(), email: z.string().email(),
        phone: z.string().optional(), message: z.string().optional(),
        preferredDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.submitConsultingInquiry({
          ...input, userId: ctx.user.id,
          preferredDate: input.preferredDate ? new Date(input.preferredDate) : undefined,
        });
        // Send confirmation emails (member + admin)
        const service = await db.getConsultingServiceById(input.serviceId);
        const adminEmail = process.env.SMTP_FROM?.match(/<(.+)>/)?.[1] || process.env.SMTP_FROM || 'noreply@opacommunity.com';
        sendConsultingInquiryEmails({
          memberEmail: input.email,
          memberName: ctx.user.name || 'Community Member',
          adminEmail,
          serviceName: service?.name || 'Consulting Service',
          serviceType: service?.serviceType || 'general',
          message: input.message,
          phone: input.phone,
          preferredDate: input.preferredDate,
        }).catch(err => console.error('[consulting] Email send error:', err));
        return { id };
      }),
    // Admin
    createService: adminProcedure
      .input(z.object({
        name: z.string().min(1), description: z.string().min(1),
        serviceType: z.enum(['architecture_review', 'custom_training', 'implementation_advisory']),
        price: z.string(), duration: z.string().optional(), maxSlotsPerMonth: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createConsultingService(input);
        return { id };
      }),
    updateService: adminProcedure
      .input(z.object({
        id: z.number(), name: z.string().optional(), description: z.string().optional(),
        price: z.string().optional(), duration: z.string().optional(),
        maxSlotsPerMonth: z.number().optional(), isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateConsultingService(id, data);
        return { success: true };
      }),
    inquiries: adminProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => db.listConsultingInquiries(input?.status)),
    updateInquiryStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['new', 'contacted', 'scheduled', 'completed', 'cancelled']), adminNotes: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.updateConsultingInquiryStatus(input.id, input.status, input.adminNotes);
        return { success: true };
      }),
  }),
  // ─── Section Heroes ──────────────────────────────────────────────────
  sectionHeroes: router({
    get: publicProcedure
      .input(z.object({ sectionKey: z.string() }))
      .query(async ({ input }) => {
        return db.getSectionHero(input.sectionKey);
      }),
    getAll: publicProcedure
      .query(async () => {
        return db.getAllSectionHeroes();
      }),
    upsert: adminProcedure
      .input(z.object({
        sectionKey: z.string(),
        heroImageUrl: z.string().url(),
        title: z.string().optional(),
        subtitle: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertSectionHero(input.sectionKey, {
          heroImageUrl: input.heroImageUrl,
          title: input.title,
          subtitle: input.subtitle,
          updatedByUserId: ctx.user.id,
        });
      }),
    remove: adminProcedure
      .input(z.object({ sectionKey: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteSectionHero(input.sectionKey);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
