import { eq, desc, and, inArray, like, sql, or, gte, lte, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  capabilities, requirements, contentNodes, mediaAttachments,
  vendors, vendorClaims, claimChallenges, projects, projectMembers, decisionLogs,
  architectureComponents, savedArchitectures, aiChats,
  migrationPlans, rfpDocuments,
  forumCategories, discussions, forumPosts, forumGroups, groupMembers, groupJoinRequests, directMessages, forumNotifications, userProfiles,
  memberFollows, memberBadges, activityLog, activityReactions, connectionRequests, pointsTransactions, groupAnnouncements,
  documentFolders, documents, profileFieldDefinitions, profileFieldValues, contentReports,
  blogPosts,
  events, eventRsvps,
  courses, courseEnrollments, lessons, lessonProgress,
  workflowSettings, workflowEvents,
  notificationsTable, digestSends,
  organizations, expertiseTags, userExpertise, follows, auditLogs, verificationRequests,
  globalTags, postTags, quizzes, quizQuestions, quizAttempts, rolePromotionRequests,
  certificates, caseStudies, benchmarkingData, consultingServices, consultingInquiries,
  emailDigestPreferences, type InsertEmailDigestPreference,
  sectionHeroes,
  magicLinkTokens,
  emailBlasts,
  apiTokens,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.email && user.email === ENV.ownerEmail) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: {
  platformRole?: string; bio?: string; organization?: string;
  credentials?: string[]; onboarded?: boolean; linkedInUrl?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data as any).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? undefined;
}
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? undefined;
}
export async function createLocalUser(data: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
  platformRole?: string;
  organization?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    platformRole: data.platformRole as any,
    organization: data.organization,
    onboarded: !!data.platformRole,
    emailVerified: false,
    lastSignedIn: new Date(),
  });
}
export async function setPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(users.id, userId));
}
export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  return result[0] ?? undefined;
}
export async function updatePasswordHash(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash, resetToken: null, resetTokenExpiresAt: null }).where(eq(users.id, userId));
}

// ─── Magic-Link Tokens ───────────────────────────────────────────────
export async function createMagicLinkToken(data: {
  token: string;
  userId: number;
  email: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(magicLinkTokens).values({
    token: data.token,
    userId: data.userId,
    email: data.email,
    expiresAt: data.expiresAt,
  });
}

export async function getMagicLinkToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(magicLinkTokens)
    .where(eq(magicLinkTokens.token, token))
    .limit(1);
  return result[0] ?? undefined;
}

export async function markMagicLinkUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(magicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(magicLinkTokens.id, id));
}

// ─── API Tokens (personal tokens for programmatic/MCP access) ───────
export async function createApiToken(data: { userId: number; label: string; tokenHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(apiTokens).values(data);
  return { id: (result as any).insertId, ...data };
}

export async function getApiTokenByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, tokenHash))
    .limit(1);
  return result[0] ?? undefined;
}

export async function touchApiTokenLastUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, id));
}

// ─── Capabilities ─────────────────────────────────────────────────────
export async function listCapabilities() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(capabilities).orderBy(capabilities.name);
}

export async function getCapabilityBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(capabilities).where(eq(capabilities.slug, slug)).limit(1);
  return result[0] ?? undefined;
}

export async function getCapabilityById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(capabilities).where(eq(capabilities.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function createCapability(data: { name: string; slug: string; description?: string; opasLayer?: string; parentId?: number; icon?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(capabilities).values(data);
}

// ─── Requirements ────────────────────────────────────────────────────
export async function listRequirementsByCapability(capabilityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(requirements).where(eq(requirements.capabilityId, capabilityId));
}

export async function createRequirement(data: { capabilityId: number; definition: string; validationCriteria?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(requirements).values(data);
}

// ─── Content Nodes ───────────────────────────────────────────────────
export async function listContentNodes(filters?: { type?: string; status?: string; capabilityId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(contentNodes.status, filters.status as any));
  if (filters?.type) conditions.push(eq(contentNodes.type, filters.type as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(contentNodes).where(where).orderBy(desc(contentNodes.createdAt)).limit(100);
}

export async function getContentNodeBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentNodes).where(eq(contentNodes.slug, slug)).limit(1);
  return result[0] ?? undefined;
}

export async function getContentNodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentNodes).where(eq(contentNodes.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function createContentNode(data: {
  title: string; slug: string; type: "article" | "diagram" | "case_study" | "post" | "guide";
  body?: string; summary?: string; authorId: number; status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
  linkedCapabilities?: number[]; tags?: string[];
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(contentNodes).values(data).$returningId();
  return result.id;
}

export async function updateContentNode(id: number, data: Partial<{
  title: string; body: string; summary: string; status: string;
  linkedCapabilities: number[]; tags: string[]; categoryId: number;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(contentNodes).set({ ...data, version: sql`version + 1` } as any).where(eq(contentNodes.id, id));
}

export async function deleteContentNode(id: number) {
  const db = await getDb();
  if (!db) return;
  // Delete associated media attachments first
  await db.delete(mediaAttachments).where(eq(mediaAttachments.contentNodeId, id));
  // Delete the content node
  await db.delete(contentNodes).where(eq(contentNodes.id, id));
}

// ─── Media Attachments ───────────────────────────────────────────────
export async function createMediaAttachment(data: {
  contentNodeId?: number; projectId?: number; uploaderId: number;
  fileName: string; fileKey: string; url: string; mimeType: string; sizeBytes?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(mediaAttachments).values(data).$returningId();
  return result.id;
}

export async function listMediaByContentNode(contentNodeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaAttachments).where(eq(mediaAttachments.contentNodeId, contentNodeId));
}

export async function listMediaByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaAttachments).where(eq(mediaAttachments.projectId, projectId));
}

// ─── Vendors ─────────────────────────────────────────────────────────
export async function listVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).orderBy(vendors.name);
}

export async function getVendorBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vendors).where(eq(vendors.slug, slug)).limit(1);
  return result[0] ?? undefined;
}

export async function createVendor(data: {
  name: string; slug: string; description?: string; website?: string;
  logoUrl?: string; submittedById: number;
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(vendors).values(data).$returningId();
  return result.id;
}

// ─── Vendor Claims ───────────────────────────────────────────────────
export async function listVendorClaims(vendorId?: number) {
  const db = await getDb();
  if (!db) return [];
  const where = vendorId ? eq(vendorClaims.vendorId, vendorId) : undefined;
  return db.select().from(vendorClaims).where(where).orderBy(desc(vendorClaims.createdAt));
}

export async function createVendorClaim(data: {
  vendorId: number; capabilityId: number; claimText?: string;
  evidenceLinks?: string[]; submittedById: number;
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(vendorClaims).values(data).$returningId();
  return result.id;
}

export async function updateVendorClaimStatus(id: number, status: "unverified" | "verified" | "challenged", reviewedById: number, reviewNotes?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(vendorClaims).set({ status, reviewedById, reviewNotes } as any).where(eq(vendorClaims.id, id));
}

// ─── Claim Challenges (Community Validation) ────────────────────────
export async function createClaimChallenge(data: {
  claimId: number; challengerId: number; reason: string;
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(claimChallenges).values(data).$returningId();
  return result.id;
}

export async function listClaimChallenges(claimId?: number) {
  const db = await getDb();
  if (!db) return [];
  const where = claimId ? eq(claimChallenges.claimId, claimId) : undefined;
  return db.select().from(claimChallenges).where(where).orderBy(desc(claimChallenges.createdAt));
}

export async function updateChallengeStatus(id: number, status: "pending" | "accepted" | "rejected") {
  const db = await getDb();
  if (!db) return;
  await db.update(claimChallenges).set({ status }).where(eq(claimChallenges.id, id));
}

// ─── Projects ────────────────────────────────────────────────────────
export async function listUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const memberRows = await db.select().from(projectMembers).where(eq(projectMembers.userId, userId));
  if (memberRows.length === 0) return [];
  const projectIds = memberRows.map(m => m.projectId);
  return db.select().from(projects).where(inArray(projects.id, projectIds)).orderBy(desc(projects.updatedAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function createProject(data: { name: string; description?: string; ownerId: number }) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(projects).values(data).$returningId();
  await db.insert(projectMembers).values({ projectId: result.id, userId: data.ownerId, memberRole: "owner" });
  return result.id;
}

export async function getProjectMembers(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  const members = await db.select().from(projectMembers).where(eq(projectMembers.projectId, projectId));
  const userIds = members.map(m => m.userId);
  if (userIds.length === 0) return [];
  const userRows = await db.select().from(users).where(inArray(users.id, userIds));
  return members.map(m => ({ ...m, user: userRows.find(u => u.id === m.userId) }));
}

export async function addProjectMember(projectId: number, userId: number, memberRole: "owner" | "editor" | "viewer" = "editor") {
  const db = await getDb();
  if (!db) return;
  await db.insert(projectMembers).values({ projectId, userId, memberRole });
}

export async function isProjectMember(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))).limit(1);
  return result.length > 0;
}

// ─── Decision Logs ───────────────────────────────────────────────────
export async function listDecisionLogs(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(decisionLogs).where(eq(decisionLogs.projectId, projectId)).orderBy(desc(decisionLogs.createdAt));
}

export async function createDecisionLog(data: {
  projectId: number; title: string; description?: string;
  decision?: string; rationale?: string; authorId: number; linkedCapabilities?: number[];
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(decisionLogs).values(data).$returningId();
  return result.id;
}

// ─── Architecture Components (seed data) ─────────────────────────────
export async function listArchitectureComponents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(architectureComponents).orderBy(architectureComponents.type);
}

export async function createArchitectureComponent(data: {
  name: string; type: "dcn" | "runtime" | "network" | "controller" | "gateway" | "sensor" | "actuator";
  description?: string; properties?: any; riskFlags?: string[]; opasLayer?: string; icon?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(architectureComponents).values(data);
}

export async function deleteArchitectureComponent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(architectureComponents).where(eq(architectureComponents.id, id));
}

// ─── Saved Architectures ─────────────────────────────────────────────
export async function listSavedArchitectures(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedArchitectures).where(eq(savedArchitectures.userId, userId)).orderBy(desc(savedArchitectures.updatedAt));
}

export async function getSavedArchitecture(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(savedArchitectures).where(eq(savedArchitectures.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function createSavedArchitecture(data: {
  name: string; userId: number; projectId?: number;
  components?: any; connections?: any; riskSummary?: any;
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(savedArchitectures).values(data).$returningId();
  return result.id;
}

export async function updateSavedArchitecture(id: number, data: Partial<{
  name: string; components: any; connections: any; riskSummary: any;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(savedArchitectures).set(data as any).where(eq(savedArchitectures.id, id));
}

// ─── AI Chats ────────────────────────────────────────────────────────
export async function listAiChats(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiChats).where(eq(aiChats.userId, userId)).orderBy(desc(aiChats.updatedAt)).limit(50);
}

export async function getAiChat(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiChats).where(eq(aiChats.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function createAiChat(data: {
  userId: number; title?: string;
  messages?: Array<{ role: string; content: string; timestamp: number }>;
  context?: { capabilities?: number[]; projectId?: number };
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(aiChats).values(data).$returningId();
  return result.id;
}

export async function updateAiChat(id: number, data: Partial<{
  title: string;
  messages: Array<{ role: string; content: string; timestamp: number }>;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiChats).set(data as any).where(eq(aiChats.id, id));
}

// ─── Migration Plans ─────────────────────────────────────────────────
export async function listMigrationPlans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(migrationPlans).where(eq(migrationPlans.userId, userId)).orderBy(desc(migrationPlans.updatedAt));
}

export async function createMigrationPlan(data: {
  name: string; userId: number; projectId?: number;
  currentEnvironment?: any; phases?: any; riskProfile?: any; costImplications?: any;
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(migrationPlans).values(data).$returningId();
  return result.id;
}

export async function getMigrationPlan(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(migrationPlans).where(eq(migrationPlans.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function updateMigrationPlan(id: number, data: Partial<{
  name: string; currentEnvironment: any; phases: any; riskProfile: any; costImplications: any;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(migrationPlans).set(data as any).where(eq(migrationPlans.id, id));
}

// ─── RFP Documents ───────────────────────────────────────────────────
export async function listRfpDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rfpDocuments).where(eq(rfpDocuments.userId, userId)).orderBy(desc(rfpDocuments.updatedAt));
}

export async function createRfpDocument(data: {
  name: string; userId: number; projectId?: number;
  selectedCapabilities?: number[]; generatedContent?: string; evaluationCriteria?: any;
}) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(rfpDocuments).values(data).$returningId();
  return result.id;
}

export async function getRfpDocument(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rfpDocuments).where(eq(rfpDocuments.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function updateRfpDocument(id: number, data: Partial<{
  name: string; generatedContent: string; evaluationCriteria: any; selectedCapabilities: number[];
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(rfpDocuments).set(data as any).where(eq(rfpDocuments.id, id));
}

// ─── Reputation / Contribution Scoring ──────────────────────────────
export async function adjustReputation(userId: number, delta: number) {
  const db = await getDb();
  if (!db) return;
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return;
  const newScore = Math.max(0, (user[0].reputationScore ?? 0) + delta);
  await db.update(users).set({ reputationScore: newScore }).where(eq(users.id, userId));
}

// ─── Admin: User Management ─────────────────────────────────────────
export async function listAllUsers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.lastSignedIn)).limit(limit).offset(offset);
}

export async function countUsers() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return result[0]?.count ?? 0;
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserPlatformRole(userId: number, platformRole: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ platformRole } as any).where(eq(users.id, userId));
}

// ─── Admin: Content Moderation ──────────────────────────────────────
export async function listPendingContent() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentNodes).where(eq(contentNodes.status, "pending_review")).orderBy(contentNodes.createdAt);
}

export async function approveContent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contentNodes).set({ status: "published", rejectionReason: null } as any).where(eq(contentNodes.id, id));
}

export async function rejectContent(id: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(contentNodes).set({ status: "rejected", rejectionReason: reason } as any).where(eq(contentNodes.id, id));
}

export async function submitContentForReview(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(contentNodes).set({ status: "pending_review" } as any).where(eq(contentNodes.id, id));
}

// ─── Admin: Platform Stats ──────────────────────────────────────────
export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return { users: 0, content: 0, capabilities: 0, vendors: 0, projects: 0, pendingReview: 0 };
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [contentCount] = await db.select({ count: sql<number>`count(*)` }).from(contentNodes);
  const [capCount] = await db.select({ count: sql<number>`count(*)` }).from(capabilities);
  const [vendorCount] = await db.select({ count: sql<number>`count(*)` }).from(vendors);
  const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projects);
  const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(contentNodes).where(eq(contentNodes.status, "pending_review"));
  return {
    users: userCount?.count ?? 0,
    content: contentCount?.count ?? 0,
    capabilities: capCount?.count ?? 0,
    vendors: vendorCount?.count ?? 0,
    projects: projectCount?.count ?? 0,
    pendingReview: pendingCount?.count ?? 0,
  };
}

// ─── Admin: Capability CRUD ─────────────────────────────────────────
export async function updateCapability(id: number, data: Partial<{
  name: string; slug: string; description: string; opasLayer: string; parentId: number; icon: string;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(capabilities).set(data as any).where(eq(capabilities.id, id));
}

export async function deleteCapability(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(capabilities).where(eq(capabilities.id, id));
}

// ─── Admin: Vendor CRUD ─────────────────────────────────────────────
export async function updateVendor(id: number, data: Partial<{
  name: string; slug: string; description: string; website: string; logoUrl: string;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(vendors).set(data as any).where(eq(vendors.id, id));
}

export async function deleteVendor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(vendors).where(eq(vendors.id, id));
}

// ─── Digest Preferences ────────────────────────────────────────────
export async function updateDigestPreference(userId: number, optIn: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ digestOptIn: optIn }).where(eq(users.id, userId));
}

export async function getDigestSubscribers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(and(eq(users.digestOptIn, true)));
}

export async function updateLastDigestSent(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastDigestSentAt: new Date() }).where(eq(users.id, userId));
}

// ─── Digest: Recent Activity ────────────────────────────────────────
export async function getRecentPublishedContent(since: Date, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentNodes)
    .where(and(eq(contentNodes.status, "published"), sql`${contentNodes.createdAt} >= ${since}`))
    .orderBy(desc(contentNodes.createdAt)).limit(limit);
}

export async function getRecentCapabilities(since: Date, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(capabilities)
    .where(sql`${capabilities.createdAt} >= ${since}`)
    .orderBy(desc(capabilities.createdAt)).limit(limit);
}

export async function getRecentVendors(since: Date, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors)
    .where(sql`${vendors.createdAt} >= ${since}`)
    .orderBy(desc(vendors.createdAt)).limit(limit);
}

// ─── Knowledge Categories ───────────────────────────────────────────────
export async function getKnowledgeCategories() {
  // Unified: use forumCategories as the single category tree for both KB and Forum
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumCategories).orderBy(forumCategories.displayOrder);
}

export async function getKnowledgeCategoryBySlug(slug: string) {
  // Unified: use forumCategories
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(forumCategories).where(eq(forumCategories.slug, slug)).limit(1);
  return result[0];
}

export async function createKnowledgeCategory(data: { name: string; slug: string; description?: string; icon?: string; displayOrder?: number }) {
  // Unified: use forumCategories
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(forumCategories).values(data);
  return result;
}

export async function getContentNodesByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentNodes)
    .where(and(eq(contentNodes.categoryId, categoryId), eq(contentNodes.status, 'published')))
    .orderBy(desc(contentNodes.createdAt));
}


// ─── OPA Community Forum ──────────────────────────────────────────────

export async function getForumCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(forumCategories).orderBy(forumCategories.displayOrder);
}

export async function createDiscussion(data: { title: string; slug: string; content: string; authorId: number; categoryId: number; groupId?: number; postType?: 'question' | 'discussion' | 'insight' | 'announcement' | 'case_study' | 'draft'; tags?: string[]; youtubeUrl?: string; mediaUrls?: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(discussions).values(data);
  return result;
}

export async function getDiscussionsByCategory(categoryId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const baseQuery = db.select({
    id: discussions.id,
    title: discussions.title,
    slug: discussions.slug,
    content: discussions.content,
    categoryId: discussions.categoryId,
    authorId: discussions.authorId,
    postType: discussions.postType,
    isPinned: discussions.isPinned,
    isLocked: discussions.isLocked,
    viewCount: discussions.viewCount,
    replyCount: discussions.replyCount,
    tags: discussions.tags,
    acceptedPostId: discussions.acceptedPostId,
    createdAt: discussions.createdAt,
    lastReplyAt: discussions.lastReplyAt,
    authorName: users.name,
    authorVerificationStatus: users.verificationStatus,
    categoryName: forumCategories.name,
    youtubeUrl: discussions.youtubeUrl,
  }).from(discussions)
    .leftJoin(users, eq(discussions.authorId, users.id))
    .leftJoin(forumCategories, eq(discussions.categoryId, forumCategories.id));
  // categoryId 0 means "All" — return all discussions across categories
  if (categoryId > 0) {
    baseQuery.where(eq(discussions.categoryId, categoryId));
  }
  return baseQuery
    .orderBy(desc(discussions.isPinned), desc(discussions.lastReplyAt))
    .limit(limit)
    .offset(offset);
}

export async function getDiscussionBySlug(slug: string, requesterIsAdmin = false) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    id: discussions.id,
    title: discussions.title,
    slug: discussions.slug,
    content: discussions.content,
    categoryId: discussions.categoryId,
    authorId: discussions.authorId,
    postType: discussions.postType,
    isPinned: discussions.isPinned,
    isLocked: discussions.isLocked,
    isHidden: discussions.isHidden,
    viewCount: discussions.viewCount,
    replyCount: discussions.replyCount,
    tags: discussions.tags,
    acceptedPostId: discussions.acceptedPostId,
    groupId: discussions.groupId,
    createdAt: discussions.createdAt,
    lastReplyAt: discussions.lastReplyAt,
    authorName: users.name,
    authorVerificationStatus: users.verificationStatus,
    youtubeUrl: discussions.youtubeUrl,
    mediaUrls: discussions.mediaUrls,
  }).from(discussions)
    .leftJoin(users, eq(discussions.authorId, users.id))
    .where(eq(discussions.slug, slug)).limit(1);
  const found = result.length > 0 ? result[0] : null;
  // Hidden discussions are treated as not-found for non-admins — same
  // pattern as secret groups: don't reveal that moderated content exists.
  if (found && found.isHidden && !requesterIsAdmin) return null;
  return found;
}

export async function getDiscussionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(discussions).where(eq(discussions.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateDiscussion(id: number, data: Partial<{ title: string; content: string; categoryId: number; isPinned: boolean; youtubeUrl: string; mediaUrls: string[] }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(discussions).set(data).where(eq(discussions.id, id));
}

export async function deleteDiscussion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related posts first
  await db.delete(forumPosts).where(eq(forumPosts.discussionId, id));
  // Delete the discussion
  return db.delete(discussions).where(eq(discussions.id, id));
}

export async function incrementDiscussionViewCount(discussionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(discussions).set({ viewCount: sql`${discussions.viewCount} + 1` }).where(eq(discussions.id, discussionId));
}

export async function createForumPost(data: { discussionId: number; authorId: number; content: string; parentPostId?: number; mediaUrls?: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(forumPosts).values(data);
  // Update reply count on discussion
  await db.update(discussions).set({ replyCount: sql`${discussions.replyCount} + 1`, lastReplyAt: new Date() }).where(eq(discussions.id, data.discussionId));
  return result;
}

export async function getForumPostsByDiscussion(discussionId: number, requesterIsAdmin = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = requesterIsAdmin
    ? eq(forumPosts.discussionId, discussionId)
    : and(eq(forumPosts.discussionId, discussionId), eq(forumPosts.isHidden, false));
  return db.select({
    id: forumPosts.id,
    discussionId: forumPosts.discussionId,
    authorId: forumPosts.authorId,
    content: forumPosts.content,
    parentPostId: forumPosts.parentPostId,
    mediaUrls: forumPosts.mediaUrls,
    likeCount: forumPosts.likeCount,
    isSolution: forumPosts.isSolution,
    isHidden: forumPosts.isHidden,
    createdAt: forumPosts.createdAt,
    updatedAt: forumPosts.updatedAt,
    authorName: users.name,
    authorVerificationStatus: users.verificationStatus,
  }).from(forumPosts)
    .leftJoin(users, eq(forumPosts.authorId, users.id))
    .where(conditions)
    .orderBy(forumPosts.createdAt);
}

export async function createForumGroup(data: { name: string; slug: string; description?: string; creatorId: number; visibility?: "public" | "private" | "secret" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(forumGroups).values(data);
  return result;
}

export async function getForumGroups(limit = 20, offset = 0, requestingUserId?: number) {
  const db = await getDb();
  if (!db) return [];
  // Secret groups never appear in listings unless the requester is already
  // a member — that's the whole point of "secret" vs "private" (both
  // require approval to join; only secret is also hidden from browsing).
  let memberGroupIds: number[] = [];
  if (requestingUserId) {
    const rows = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, requestingUserId));
    memberGroupIds = rows.map(r => r.groupId);
  }
  const visible = memberGroupIds.length > 0
    ? or(sql`${forumGroups.visibility} != 'secret'`, inArray(forumGroups.id, memberGroupIds))
    : sql`${forumGroups.visibility} != 'secret'`;
  return db.select().from(forumGroups).where(visible).orderBy(desc(forumGroups.createdAt)).limit(limit).offset(offset);
}

export async function joinForumGroup(groupId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [group] = await db.select().from(forumGroups).where(eq(forumGroups.id, groupId)).limit(1);
  if (!group) throw new Error("Group not found");
  if (group.visibility !== "public") {
    // Private and secret groups both require approval — don't add
    // membership yet. Requesting twice while a request is still pending is
    // a no-op rather than an error, so a member re-clicking "Join" doesn't
    // see a scary failure.
    const [existing] = await db.select().from(groupJoinRequests)
      .where(and(eq(groupJoinRequests.groupId, groupId), eq(groupJoinRequests.userId, userId), eq(groupJoinRequests.status, "pending")))
      .limit(1);
    if (existing) return { requiresApproval: true, alreadyRequested: true };
    await db.insert(groupJoinRequests).values({ groupId, userId, status: "pending" });
    return { requiresApproval: true, alreadyRequested: false };
  }
  await db.insert(groupMembers).values({ groupId, userId, role: 'member' });
  await db.update(forumGroups).set({ memberCount: sql`${forumGroups.memberCount} + 1` }).where(eq(forumGroups.id, groupId));
  return { requiresApproval: false, alreadyRequested: false };
}

// ─── Group Join Requests ─────────────────────────────────────────────
export async function getPendingGroupJoinRequests(groupId: number, requesterId: number) {
  const db = await getDb();
  if (!db) return [];
  await assertGroupAdminOrModerator(db, groupId, requesterId);
  return db.select({
    request: groupJoinRequests,
    user: { id: users.id, name: users.name, email: users.email },
  }).from(groupJoinRequests)
    .innerJoin(users, eq(groupJoinRequests.userId, users.id))
    .where(and(eq(groupJoinRequests.groupId, groupId), eq(groupJoinRequests.status, "pending")))
    .orderBy(desc(groupJoinRequests.createdAt));
}

async function assertGroupAdminOrModerator(db: any, groupId: number, userId: number) {
  const [membership] = await db.select().from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership || (membership.role !== "admin" && membership.role !== "moderator")) {
    throw new Error("Not authorized — must be a group admin or moderator");
  }
}

export async function respondToGroupJoinRequest(requestId: number, responderId: number, approve: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [request] = await db.select().from(groupJoinRequests).where(eq(groupJoinRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") throw new Error("Request already handled");
  await assertGroupAdminOrModerator(db, request.groupId, responderId);
  await db.update(groupJoinRequests)
    .set({ status: approve ? "approved" : "rejected", respondedBy: responderId, respondedAt: new Date() })
    .where(eq(groupJoinRequests.id, requestId));
  if (approve) {
    await db.insert(groupMembers).values({ groupId: request.groupId, userId: request.userId, role: 'member' });
    await db.update(forumGroups).set({ memberCount: sql`${forumGroups.memberCount} + 1` }).where(eq(forumGroups.id, request.groupId));
  }
  return { success: true };
}

export async function updateGroupImages(groupId: number, requesterId: number, opts: { avatarUrl?: string; coverImageUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertGroupAdminOrModerator(db, groupId, requesterId);
  await db.update(forumGroups).set(opts).where(eq(forumGroups.id, groupId));
}

// ─── Activity Reactions ──────────────────────────────────────────────
export async function toggleActivityReaction(activityId: number, userId: number, reactionType: "favorite" = "favorite") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db.select().from(activityReactions)
    .where(and(eq(activityReactions.activityId, activityId), eq(activityReactions.userId, userId), eq(activityReactions.reactionType, reactionType)))
    .limit(1);
  if (existing) {
    await db.delete(activityReactions).where(eq(activityReactions.id, existing.id));
    return { reacted: false };
  }
  await db.insert(activityReactions).values({ activityId, userId, reactionType });
  return { reacted: true };
}

export async function getActivityReactionCounts(activityIds: number[]) {
  const db = await getDb();
  if (!db || activityIds.length === 0) return [];
  return db.select({
    activityId: activityReactions.activityId,
    count: count(),
  }).from(activityReactions)
    .where(inArray(activityReactions.activityId, activityIds))
    .groupBy(activityReactions.activityId);
}

// ─── Connection (Friend) Requests ────────────────────────────────────
// NOTE: this is a NEW mutual-consent layer alongside the existing
// memberFollows (one-way follow) table — it does not replace it. Following
// stays one-way and unchanged (used e.g. for "follow this space/tag/event");
// a "connection" is now its own concept requiring both sides to accept.
export async function sendConnectionRequest(requesterId: number, recipientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (requesterId === recipientId) throw new Error("Cannot connect with yourself");
  const [existing] = await db.select().from(connectionRequests)
    .where(or(
      and(eq(connectionRequests.requesterId, requesterId), eq(connectionRequests.recipientId, recipientId)),
      and(eq(connectionRequests.requesterId, recipientId), eq(connectionRequests.recipientId, requesterId)),
    ))
    .limit(1);
  if (existing) {
    if (existing.status === "declined") {
      // allow re-requesting after a prior decline
      await db.update(connectionRequests).set({ status: "pending", requesterId, recipientId, respondedAt: null }).where(eq(connectionRequests.id, existing.id));
      return { success: true };
    }
    return { success: true, alreadyExists: true, status: existing.status };
  }
  await db.insert(connectionRequests).values({ requesterId, recipientId, status: "pending" });
  return { success: true };
}

export async function respondToConnectionRequest(requestId: number, userId: number, accept: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [request] = await db.select().from(connectionRequests).where(eq(connectionRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Request not found");
  if (request.recipientId !== userId) throw new Error("Not authorized to respond to this request");
  if (request.status !== "pending") throw new Error("Request already handled");
  await db.update(connectionRequests)
    .set({ status: accept ? "accepted" : "declined", respondedAt: new Date() })
    .where(eq(connectionRequests.id, requestId));
  return { success: true };
}

export async function getPendingConnectionRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    request: connectionRequests,
    requester: { id: users.id, name: users.name, email: users.email },
  }).from(connectionRequests)
    .innerJoin(users, eq(connectionRequests.requesterId, users.id))
    .where(and(eq(connectionRequests.recipientId, userId), eq(connectionRequests.status, "pending")))
    .orderBy(desc(connectionRequests.createdAt));
}

export async function getMutualConnections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(connectionRequests)
    .where(and(
      or(eq(connectionRequests.requesterId, userId), eq(connectionRequests.recipientId, userId)),
      eq(connectionRequests.status, "accepted"),
    ))
    .orderBy(desc(connectionRequests.respondedAt));
  if (rows.length === 0) return [];
  const otherUserIds = rows.map(r => r.requesterId === userId ? r.recipientId : r.requesterId);
  const otherUsers = await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users).where(inArray(users.id, otherUserIds));
  const byId = new Map(otherUsers.map(u => [u.id, u]));
  return rows
    .map(r => ({ request: r, otherUser: byId.get(r.requesterId === userId ? r.recipientId : r.requesterId) }))
    .filter(r => r.otherUser);
}

// ─── Document Library ────────────────────────────────────────────────
// A club/group admin check, reused from the group join-request work — any
// group admin/moderator can manage that group's folders/documents.
// Club-wide (groupId null) folders/documents are admin-only (site role).
async function assertCanManageDocuments(db: any, requesterRole: "user" | "admin", groupId: number | null | undefined, requesterId: number) {
  if (groupId == null) {
    if (requesterRole !== "admin") throw new Error("Not authorized — club-wide documents are admin-managed");
    return;
  }
  await assertGroupAdminOrModerator(db, groupId, requesterId);
}

export async function createDocumentFolder(data: { groupId?: number; parentFolderId?: number; name: string; createdBy: number; requesterRole: "user" | "admin" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertCanManageDocuments(db, data.requesterRole, data.groupId, data.createdBy);
  const result = await db.insert(documentFolders).values({ groupId: data.groupId, parentFolderId: data.parentFolderId, name: data.name, createdBy: data.createdBy });
  return result;
}

export async function listDocumentFolders(opts: { groupId?: number; parentFolderId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [] as any[];
  conditions.push(opts.groupId != null ? eq(documentFolders.groupId, opts.groupId) : sql`${documentFolders.groupId} IS NULL`);
  conditions.push(opts.parentFolderId != null ? eq(documentFolders.parentFolderId, opts.parentFolderId) : sql`${documentFolders.parentFolderId} IS NULL`);
  return db.select().from(documentFolders).where(and(...conditions)).orderBy(documentFolders.name);
}

export async function createDocument(data: {
  folderId?: number; groupId?: number; title: string; description?: string;
  fileKey: string; url: string; mimeType: string; sizeBytes: number; uploadedBy: number; requesterRole: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertCanManageDocuments(db, data.requesterRole, data.groupId, data.uploadedBy);
  const result = await db.insert(documents).values(data);
  return result;
}

export async function listDocuments(opts: { groupId?: number; folderId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [] as any[];
  conditions.push(opts.groupId != null ? eq(documents.groupId, opts.groupId) : sql`${documents.groupId} IS NULL`);
  conditions.push(opts.folderId != null ? eq(documents.folderId, opts.folderId) : sql`${documents.folderId} IS NULL`);
  return db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.createdAt));
}

export async function deleteDocument(documentId: number, requesterId: number, requesterRole: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc) throw new Error("Document not found");
  await assertCanManageDocuments(db, requesterRole, doc.groupId, requesterId);
  await db.delete(documents).where(eq(documents.id, documentId));
  return { success: true };
}

// ─── Moderation: Content Reports ─────────────────────────────────────
// General-purpose flag/hide for ordinary discussion posts and replies.
// Separate from the existing contentNodes admin-approval workflow, which
// only covers knowledge-base articles.
export async function reportContent(data: { targetType: "discussion" | "post"; targetId: number; reportedBy: number; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentReports).values(data);
  return result;
}

export async function getPendingReports() {
  const db = await getDb();
  if (!db) return [];
  const reports = await db.select({
    report: contentReports,
    reporter: { id: users.id, name: users.name, email: users.email },
  }).from(contentReports)
    .innerJoin(users, eq(contentReports.reportedBy, users.id))
    .where(eq(contentReports.status, "pending"))
    .orderBy(desc(contentReports.createdAt));

  // Attach a snippet of the actual reported content, and its author, so
  // an admin doesn't have to leave the moderation queue to see what was
  // flagged. Reported content that's since been deleted shows as null.
  const withContent = await Promise.all(reports.map(async (r) => {
    if (r.report.targetType === "discussion") {
      const [d] = await db.select({ id: discussions.id, title: discussions.title, content: discussions.content, authorId: discussions.authorId, isHidden: discussions.isHidden, slug: discussions.slug })
        .from(discussions).where(eq(discussions.id, r.report.targetId)).limit(1);
      return { ...r, content: d ?? null };
    } else {
      const [p] = await db.select({ id: forumPosts.id, content: forumPosts.content, authorId: forumPosts.authorId, isHidden: forumPosts.isHidden, discussionId: forumPosts.discussionId })
        .from(forumPosts).where(eq(forumPosts.id, r.report.targetId)).limit(1);
      return { ...r, content: p ?? null };
    }
  }));
  return withContent;
}

export async function resolveReport(reportId: number, reviewerId: number, action: "dismiss" | "hide", reviewNotes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [report] = await db.select().from(contentReports).where(eq(contentReports.id, reportId)).limit(1);
  if (!report) throw new Error("Report not found");
  if (report.status !== "pending") throw new Error("Report already resolved");
  await db.update(contentReports)
    .set({ status: action === "hide" ? "actioned" : "dismissed", reviewedBy: reviewerId, reviewNotes, reviewedAt: new Date() })
    .where(eq(contentReports.id, reportId));
  if (action === "hide") {
    if (report.targetType === "discussion") {
      await db.update(discussions).set({ isHidden: true }).where(eq(discussions.id, report.targetId));
    } else {
      await db.update(forumPosts).set({ isHidden: true }).where(eq(forumPosts.id, report.targetId));
    }
  }
  return { success: true };
}

export async function setContentHidden(targetType: "discussion" | "post", targetId: number, isHidden: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (targetType === "discussion") {
    await db.update(discussions).set({ isHidden }).where(eq(discussions.id, targetId));
  } else {
    await db.update(forumPosts).set({ isHidden }).where(eq(forumPosts.id, targetId));
  }
  return { success: true };
}

// ─── Moderation: Member Suspension ───────────────────────────────────
export async function suspendUser(userId: number, reason: string, suspendedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ suspendedAt: new Date(), suspensionReason: reason, suspendedBy }).where(eq(users.id, userId));
  return { success: true };
}

export async function unsuspendUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ suspendedAt: null, suspensionReason: null, suspendedBy: null }).where(eq(users.id, userId));
  return { success: true };
}

// Call at the top of any mutation that a suspended member shouldn't be able
// to perform. NOTE: only wired into createDiscussion/createPost so far —
// not a full sweep across every write path (creating groups, uploading
// documents, RSVPing to events, etc. are NOT yet suspension-gated). Extend
// call-by-call as needed, same pattern as here.
export function assertNotSuspended(user: { suspendedAt?: Date | string | null }) {
  if (user.suspendedAt) {
    throw new Error("Your account is currently suspended and can't post. Contact an admin if you believe this is a mistake.");
  }
}

// ─── Custom Profile Fields ───────────────────────────────────────────
export async function listProfileFieldDefinitions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profileFieldDefinitions).orderBy(profileFieldDefinitions.sortOrder);
}

export async function createProfileFieldDefinition(data: { fieldKey: string; label: string; fieldType: "text" | "textarea" | "select" | "url" | "date" | "number"; options?: string[]; isRequired?: boolean; sortOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(profileFieldDefinitions).values(data);
  return result;
}

export async function updateProfileFieldDefinition(id: number, data: Partial<{ label: string; fieldType: "text" | "textarea" | "select" | "url" | "date" | "number"; options: string[]; isRequired: boolean; sortOrder: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(profileFieldDefinitions).set(data).where(eq(profileFieldDefinitions.id, id));
  return { success: true };
}

export async function deleteProfileFieldDefinition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Remove any stored values for this field too, or they'd be orphaned
  // pointing at a fieldDefinitionId that no longer exists.
  await db.delete(profileFieldValues).where(eq(profileFieldValues.fieldDefinitionId, id));
  await db.delete(profileFieldDefinitions).where(eq(profileFieldDefinitions.id, id));
  return { success: true };
}

export async function getProfileFieldValues(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    value: profileFieldValues,
    definition: profileFieldDefinitions,
  }).from(profileFieldValues)
    .innerJoin(profileFieldDefinitions, eq(profileFieldValues.fieldDefinitionId, profileFieldDefinitions.id))
    .where(eq(profileFieldValues.userId, userId))
    .orderBy(profileFieldDefinitions.sortOrder);
}

export async function setProfileFieldValue(userId: number, fieldDefinitionId: number, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db.select().from(profileFieldValues)
    .where(and(eq(profileFieldValues.userId, userId), eq(profileFieldValues.fieldDefinitionId, fieldDefinitionId)))
    .limit(1);
  if (existing) {
    await db.update(profileFieldValues).set({ value }).where(eq(profileFieldValues.id, existing.id));
  } else {
    await db.insert(profileFieldValues).values({ userId, fieldDefinitionId, value });
  }
  return { success: true };
}


export async function getGroupMembers(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
}

export async function sendDirectMessage(data: { senderId: number; recipientId: number; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(directMessages).values(data);
}

export async function getDirectMessageConversation(userId1: number, userId2: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(directMessages)
    .where(or(
      and(eq(directMessages.senderId, userId1), eq(directMessages.recipientId, userId2)),
      and(eq(directMessages.senderId, userId2), eq(directMessages.recipientId, userId1))
    ))
    .orderBy(desc(directMessages.createdAt))
    .limit(limit);
}

export async function createForumNotification(data: { userId: number; type: 'reply' | 'mention' | 'message' | 'group_invite' | 'verification'; relatedUserId?: number; discussionId?: number; postId?: number; groupId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(forumNotifications).values(data);
}

export async function getUserNotifications(userId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const whereConditions = [eq(forumNotifications.userId, userId)];
  if (unreadOnly) {
    whereConditions.push(eq(forumNotifications.isRead, false));
  }
  return db.select().from(forumNotifications)
    .where(and(...whereConditions))
    .orderBy(desc(forumNotifications.createdAt));
}

export async function markNotificationAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(forumNotifications)
    .set({ isRead: true })
    .where(and(eq(forumNotifications.id, notificationId), eq(forumNotifications.userId, userId)));
}

export async function getOrCreateUserProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(userProfiles).values({ userId });
  const created = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return created[0] || { id: 0, userId, bio: null, company: null, jobTitle: null, location: null, website: null, discussionCount: 0, postCount: 0, followerCount: 0, followingCount: 0 };
}

export async function updateUserForumProfile(userId: number, data: Partial<{ bio: string; company: string; jobTitle: string; location: string; website: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
}

export async function getRecentForumActivity(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const recentDiscussions = await db.select().from(discussions).orderBy(desc(discussions.createdAt)).limit(limit);
  return recentDiscussions;
}


// ─── Social Features (Follow System) ──────────────────────────────────
export async function followMember(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already following
  const existing = await db.select().from(memberFollows)
    .where(and(eq(memberFollows.followerId, followerId), eq(memberFollows.followingId, followingId)))
    .limit(1);
  
  if (existing.length > 0) return existing[0];
  
  await db.insert(memberFollows).values({ followerId, followingId });
  
  // Increment following count for follower
  await db.update(userProfiles)
    .set({ followingCount: sql`followingCount + 1` })
    .where(eq(userProfiles.userId, followerId));
  
  // Increment follower count for followed user
  await db.update(userProfiles)
    .set({ followerCount: sql`followerCount + 1` })
    .where(eq(userProfiles.userId, followingId));
  
  // Log activity
  await db.insert(activityLog).values({
    userId: followerId,
    activityType: 'member_followed',
    relatedUserId: followingId,
  });
}

export async function unfollowMember(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(memberFollows)
    .where(and(eq(memberFollows.followerId, followerId), eq(memberFollows.followingId, followingId)));
  
  // Decrement counts
  await db.update(userProfiles)
    .set({ followingCount: sql`GREATEST(followingCount - 1, 0)` })
    .where(eq(userProfiles.userId, followerId));
  
  await db.update(userProfiles)
    .set({ followerCount: sql`GREATEST(followerCount - 1, 0)` })
    .where(eq(userProfiles.userId, followingId));
}

export async function isMemberFollowing(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(memberFollows)
    .where(and(eq(memberFollows.followerId, followerId), eq(memberFollows.followingId, followingId)))
    .limit(1);
  
  return result.length > 0;
}

export async function getFollowers(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(memberFollows)
    .where(eq(memberFollows.followingId, userId))
    .limit(limit)
    .offset(offset);
}

export async function getFollowing(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(memberFollows)
    .where(eq(memberFollows.followerId, userId))
    .limit(limit)
    .offset(offset);
}

// ─── Gamification (Badges & Points) ──────────────────────────────────
export async function awardBadge(userId: number, badgeType: string, title: string, description?: string, icon?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user already has this badge
  const existing = await db.select().from(memberBadges)
    .where(and(eq(memberBadges.userId, userId), eq(memberBadges.badgeType, badgeType as any)))
    .limit(1);
  
  if (existing.length > 0) return existing[0];
  
  await db.insert(memberBadges).values({
    userId,
    badgeType: badgeType as any,
    title,
    description,
    icon,
  });
  
  // Log activity
  await db.insert(activityLog).values({
    userId,
    activityType: 'badge_earned' as any,
    description: `Earned ${title} badge`,
  });
}

export async function getUserBadges(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(memberBadges)
    .where(eq(memberBadges.userId, userId))
    .orderBy(desc(memberBadges.earnedAt));
}

export async function addPoints(userId: number, points: number, reason: string, activityType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(pointsTransactions).values({
    userId,
    points,
    reason,
    activityType,
  });
  
  // Update user reputation score
  await db.update(users)
    .set({ reputationScore: sql`reputationScore + ${points}` })
    .where(eq(users.id, userId));
}

export async function getUserPoints(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ total: sql`SUM(points)` })
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId));
  
  return (result[0]?.total as number) || 0;
}

export async function getLeaderboard(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: users.id,
    name: users.name,
    reputationScore: users.reputationScore,
  })
    .from(users)
    .orderBy(desc(users.reputationScore))
    .limit(limit)
    .offset(offset);
}

// ─── Activity Logging ────────────────────────────────────────────────
export async function logActivity(userId: number, activityType: string, relatedUserId?: number, discussionId?: number, groupId?: number, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(activityLog).values({
    userId,
    activityType: activityType as any,
    relatedUserId,
    discussionId,
    groupId,
    description,
  });
}

export async function getActivityFeed(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserActivityFeed(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .offset(offset);
}

// ─── Group Announcements ─────────────────────────────────────────────
export async function createGroupAnnouncement(groupId: number, authorId: number, title: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(groupAnnouncements).values({
    groupId,
    authorId,
    title,
    content,
  });
  
  return result;
}

export async function getGroupAnnouncements(groupId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(groupAnnouncements)
    .where(eq(groupAnnouncements.groupId, groupId))
    .orderBy(desc(groupAnnouncements.isPinned), desc(groupAnnouncements.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function pinAnnouncement(announcementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(groupAnnouncements)
    .set({ isPinned: true })
    .where(eq(groupAnnouncements.id, announcementId));
}

export async function unpinAnnouncement(announcementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(groupAnnouncements)
    .set({ isPinned: false })
    .where(eq(groupAnnouncements.id, announcementId));
}

// ─── Member Directory ────────────────────────────────────────────────
export async function searchMembers(query: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: users.id,
    name: users.name,
    platformRole: users.platformRole,
    reputationScore: users.reputationScore,
    verificationStatus: users.verificationStatus,
  })
    .from(users)
    .where(or(
      like(users.name, `%${query}%`),
      like(users.email, `%${query}%`),
      like(users.organization, `%${query}%`)
    ))
    .limit(limit)
    .offset(offset);
}

export async function getMembersByRole(platformRole: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: users.id,
    name: users.name,
    platformRole: users.platformRole,
    reputationScore: users.reputationScore,
    verificationStatus: users.verificationStatus,
  })
    .from(users)
    .where(eq(users.platformRole, platformRole as any))
    .orderBy(desc(users.reputationScore))
    .limit(limit)
    .offset(offset);
}

export async function getTrendingMembers(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: users.id,
    name: users.name,
    platformRole: users.platformRole,
    reputationScore: users.reputationScore,
    verificationStatus: users.verificationStatus,
  })
    .from(users)
    .orderBy(desc(users.reputationScore))
    .limit(limit);
}

// ─── Blog ────────────────────────────────────────────────────────────
export async function createBlogPost(data: {
  title: string; slug: string; content: string; excerpt?: string;
  coverImageUrl?: string; authorId: number; status: "draft" | "published";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(blogPosts).values({
    ...data,
    publishedAt: data.status === "published" ? new Date() : undefined,
  });
  return { id: (result as any).insertId, ...data };
}

export async function listBlogPosts(status?: "draft" | "published", limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const conditions = status ? [eq(blogPosts.status, status)] : [];
  return db.select({
    id: blogPosts.id,
    title: blogPosts.title,
    slug: blogPosts.slug,
    excerpt: blogPosts.excerpt,
    coverImageUrl: blogPosts.coverImageUrl,
    status: blogPosts.status,
    publishedAt: blogPosts.publishedAt,
    createdAt: blogPosts.createdAt,
    authorId: blogPosts.authorId,
    authorName: users.name,
  })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(blogPosts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const [post] = await db.select({
    id: blogPosts.id,
    title: blogPosts.title,
    slug: blogPosts.slug,
    content: blogPosts.content,
    excerpt: blogPosts.excerpt,
    coverImageUrl: blogPosts.coverImageUrl,
    status: blogPosts.status,
    publishedAt: blogPosts.publishedAt,
    createdAt: blogPosts.createdAt,
    updatedAt: blogPosts.updatedAt,
    authorId: blogPosts.authorId,
    authorName: users.name,
  })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.slug, slug));
  return post || null;
}

export async function getBlogPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return post || null;
}

export async function updateBlogPost(id: number, data: {
  title?: string; content?: string; excerpt?: string;
  coverImageUrl?: string; status?: "draft" | "published";
}) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { ...data };
  if (data.status === "published") updateData.publishedAt = new Date();
  await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, id));
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

// ─── Events ──────────────────────────────────────────────────────────
export async function listEvents(limit = 20, offset = 0, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(events).orderBy(desc(events.startDate)).limit(limit).offset(offset);
  return q;
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createEvent(data: {
  title: string; description?: string; startDate: Date; endDate?: Date;
  location?: string; isVirtual?: boolean; meetingUrl?: string; coverImageUrl?: string;
  organizerId: number; maxAttendees?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(events).values({
    title: data.title,
    description: data.description ?? null,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    location: data.location ?? null,
    isVirtual: data.isVirtual ?? false,
    meetingUrl: data.meetingUrl ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
    organizerId: data.organizerId,
    maxAttendees: data.maxAttendees ?? null,
    status: "upcoming",
  });
  return result;
}

export async function updateEvent(id: number, data: Partial<{
  title: string; description: string; startDate: Date; endDate: Date;
  location: string; isVirtual: boolean; meetingUrl: string; coverImageUrl: string;
  maxAttendees: number; status: "upcoming" | "ongoing" | "completed" | "cancelled";
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(events).set(data as any).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(events).where(eq(events.id, id));
}

export async function rsvpEvent(eventId: number, userId: number, status: "going" | "maybe" | "not_going") {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId))).limit(1);
  if (existing.length > 0) {
    await db.update(eventRsvps).set({ status }).where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId)));
  } else {
    await db.insert(eventRsvps).values({ eventId, userId, status });
  }
}

export async function getEventRsvps(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventRsvps).where(eq(eventRsvps.eventId, eventId));
}

export async function getUserRsvp(eventId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function getEventAttendeeCount(eventId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select().from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "going")));
  return rows.length;
}

// ─── Group helpers (by slug) ─────────────────────────────────────────
export async function getForumGroupBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(forumGroups).where(eq(forumGroups.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getDiscussionsByGroup(groupId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(discussions)
    .where(eq(discussions.groupId, groupId))
    .orderBy(desc(discussions.createdAt))
    .limit(limit).offset(offset);
}

// ─── Courses ─────────────────────────────────────────────────────────
export async function listCourses(status?: string, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(courses);
  if (status) return query.where(eq(courses.status, status as any)).orderBy(asc(courses.displayOrder), desc(courses.createdAt)).limit(limit).offset(offset);
  return query.orderBy(asc(courses.displayOrder), desc(courses.createdAt)).limit(limit).offset(offset);
}

export async function updateCourseFields(courseId: number, fields: {
  title?: string;
  slug?: string;
  description?: string;
  excerpt?: string;
  level?: "beginner" | "intermediate" | "advanced";
  category?: string | null;
  status?: "draft" | "published" | "coming_soon";
  isFree?: boolean;
  duration?: string | null;
  lessonCount?: number;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const update: Record<string, unknown> = {};
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.slug !== undefined) update.slug = fields.slug;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.excerpt !== undefined) update.excerpt = fields.excerpt;
  if (fields.level !== undefined) update.level = fields.level;
  if (fields.category !== undefined) update.category = fields.category;
  if (fields.status !== undefined) update.status = fields.status;
  if (fields.isFree !== undefined) update.isFree = fields.isFree;
  if (fields.duration !== undefined) update.duration = fields.duration;
  if (fields.lessonCount !== undefined) update.lessonCount = fields.lessonCount;
  if (fields.displayOrder !== undefined) update.displayOrder = fields.displayOrder;
  if (Object.keys(update).length === 0) return;
  await db.update(courses).set(update).where(eq(courses.id, courseId));
}

export async function reorderCourses(courseIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  for (let i = 0; i < courseIds.length; i++) {
    await db.update(courses)
      .set({ displayOrder: i })
      .where(eq(courses.id, courseIds[i]));
  }
}

export async function getCourseBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function createCourse(data: {
  title: string; slug: string; description?: string; excerpt?: string;
  coverImageUrl?: string; authorId: number; level?: string; category?: string;
  duration?: string; lessonCount?: number; isFree?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(courses).values(data as any);
}

export async function enrollInCourse(courseId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if already enrolled
  const existing = await db.select().from(courseEnrollments)
    .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId))).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(courseEnrollments).values({ courseId, userId });
  await db.update(courses).set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` }).where(eq(courses.id, courseId));
  return { courseId, userId };
}

export async function getUserEnrollments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    enrollment: courseEnrollments,
    course: courses,
  }).from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(eq(courseEnrollments.userId, userId))
    .orderBy(desc(courseEnrollments.enrolledAt));
}

export async function updateCourseProgress(courseId: number, userId: number, progress: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(courseEnrollments)
    .set({ progress, ...(progress >= 100 ? { completedAt: new Date() } : {}) })
    .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)));
}

// ─── Lessons ─────────────────────────────────────────────────────────
// Visibility note: lessons are visible to learners whenever the course
// itself is published. The per-lesson `isPublished` column is retained
// for back-compat / future use but is not used as a runtime gate.
export async function listPublishedLessonsByCourse(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.displayOrder), asc(lessons.id));
}

export async function listAllLessonsByCourse(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.displayOrder), asc(lessons.id));
}

export async function getLessonById(lessonId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  return rows[0] ?? null;
}

export async function getLessonByCourseAndSlug(courseSlug: string, lessonSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const courseRows = await db.select().from(courses).where(eq(courses.slug, courseSlug)).limit(1);
  const course = courseRows[0];
  if (!course) return null;
  const lessonRows = await db.select().from(lessons)
    .where(and(eq(lessons.courseId, course.id), eq(lessons.slug, lessonSlug)))
    .limit(1);
  const lesson = lessonRows[0];
  if (!lesson) return null;
  const siblings = await db.select().from(lessons)
    .where(eq(lessons.courseId, course.id))
    .orderBy(asc(lessons.displayOrder), asc(lessons.id));
  return { lesson, course, siblings };
}

export async function getLessonProgressForUser(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    lessonId: lessonProgress.lessonId,
    watchedSeconds: lessonProgress.watchedSeconds,
    completedAt: lessonProgress.completedAt,
  }).from(lessonProgress)
    .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
    .where(and(eq(lessons.courseId, courseId), eq(lessonProgress.userId, userId)));
}

export async function upsertLessonProgress(userId: number, lessonId: number, watchedSeconds: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(lessonProgress).values({ userId, lessonId, watchedSeconds });
    return;
  }
  if (watchedSeconds > (existing[0].watchedSeconds ?? 0)) {
    await db.update(lessonProgress)
      .set({ watchedSeconds })
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
  }
}

export async function markLessonComplete(userId: number, lessonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(lessonProgress).values({ userId, lessonId, watchedSeconds: 0, completedAt: new Date() });
    return;
  }
  if (existing[0].completedAt) return; // idempotent
  await db.update(lessonProgress)
    .set({ completedAt: new Date() })
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
}

export async function recalcCourseProgress(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return;
  const publishedRows = await db.select({ id: lessons.id }).from(lessons)
    .where(eq(lessons.courseId, courseId));
  const total = publishedRows.length;
  if (total === 0) return; // course has no lessons → leave progress untouched
  const publishedIds = publishedRows.map(r => r.id);
  const completedRows = await db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress)
    .where(and(
      eq(lessonProgress.userId, userId),
      inArray(lessonProgress.lessonId, publishedIds),
      sql`${lessonProgress.completedAt} IS NOT NULL`,
    ));
  const completed = completedRows.length;
  const progress = Math.round((completed / total) * 100);
  // Per-lesson quiz model: each lesson is "complete" only after its quiz
  // passes (see submitQuizAttempt for lesson-scoped quizzes). So progress
  // = 100% inherently means all per-lesson quizzes were passed, which is
  // the course-complete condition. Set completedAt accordingly.
  await db.update(courseEnrollments)
    .set({ progress, completedAt: progress >= 100 ? new Date() : null })
    .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)));
}

export async function getNextIncompleteLesson(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return { nextLesson: null, totalLessons: 0 };
  const published = await db.select().from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.displayOrder), asc(lessons.id));
  if (published.length === 0) return { nextLesson: null, totalLessons: 0 };
  const completedRows = await db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress)
    .where(and(
      eq(lessonProgress.userId, userId),
      inArray(lessonProgress.lessonId, published.map(l => l.id)),
      sql`${lessonProgress.completedAt} IS NOT NULL`,
    ));
  const completedSet = new Set(completedRows.map(r => r.lessonId));
  const next = published.find(l => !completedSet.has(l.id));
  return {
    nextLesson: next ? { id: next.id, slug: next.slug, title: next.title } : null,
    totalLessons: published.length,
  };
}

export async function createLesson(data: {
  courseId: number;
  title: string;
  slug: string;
  description?: string;
  videoSource?: "cloudflare_stream" | "r2" | "youtube" | "none";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [maxRow] = await db.select({ max: sql<number | null>`MAX(${lessons.displayOrder})` })
    .from(lessons).where(eq(lessons.courseId, data.courseId));
  const displayOrder = (maxRow?.max ?? -1) + 1;
  const result = await db.insert(lessons).values({
    courseId: data.courseId,
    title: data.title,
    slug: data.slug,
    description: data.description,
    videoSource: data.videoSource ?? "cloudflare_stream",
    displayOrder,
    // Lesson visibility is now controlled by course.status; default to true
    // so the per-lesson flag never trips up admins authoring a published course.
    isPublished: true,
  });
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: Number(insertId) };
}

export async function updateLesson(lessonId: number, fields: {
  title?: string;
  slug?: string;
  description?: string;
  supplementMarkdown?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const update: Record<string, unknown> = {};
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.slug !== undefined) update.slug = fields.slug;
  if (fields.description !== undefined) update.description = fields.description;
  if (fields.supplementMarkdown !== undefined) update.supplementMarkdown = fields.supplementMarkdown;
  if (Object.keys(update).length === 0) return;
  await db.update(lessons).set(update).where(eq(lessons.id, lessonId));
}

export async function deleteLesson(lessonId: number): Promise<{ streamVideoId: string | null }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({ streamVideoId: lessons.streamVideoId }).from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  const streamVideoId = rows[0]?.streamVideoId ?? null;
  await db.delete(lessonProgress).where(eq(lessonProgress.lessonId, lessonId));
  await db.delete(lessons).where(eq(lessons.id, lessonId));
  return { streamVideoId };
}

export async function reorderLessons(courseId: number, lessonIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < lessonIds.length; i++) {
    await db.update(lessons)
      .set({ displayOrder: i })
      .where(and(eq(lessons.id, lessonIds[i]), eq(lessons.courseId, courseId)));
  }
}

export async function setLessonStreamVideoId(lessonId: number, streamVideoId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(lessons).set({ streamVideoId, videoSource: "cloudflare_stream" }).where(eq(lessons.id, lessonId));
}

export async function setLessonReadyMetadata(lessonId: number, meta: { duration: number; thumbnail: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(lessons)
    .set({ videoDurationSeconds: Math.round(meta.duration), thumbnailUrl: meta.thumbnail || null })
    .where(eq(lessons.id, lessonId));
}

export async function importLessons(input: {
  courseId: number;
  rows: Array<{
    title: string;
    slug: string;
    description?: string;
    supplementMarkdown?: string;
    isPublished?: boolean;
    displayOrder?: number;
  }>;
}): Promise<{ imported: number; skipped: { row: number; slug: string; reason: string }[] }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // Snapshot the existing slugs once so we can detect both duplicates-within-csv
  // and conflicts against rows already in the DB.
  const existing = await db.select({ slug: lessons.slug }).from(lessons);
  const usedSlugs = new Set(existing.map(r => r.slug));
  const seenInBatch = new Set<string>();
  const skipped: { row: number; slug: string; reason: string }[] = [];

  // Compute starting displayOrder if rows don't provide one.
  const [maxRow] = await db.select({ max: sql<number | null>`MAX(${lessons.displayOrder})` })
    .from(lessons).where(eq(lessons.courseId, input.courseId));
  let nextOrder = (maxRow?.max ?? -1) + 1;

  let imported = 0;
  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    if (!r.title.trim()) {
      skipped.push({ row: i + 1, slug: r.slug, reason: "empty title" });
      continue;
    }
    if (!r.slug.trim()) {
      skipped.push({ row: i + 1, slug: r.slug, reason: "empty slug" });
      continue;
    }
    if (usedSlugs.has(r.slug) || seenInBatch.has(r.slug)) {
      skipped.push({ row: i + 1, slug: r.slug, reason: "slug already exists" });
      continue;
    }
    seenInBatch.add(r.slug);
    const displayOrder = r.displayOrder ?? nextOrder++;
    await db.insert(lessons).values({
      courseId: input.courseId,
      title: r.title,
      slug: r.slug,
      description: r.description,
      supplementMarkdown: r.supplementMarkdown,
      // Per-lesson isPublished is no longer used as a runtime gate; default to
      // true so admins don't have to chase a second toggle after creating.
      isPublished: r.isPublished ?? true,
      displayOrder,
      videoSource: "cloudflare_stream",
    });
    imported++;
  }

  return { imported, skipped };
}

export async function publishLesson(lessonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(lessons).set({ isPublished: true }).where(eq(lessons.id, lessonId));
}

export async function unpublishLesson(lessonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(lessons).set({ isPublished: false }).where(eq(lessons.id, lessonId));
}

// ─── Connections (Follow/Unfollow) ───────────────────────────────────
export async function getUserConnections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Return people the user follows WITH their user info
  return db.select({
    follow: memberFollows,
    user: { id: users.id, name: users.name, email: users.email, role: users.role },
  }).from(memberFollows)
    .innerJoin(users, eq(memberFollows.followingId, users.id))
    .where(eq(memberFollows.followerId, userId))
    .orderBy(desc(memberFollows.createdAt));
}

export async function getUserFollowers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    follow: memberFollows,
    user: { id: users.id, name: users.name, email: users.email, role: users.role },
  }).from(memberFollows)
    .innerJoin(users, eq(memberFollows.followerId, users.id))
    .where(eq(memberFollows.followingId, userId))
    .orderBy(desc(memberFollows.createdAt));
}

// ─── My Groups (personal joined groups) ─────────────────────────────
export async function getUserGroups(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    membership: groupMembers,
    group: forumGroups,
  }).from(groupMembers)
    .innerJoin(forumGroups, eq(groupMembers.groupId, forumGroups.id))
    .where(eq(groupMembers.userId, userId))
    .orderBy(desc(groupMembers.joinedAt));
}

// ─── Global Search ───────────────────────────────────────────────────
export async function globalSearch(query: string, limit = 20) {
  const db = await getDb();
  if (!db) return { members: [], discussions: [], knowledge: [], blog: [] };
  const q = `%${query}%`;
  const [memberResults, discussionResults, knowledgeResults, blogResults] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users).where(or(like(users.name, q), like(users.email, q))).limit(limit),
    db.select({ id: discussions.id, title: discussions.title, slug: discussions.slug, createdAt: discussions.createdAt })
      .from(discussions).where(like(discussions.title, q)).limit(limit),
    db.select({ id: contentNodes.id, title: contentNodes.title, slug: contentNodes.slug, type: contentNodes.type })
      .from(contentNodes).where(or(like(contentNodes.title, q), like(contentNodes.summary, q))).limit(limit),
    db.select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug, excerpt: blogPosts.excerpt })
      .from(blogPosts).where(and(eq(blogPosts.status, 'published'), or(like(blogPosts.title, q), like(blogPosts.excerpt, q)))).limit(limit),
  ]);
  return { members: memberResults, discussions: discussionResults, knowledge: knowledgeResults, blog: blogResults };
}

// ─── Advanced Search ─────────────────────────────────────────────────────────
export async function searchDiscussions(params: {
  query?: string;
  authorId?: number;
  categoryId?: number;
  minReplies?: number;
  minViews?: number;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'recent' | 'popular' | 'replies' | 'views';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let conditions: any[] = [];
  
  // Text search
  if (params.query) {
    const q = `%${params.query}%`;
    conditions.push(or(like(discussions.title, q), like(discussions.content, q)));
  }
  
  // Author filter
  if (params.authorId) {
    conditions.push(eq(discussions.authorId, params.authorId));
  }
  
  // Category filter
  if (params.categoryId) {
    conditions.push(eq(discussions.categoryId, params.categoryId));
  }
  
  // Min replies filter
  if (params.minReplies !== undefined) {
    conditions.push(sql`${discussions.replyCount} >= ${params.minReplies}`);
  }
  
  // Min views filter
  if (params.minViews !== undefined) {
    conditions.push(sql`${discussions.viewCount} >= ${params.minViews}`);
  }
  
  // Date range filter
  if (params.dateFrom) {
    conditions.push(sql`${discussions.createdAt} >= ${params.dateFrom}`);
  }
  if (params.dateTo) {
    conditions.push(sql`${discussions.createdAt} <= ${params.dateTo}`);
  }
  
  // Build query with conditions
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Determine sort order
  const sortBy = params.sortBy || 'recent';
  let orderCol: any = desc(discussions.createdAt);
  if (sortBy === 'popular' || sortBy === 'views') orderCol = desc(discussions.viewCount);
  else if (sortBy === 'replies') orderCol = desc(discussions.replyCount);
  
  const results = await db.select({
    id: discussions.id,
    title: discussions.title,
    slug: discussions.slug,
    content: discussions.content,
    authorId: discussions.authorId,
    categoryId: discussions.categoryId,
    postType: discussions.postType,
    tags: discussions.tags,
    viewCount: discussions.viewCount,
    replyCount: discussions.replyCount,
    isPinned: discussions.isPinned,
    createdAt: discussions.createdAt,
    updatedAt: discussions.updatedAt,
  }).from(discussions)
    .where(whereClause)
    .orderBy(orderCol)
    .limit(params.limit || 20)
    .offset(params.offset || 0);
  
  return results;
}

export async function unfollowUser(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(memberFollows)
    .where(and(eq(memberFollows.followerId, followerId), eq(memberFollows.followingId, followingId)));
}

// ─── Workflow Settings ────────────────────────────────────────────────────────
export async function getWorkflowSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowSettings).orderBy(workflowSettings.label);
}

export async function updateWorkflowSetting(workflowKey: string, enabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(workflowSettings).set({ enabled }).where(eq(workflowSettings.workflowKey, workflowKey));
}

export async function getWorkflowEvents(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowEvents).orderBy(desc(workflowEvents.createdAt)).limit(limit);
}

// ─── Community Weekly Digest ──────────────────────────────────────────────────
export async function getRecentDiscussions(since: Date, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: discussions.id,
    title: discussions.title,
    slug: discussions.slug,
    replyCount: discussions.replyCount,
    viewCount: discussions.viewCount,
    createdAt: discussions.createdAt,
    authorName: users.name,
    authorVerificationStatus: users.verificationStatus,
  })
    .from(discussions)
    .leftJoin(users, eq(discussions.authorId, users.id))
    .where(sql`${discussions.createdAt} >= ${since}`)
    .orderBy(desc(discussions.replyCount))
    .limit(limit);
}

export async function getRecentBlogPosts(since: Date, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: blogPosts.id,
    title: blogPosts.title,
    slug: blogPosts.slug,
    excerpt: blogPosts.excerpt,
    publishedAt: blogPosts.publishedAt,
    authorName: users.name,
  })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(and(eq(blogPosts.status, "published"), sql`${blogPosts.publishedAt} >= ${since}`))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit);
}

export async function getUpcomingEvents(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select({
    id: events.id,
    title: events.title,
    startDate: events.startDate,
    location: events.location,
    isVirtual: events.isVirtual,
  })
    .from(events)
    .where(and(eq(events.status, "upcoming"), sql`${events.startDate} >= ${now}`))
    .orderBy(events.startDate)
    .limit(limit);
}

export async function getNewMembers(since: Date, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    platformRole: users.platformRole,
    organization: users.organization,
    createdAt: users.createdAt,
  })
    .from(users)
    .where(sql`${users.createdAt} >= ${since}`)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function logDigestSend(data: {
  sentByUserId?: number;
  recipientCount: number;
  newDiscussions: number;
  newBlogPosts: number;
  upcomingEvents: number;
  newMembers: number;
  contentSummary?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(digestSends).values({
    sentByUserId: data.sentByUserId ?? null,
    recipientCount: data.recipientCount,
    newDiscussions: data.newDiscussions,
    newBlogPosts: data.newBlogPosts,
    upcomingEvents: data.upcomingEvents,
    newMembers: data.newMembers,
    contentSummary: data.contentSummary ?? null,
  });
}

export async function getDigestSendHistory(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: digestSends.id,
    sentAt: digestSends.sentAt,
    recipientCount: digestSends.recipientCount,
    newDiscussions: digestSends.newDiscussions,
    newBlogPosts: digestSends.newBlogPosts,
    upcomingEvents: digestSends.upcomingEvents,
    newMembers: digestSends.newMembers,
    sentByUserId: digestSends.sentByUserId,
  })
    .from(digestSends)
    .orderBy(desc(digestSends.sentAt))
    .limit(limit);
}

// ─── Workflow Settings Seeding ────────────────────────────────────────────────
const WORKFLOW_DEFINITIONS = [
  { workflowKey: "new_member_welcome", label: "New Member Welcome", description: "Send a welcome notification when a new member registers" },
  { workflowKey: "post_submitted_moderation", label: "Post Submitted for Moderation", description: "Notify admin when a new post is submitted for review" },
  { workflowKey: "post_approved", label: "Post Approved", description: "Notify the author when their post is approved" },
  { workflowKey: "post_rejected", label: "Post Rejected", description: "Notify the author when their post is rejected" },
  { workflowKey: "new_discussion_reply", label: "New Discussion Reply", description: "Notify discussion authors when someone replies" },
  { workflowKey: "new_follower", label: "New Follower", description: "Notify a member when someone follows them" },
  { workflowKey: "new_blog_comment", label: "New Blog Comment", description: "Notify blog authors when someone comments" },
  { workflowKey: "new_event_rsvp", label: "New Event RSVP", description: "Notify event organizers when someone RSVPs" },
  { workflowKey: "weekly_digest", label: "Weekly Community Digest", description: "Send a weekly digest of top community content to all opted-in members" },
];

export async function seedWorkflowSettings() {
  const db = await getDb();
  if (!db) return;
  for (const wf of WORKFLOW_DEFINITIONS) {
    await db.insert(workflowSettings)
      .values({ workflowKey: wf.workflowKey, label: wf.label, description: wf.description, enabled: true })
      .onDuplicateKeyUpdate({ set: { label: wf.label, description: wf.description } });
  }
}

// ─── Audit Logs ────────────────────────────────────────────────────────────────
export async function logAuditEvent(actorUserId: number | null, actionType: string, targetType?: string, targetId?: number, details?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ actorUserId, actionType, targetType, targetId, details });
}

export async function getAuditLogs(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: auditLogs.id,
    actorUserId: auditLogs.actorUserId,
    actorName: users.name,
    actionType: auditLogs.actionType,
    targetType: auditLogs.targetType,
    targetId: auditLogs.targetId,
    details: auditLogs.details,
    createdAt: auditLogs.createdAt,
  }).from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit).offset(offset);
}

// ─── Accepted Answers ─────────────────────────────────────────────────────────
export async function markAcceptedAnswer(discussionId: number, postId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Clear any previous solution on this discussion
  await db.update(forumPosts).set({ isSolution: false }).where(eq(forumPosts.discussionId, discussionId));
  // Mark the new solution
  await db.update(forumPosts).set({ isSolution: true }).where(eq(forumPosts.id, postId));
  await db.update(discussions).set({ acceptedPostId: postId }).where(eq(discussions.id, discussionId));
  // Award reputation to post author
  const [post] = await db.select({ authorId: forumPosts.authorId }).from(forumPosts).where(eq(forumPosts.id, postId));
  if (post) await adjustReputation(post.authorId, 15);
  await logAuditEvent(actorUserId, "mark_accepted_answer", "discussion", discussionId, { postId });
}

// ─── AI Summary ───────────────────────────────────────────────────────────────
export async function saveDiscussionAISummary(discussionId: number, summary: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(discussions).set({ aiSummary: summary }).where(eq(discussions.id, discussionId));
}

// ─── Thread → Article Promotion ───────────────────────────────────────────────
export async function promoteDiscussionToArticle(discussionId: number, authorId: number, overrides?: { title?: string; summary?: string; body?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [disc] = await db.select().from(discussions).where(eq(discussions.id, discussionId));
  if (!disc) throw new Error("Discussion not found");
  const slug = `kb-${disc.slug}-${Date.now()}`;
  const [result] = await db.insert(contentNodes).values({
    title: overrides?.title ?? disc.title,
    slug,
    type: "article",
    body: overrides?.body ?? disc.content,
    summary: overrides?.summary ?? (disc.aiSummary ?? disc.content.slice(0, 200)),
    authorId,
    status: "draft",
    sourceDiscussionId: discussionId,
    lastReviewedAt: new Date(),
  });
  const articleId = (result as any).insertId;
  await db.update(discussions).set({ promotedArticleId: articleId }).where(eq(discussions.id, discussionId));
  await logAuditEvent(authorId, "promote_discussion_to_article", "discussion", discussionId, { articleId });
  return { articleId, slug };
}

// ─── Organizations ────────────────────────────────────────────────────────────
export async function getOrganizations(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).orderBy(organizations.name).limit(limit);
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  return org ?? null;
}

export async function createOrganization(data: { name: string; slug: string; type?: string; website?: string; description?: string; industry?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(organizations).values(data as any);
  return (result as any).insertId as number;
}

// ─── Expertise Tags ───────────────────────────────────────────────────────────
export async function getExpertiseTags() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expertiseTags).orderBy(expertiseTags.category, expertiseTags.name);
}

export async function getUserExpertise(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: userExpertise.id,
    tagId: userExpertise.tagId,
    tagName: expertiseTags.name,
    tagSlug: expertiseTags.slug,
    category: expertiseTags.category,
    level: userExpertise.level,
    verified: userExpertise.verified,
  }).from(userExpertise)
    .leftJoin(expertiseTags, eq(userExpertise.tagId, expertiseTags.id))
    .where(eq(userExpertise.userId, userId));
}

export async function addUserExpertise(userId: number, tagId: number, level: "beginner" | "intermediate" | "expert") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(userExpertise).values({ userId, tagId, level })
    .onDuplicateKeyUpdate({ set: { level } });
}

export async function removeUserExpertise(userId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(userExpertise).where(and(eq(userExpertise.userId, userId), eq(userExpertise.tagId, tagId)));
}

export async function seedExpertiseTags() {
  const db = await getDb();
  if (!db) return;
  const tags = [
    { name: "O-PAS / OPAS", slug: "opas", category: "standard" as const },
    { name: "IEC 61131", slug: "iec-61131", category: "standard" as const },
    { name: "OPC UA", slug: "opc-ua", category: "technology" as const },
    { name: "DCS Migration", slug: "dcs-migration", category: "lifecycle" as const },
    { name: "Cybersecurity", slug: "cybersecurity", category: "technology" as const },
    { name: "Advanced Control", slug: "advanced-control", category: "technology" as const },
    { name: "Procurement", slug: "procurement", category: "lifecycle" as const },
    { name: "Oil & Gas", slug: "oil-gas", category: "industry" as const },
    { name: "Chemicals", slug: "chemicals", category: "industry" as const },
    { name: "Power Generation", slug: "power-generation", category: "industry" as const },
    { name: "System Integrator", slug: "system-integrator", category: "role" as const },
    { name: "Control Engineer", slug: "control-engineer", category: "role" as const },
    { name: "Architect", slug: "architect", category: "role" as const },
    { name: "Executive / Leadership", slug: "executive", category: "role" as const },
    { name: "NAMUR / ISA", slug: "namur-isa", category: "standard" as const },
  ];
  for (const tag of tags) {
    await db.insert(expertiseTags).values(tag).onDuplicateKeyUpdate({ set: { category: tag.category } });
  }
}

// ─── Polymorphic Follows ──────────────────────────────────────────────────────
export async function followTarget(userId: number, targetType: "space" | "post" | "tag" | "user" | "course" | "event", targetId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.targetType, targetType), eq(follows.targetId, targetId)));
  if (existing.length === 0) {
    await db.insert(follows).values({ userId, targetType, targetId });
  }
}

export async function unfollowTarget(userId: number, targetType: "space" | "post" | "tag" | "user" | "course" | "event", targetId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(follows).where(and(eq(follows.userId, userId), eq(follows.targetType, targetType), eq(follows.targetId, targetId)));
}


export async function isFollowing(userId: number, targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: follows.id }).from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.targetType, targetType as any), eq(follows.targetId, targetId)));
  return rows.length > 0;
}
export async function getUserFollows(userId: number, targetType?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = targetType
    ? and(eq(follows.userId, userId), eq(follows.targetType, targetType as any))
    : eq(follows.userId, userId);
  return db.select().from(follows).where(conditions);
}

// ─── Expert Verification ──────────────────────────────────────────────────────
export async function createVerificationRequest(userId: number, data: { linkedInUrl?: string; credentials?: string; statement?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Update user status to pending
  await db.update(users).set({ verificationStatus: "pending" }).where(eq(users.id, userId));
  const [result] = await db.insert(verificationRequests).values({ userId, ...data });
  return (result as any).insertId as number;
}

export async function getVerificationRequests(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  const q = db.select({
    id: verificationRequests.id,
    userId: verificationRequests.userId,
    userName: users.name,
    userEmail: users.email,
    linkedInUrl: verificationRequests.linkedInUrl,
    credentials: verificationRequests.credentials,
    statement: verificationRequests.statement,
    status: verificationRequests.status,
    reviewNotes: verificationRequests.reviewNotes,
    createdAt: verificationRequests.createdAt,
    reviewedAt: verificationRequests.reviewedAt,
  }).from(verificationRequests)
    .leftJoin(users, eq(verificationRequests.userId, users.id));
  if (status) return q.where(eq(verificationRequests.status, status)).orderBy(desc(verificationRequests.createdAt));
  return q.orderBy(desc(verificationRequests.createdAt));
}

export async function reviewVerificationRequest(requestId: number, reviewerId: number, decision: "approved" | "rejected", notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [req] = await db.select().from(verificationRequests).where(eq(verificationRequests.id, requestId));
  if (!req) throw new Error("Request not found");
  await db.update(verificationRequests).set({
    status: decision,
    reviewedByUserId: reviewerId,
    reviewNotes: notes,
    reviewedAt: new Date(),
  }).where(eq(verificationRequests.id, requestId));
  const newStatus = decision === "approved" ? "verified" : "unverified";
  await db.update(users).set({ verificationStatus: newStatus, verificationNotes: notes }).where(eq(users.id, req.userId));
  if (decision === "approved") {
    await awardBadge(req.userId, "expert", "Verified Expert", "Verified OPA expert practitioner");
  }
  await logAuditEvent(reviewerId, `verification_${decision}`, "user", req.userId, { requestId, notes });

  // Send in-app notification to the user
  try {
    await createForumNotification({
      userId: req.userId,
      type: 'verification',
      relatedUserId: reviewerId,
    });
  } catch (e) {
    console.error('[verification] Failed to create in-app notification:', e);
  }

  // Send email notification
  try {
    const user = await getUserById(req.userId);
    if (user?.email) {
      const { sendEmail } = await import('./email');
      const { buildVerificationEmail } = await import('./email');
      const emailContent = buildVerificationEmail(user.name || 'Member', decision, notes);
      await sendEmail({ to: user.email, ...emailContent });
    }
  } catch (e) {
    console.error('[verification] Failed to send email notification:', e);
  }
}

// ─── Space Content (Category-based) ──────────────────────────────────────────
export async function getSpaceContent(categoryId: number, limit = 10) {
  const db = await getDb();
  if (!db) return { discussions: [], articles: [], events: [] };
  const [spaceDiscussions, spaceArticles] = await Promise.all([
    db.select({
      id: discussions.id, title: discussions.title, slug: discussions.slug,
      postType: discussions.postType, replyCount: discussions.replyCount,
      createdAt: discussions.createdAt, authorName: users.name,
    }).from(discussions)
      .leftJoin(users, eq(discussions.authorId, users.id))
      .where(eq(discussions.categoryId, categoryId))
      .orderBy(desc(discussions.createdAt)).limit(limit),
    db.select({
      id: contentNodes.id, title: contentNodes.title, slug: contentNodes.slug,
      type: contentNodes.type, summary: contentNodes.summary, createdAt: contentNodes.createdAt,
    }).from(contentNodes)
      .where(and(eq(contentNodes.categoryId, categoryId), eq(contentNodes.status, "published")))
      .orderBy(desc(contentNodes.createdAt)).limit(limit),
  ]);
  return { discussions: spaceDiscussions, articles: spaceArticles };
}

export async function getTopContributorsBySpace(categoryId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    authorId: discussions.authorId,
    name: users.name,
    count: sql<number>`count(${discussions.id})`,
    reputation: users.reputationScore,
  }).from(discussions)
    .leftJoin(users, eq(discussions.authorId, users.id))
    .where(eq(discussions.categoryId, categoryId))
    .groupBy(discussions.authorId, users.name, users.reputationScore)
    .orderBy(desc(sql`count(${discussions.id})`))
    .limit(limit);
  return rows;
}

// ─── Event Discussion Thread ──────────────────────────────────────────────────
export async function createEventDiscussionThread(eventId: number, organizerId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new Error("Event not found");
  // Find or create a default "Events" category
  let [cat] = await db.select().from(forumCategories).where(like(forumCategories.name, "%Event%")).limit(1);
  if (!cat) {
    const [r] = await db.insert(forumCategories).values({ name: "Events & Working Groups", slug: "events-working-groups", description: "Event discussions and working group sessions", displayOrder: 99 });
    const catId = (r as any).insertId;
    [cat] = await db.select().from(forumCategories).where(eq(forumCategories.id, catId));
  }
  const slug = `event-${eventId}-discussion-${Date.now()}`;
  const [result] = await db.insert(discussions).values({
    title: `Discussion: ${event.title}`,
    slug,
    content: `This is the community discussion thread for the event: **${event.title}**.\n\nShare your questions, takeaways, and follow-up thoughts here.`,
    authorId: organizerId,
    categoryId: cat.id,
    postType: "discussion",
    isPinned: true,
  });
  const discussionId = (result as any).insertId;
  await db.update(events).set({ relatedDiscussionId: discussionId }).where(eq(events.id, eventId));
  return discussionId;
}

// ─── Courses (Live DB) ────────────────────────────────────────────────────────

export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [c] = await db.select().from(courses).where(eq(courses.id, id));
  return c ?? null;
}




export async function seedOPACourses() {
  const db = await getDb();
  if (!db) return;
  const courseSeed = [
    { title: "O-PAS Fundamentals", slug: "opas-fundamentals", description: "A comprehensive introduction to the Open Process Automation Standard — architecture, goals, and key concepts for engineers and executives.", excerpt: "Start here: core O-PAS concepts, architecture layers, and why it matters.", level: "beginner" as const, category: "Foundations", duration: "3h 20m", lessonCount: 12, isFree: true, status: "published" as const },
    { title: "DCSA & Advanced Computing Platform", slug: "dcsa-acp", description: "Deep dive into the Distributed Control Node, Advanced Computing Platform, and how they replace traditional DCS architectures.", excerpt: "Hardware architecture for O-PAS: DCN, ACP, and the physical layer.", level: "intermediate" as const, category: "Architecture", duration: "4h 45m", lessonCount: 18, isFree: false, status: "published" as const },
    { title: "Connectivity Framework & Interoperability", slug: "connectivity-framework", description: "How the O-PAS Connectivity Framework enables vendor-neutral data exchange, OPC UA integration, and system portability.", excerpt: "OPC UA, connectivity framework, and achieving true interoperability.", level: "intermediate" as const, category: "Integration", duration: "3h 10m", lessonCount: 14, isFree: false, status: "published" as const },
    { title: "OPA Procurement & Contracting", slug: "opa-procurement", description: "How to structure RFPs, evaluate vendors, and contract for O-PAS-aligned systems without vendor lock-in.", excerpt: "Procurement strategy, RFP structure, and vendor evaluation for OPA projects.", level: "beginner" as const, category: "Business", duration: "2h 30m", lessonCount: 10, isFree: true, status: "published" as const },
    { title: "Technical Migration Planning", slug: "technical-migration-planning", description: "Step-by-step methodology for migrating from legacy DCS to O-PAS-aligned architecture, including risk management and phasing.", excerpt: "Migration methodology: assessment, phasing, risk management, and execution.", level: "advanced" as const, category: "Migration", duration: "5h 15m", lessonCount: 20, isFree: false, status: "published" as const },
  ];
  for (const c of courseSeed) {
    await db.insert(courses).values({ ...c, authorId: 1 }).onDuplicateKeyUpdate({ set: { title: c.title } });
  }
}

// ─── @Mention Parsing ─────────────────────────────────────────────────────────
/**
 * Parse @username mentions from post content.
 * Matches @word patterns (letters, digits, underscores, hyphens, spaces-in-names).
 * Returns an array of unique name strings (lowercase).
 */
export function parseMentions(content: string): string[] {
  // Strip HTML tags first
  const text = content.replace(/<[^>]+>/g, ' ');
  const matches = text.match(/@([\w\-]+)/g) || [];
  const names = matches.map(m => m.slice(1).toLowerCase());
  return Array.from(new Set(names));
}

/**
 * Given a list of mentioned names, find matching users and create
 * forum_notifications of type "mention" for each.
 */
export async function notifyMentionedUsers(
  mentionedNames: string[],
  { authorId, discussionId, postId }: { authorId: number; discussionId: number; postId?: number }
): Promise<void> {
  if (!mentionedNames.length) return;
  const db = await getDb();
  if (!db) return;
  // Find users whose name matches any mentioned name (case-insensitive)
  for (const name of mentionedNames) {
    const matched = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(REPLACE(${users.name}, ' ', '_')) = ${name} OR LOWER(${users.name}) = ${name}`)
      .limit(1);
    if (matched.length && matched[0].id !== authorId) {
      await db.insert(forumNotifications).values({
        userId: matched[0].id,
        type: 'mention',
        relatedUserId: authorId,
        discussionId,
        postId,
      });
    }
  }
}

// ─── Profile Tab Helpers ──────────────────────────────────────────────────────

/** Discussions created by a user */
export async function getDiscussionsByUser(userId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: discussions.id,
    title: discussions.title,
    slug: discussions.slug,
    postType: discussions.postType,
    tags: discussions.tags,
    replyCount: discussions.replyCount,
    viewCount: discussions.viewCount,
    createdAt: discussions.createdAt,
    categoryName: forumCategories.name,
  })
    .from(discussions)
    .leftJoin(forumCategories, eq(discussions.categoryId, forumCategories.id))
    .where(eq(discussions.authorId, userId))
    .orderBy(desc(discussions.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Forum posts (replies) created by a user */
export async function getForumPostsByUser(userId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: forumPosts.id,
    content: forumPosts.content,
    createdAt: forumPosts.createdAt,
    discussionId: forumPosts.discussionId,
    discussionTitle: discussions.title,
    discussionSlug: discussions.slug,
  })
    .from(forumPosts)
    .leftJoin(discussions, eq(forumPosts.discussionId, discussions.id))
    .where(eq(forumPosts.authorId, userId))
    .orderBy(desc(forumPosts.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Knowledge articles authored by a user */
export async function getContentNodesByUser(userId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: contentNodes.id,
    title: contentNodes.title,
    slug: contentNodes.slug,
    type: contentNodes.type,
    status: contentNodes.status,
    tags: contentNodes.tags,
    summary: contentNodes.summary,
    createdAt: contentNodes.createdAt,
  })
    .from(contentNodes)
    .where(and(eq(contentNodes.authorId, userId), eq(contentNodes.status, 'published')))
    .orderBy(desc(contentNodes.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Blog posts authored by a user */
export async function getBlogPostsByUser(userId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: blogPosts.id,
    title: blogPosts.title,
    slug: blogPosts.slug,
    status: blogPosts.status,
    excerpt: blogPosts.excerpt,
    publishedAt: blogPosts.publishedAt,
    createdAt: blogPosts.createdAt,
  })
    .from(blogPosts)
    .where(and(eq(blogPosts.authorId, userId), eq(blogPosts.status, 'published')))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit)
    .offset(offset);
}

/** Spaces (forum categories) followed by a user via polymorphic follows */
export async function getSpacesFollowedByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const userFollows = await db.select().from(follows)
    .where(and(eq(follows.userId, userId), eq(follows.targetType, 'space')));
  if (!userFollows.length) return [];
  const spaceIds = userFollows.map(f => f.targetId);
  return db.select().from(forumCategories)
    .where(inArray(forumCategories.id, spaceIds))
    .orderBy(forumCategories.name);
}

/** Content nodes related by shared tags (for Knowledge Article detail) */
export async function getRelatedContentNodes(nodeId: number, tags: string[], limit = 4) {
  const db = await getDb();
  if (!db) return [];
  if (!tags.length) {
    // fallback: same-type articles
    const node = await db.select({ type: contentNodes.type }).from(contentNodes).where(eq(contentNodes.id, nodeId)).limit(1);
    if (!node.length) return [];
    return db.select({ id: contentNodes.id, title: contentNodes.title, slug: contentNodes.slug, type: contentNodes.type, summary: contentNodes.summary })
      .from(contentNodes)
      .where(and(eq(contentNodes.status, 'published'), sql`${contentNodes.id} != ${nodeId}`, eq(contentNodes.type, node[0].type)))
      .orderBy(desc(contentNodes.createdAt))
      .limit(limit);
  }
  // Return published articles that share at least one tag.
  const tagConditions = tags.map(t => sql`JSON_CONTAINS(${contentNodes.tags}, ${JSON.stringify(t)})`);
  return db.select({ id: contentNodes.id, title: contentNodes.title, slug: contentNodes.slug, type: contentNodes.type, summary: contentNodes.summary })
    .from(contentNodes)
    .where(and(eq(contentNodes.status, 'published'), sql`${contentNodes.id} != ${nodeId}`, or(...tagConditions)))
    .orderBy(desc(contentNodes.createdAt))
    .limit(limit);
}

/** Discussions related to a content node (via sourceDiscussionId or matching tags) */
export async function getRelatedDiscussionsForContent(nodeId: number, tags: string[], limit = 4) {
  const db = await getDb();
  if (!db) return [];
  // First try sourceDiscussionId
  const node = await db.select({ sourceDiscussionId: contentNodes.sourceDiscussionId }).from(contentNodes).where(eq(contentNodes.id, nodeId)).limit(1);
  const sourceId = node[0]?.sourceDiscussionId;
  const results: any[] = [];
  if (sourceId) {
    const source = await db.select({ id: discussions.id, title: discussions.title, slug: discussions.slug, replyCount: discussions.replyCount, createdAt: discussions.createdAt }).from(discussions).where(eq(discussions.id, sourceId)).limit(1);
    results.push(...source);
  }
  if (results.length >= limit) return results.slice(0, limit);
  // Then tag-based
  if (tags.length) {
    const tagConditions = tags.map(t => sql`JSON_CONTAINS(${discussions.tags}, ${JSON.stringify(t)})`);
    const tagMatches = await db.select({ id: discussions.id, title: discussions.title, slug: discussions.slug, replyCount: discussions.replyCount, createdAt: discussions.createdAt })
      .from(discussions)
      .where(and(sourceId ? sql`${discussions.id} != ${sourceId}` : sql`1=1`, or(...tagConditions)))
      .orderBy(desc(discussions.replyCount))
      .limit(limit - results.length);
    results.push(...tagMatches);
  }
  return results.slice(0, limit);
}

/** List contributors (distinct authorIds) for a content node */
export async function getContentNodeContributors(nodeId: number) {
  const db = await getDb();
  if (!db) return [];
  const node = await db.select({ authorId: contentNodes.authorId }).from(contentNodes).where(eq(contentNodes.id, nodeId)).limit(1);
  if (!node.length || !node[0].authorId) return [];
  const author = await db.select({ id: users.id, name: users.name, verificationStatus: users.verificationStatus, platformRole: users.platformRole })
    .from(users).where(eq(users.id, node[0].authorId)).limit(1);
  return author;
}

/** Events with replayUrl (on-demand recordings) */
export async function getOnDemandEvents(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events)
    .where(and(eq(events.status, 'completed'), sql`${events.replayUrl} IS NOT NULL AND ${events.replayUrl} != ''`))
    .orderBy(desc(events.startDate))
    .limit(limit)
    .offset(offset);
}

/** Get active (in-progress) course enrollment for a user */
export async function getActiveCourseEnrollment(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    enrollment: courseEnrollments,
    course: courses,
  }).from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(and(eq(courseEnrollments.userId, userId), sql`${courseEnrollments.completedAt} IS NULL`))
    .orderBy(desc(courseEnrollments.enrolledAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Count unread forum notifications for a user */
export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(forumNotifications)
    .where(and(eq(forumNotifications.userId, userId), eq(forumNotifications.isRead, false)));
  return row?.count ?? 0;
}

/** Space preview data for hover card: member count, discussion count, recent discussions */
export async function getSpacePreview(categoryId: number) {
  const db = await getDb();
  if (!db) return null;
  const [memberCountRow, discussionCountRow, recentDiscussions] = await Promise.all([
    // Count unique authors who have posted in this space (proxy for member count)
    db.select({ count: sql<number>`count(distinct ${discussions.authorId})` })
      .from(discussions)
      .where(eq(discussions.categoryId, categoryId)),
    // Total discussion count
    db.select({ count: sql<number>`count(*)` })
      .from(discussions)
      .where(eq(discussions.categoryId, categoryId)),
    // 3 most recent discussions
    db.select({
      id: discussions.id,
      title: discussions.title,
      slug: discussions.slug,
      replyCount: discussions.replyCount,
      postType: discussions.postType,
      createdAt: discussions.createdAt,
    })
      .from(discussions)
      .where(eq(discussions.categoryId, categoryId))
      .orderBy(desc(discussions.createdAt))
      .limit(3),
  ]);
  return {
    memberCount: memberCountRow[0]?.count ?? 0,
    discussionCount: discussionCountRow[0]?.count ?? 0,
    recentDiscussions,
  };
}

// ─── Global Tags ─────────────────────────────────────────────────────────────
export async function listGlobalTags(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(globalTags).orderBy(desc(globalTags.usageCount)).limit(limit);
}
export async function getTagBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const [tag] = await db.select().from(globalTags).where(eq(globalTags.slug, slug));
  return tag ?? null;
}
export async function createGlobalTag(data: { name: string; slug: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(globalTags).values(data);
}
export async function getPostsByTag(tagId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return { discussions: [], contentNodes: [] };
  const taggedPosts = await db.select().from(postTags).where(eq(postTags.tagId, tagId)).limit(200);
  const discussionIds = taggedPosts.filter(p => p.targetType === 'discussion').map(p => p.targetId);
  const contentIds = taggedPosts.filter(p => p.targetType === 'content_node').map(p => p.targetId);
  const [discs, nodes] = await Promise.all([
    discussionIds.length > 0
      ? db.select().from(discussions).where(inArray(discussions.id, discussionIds)).limit(limit).offset(offset)
      : Promise.resolve([]),
    contentIds.length > 0
      ? db.select().from(contentNodes).where(inArray(contentNodes.id, contentIds)).limit(limit).offset(offset)
      : Promise.resolve([]),
  ]);
  return { discussions: discs, contentNodes: nodes };
}
export async function addTagToPost(tagId: number, targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return;
  // Increment usage count
  await db.update(globalTags).set({ usageCount: sql`usageCount + 1` }).where(eq(globalTags.id, tagId));
  await db.insert(postTags).values({ tagId, targetType, targetId });
}
// ─── Quizzes ─────────────────────────────────────────────────────────────────
export async function getQuizByCourse(courseId: number) {
  const db = await getDb();
  if (!db) return null;
  // Only the legacy course-level quiz (lessonId IS NULL). Lesson-scoped
  // quizzes are fetched via getQuizByLesson.
  const [quiz] = await db.select().from(quizzes)
    .where(and(eq(quizzes.courseId, courseId), sql`${quizzes.lessonId} IS NULL`));
  if (!quiz) return null;
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id)).orderBy(quizQuestions.displayOrder);
  return { ...quiz, questions };
}

export async function getQuizByLesson(lessonId: number) {
  const db = await getDb();
  if (!db) return null;
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
  if (!quiz) return null;
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id)).orderBy(quizQuestions.displayOrder);
  return { ...quiz, questions };
}

export async function getLessonQuizMap(courseId: number) {
  // Returns an array of { lessonId, quizId, questionCount, passingScore }
  // so the admin lessons list can show which lessons have quizzes wired up.
  const db = await getDb();
  if (!db) return [];
  const lessonRows = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, courseId));
  if (lessonRows.length === 0) return [];
  const quizRows = await db.select().from(quizzes).where(inArray(quizzes.lessonId, lessonRows.map(l => l.id)));
  if (quizRows.length === 0) return [];
  const counts = await db.select({
    quizId: quizQuestions.quizId,
    cnt: sql<number>`count(*)`,
  }).from(quizQuestions).where(inArray(quizQuestions.quizId, quizRows.map(q => q.id))).groupBy(quizQuestions.quizId);
  const cntMap = new Map(counts.map(c => [c.quizId, Number(c.cnt)]));
  return quizRows.map(q => ({
    lessonId: q.lessonId!,
    quizId: q.id,
    passingScore: q.passingScore,
    questionCount: cntMap.get(q.id) ?? 0,
  }));
}
export async function createQuiz(data: { courseId: number; title: string; passingScore?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [r] = await db.insert(quizzes).values({ ...data, passingScore: data.passingScore ?? 70 });
  return (r as any).insertId as number;
}
export async function addQuizQuestion(data: { quizId: number; question: string; options: string[]; correctIndex: number; explanation?: string; displayOrder?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(quizQuestions).values(data as any);
}
export async function submitQuizAttempt(quizId: number, userId: number, answers: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.displayOrder);
  const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1).then(r => r[0]);
  if (!quiz) throw new Error("Quiz not found");
  const results = questions.map((q, i) => ({
    questionId: q.id,
    selectedIndex: answers[i] ?? -1,
    correctIndex: q.correctIndex,
    isCorrect: q.correctIndex === answers[i],
    explanation: q.explanation ?? null,
  }));
  const correct = results.filter(r => r.isCorrect).length;
  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  const passed = score >= quiz.passingScore;
  await db.insert(quizAttempts).values({ quizId, userId, score, passed, answers: answers as any });
  if (passed) {
    if (quiz.lessonId) {
      // Per-lesson quiz: pass marks the lesson complete, which recalcs course
      // progress (and sets enrollment.completedAt at 100%).
      await markLessonComplete(userId, quiz.lessonId);
      await recalcCourseProgress(userId, quiz.courseId);
    } else {
      // Legacy course-level quiz: pass marks the enrollment complete directly.
      const enrollment = await db.select().from(courseEnrollments)
        .where(and(eq(courseEnrollments.courseId, quiz.courseId), eq(courseEnrollments.userId, userId))).limit(1);
      if (enrollment.length > 0) {
        await db.update(courseEnrollments).set({ completedAt: new Date() })
          .where(and(eq(courseEnrollments.courseId, quiz.courseId), eq(courseEnrollments.userId, userId)));
      }
    }
  }
  return { score, passed, correctCount: correct, totalCount: questions.length, results };
}
export async function getMyQuizAttempts(userId: number, quizId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizAttempts).where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))).orderBy(desc(quizAttempts.completedAt));
}

// ─── Quiz Admin ───────────────────────────────────────────────────────────────
export async function upsertQuiz(data: { courseId: number; title?: string; passingScore: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(quizzes)
    .where(and(eq(quizzes.courseId, data.courseId), sql`${quizzes.lessonId} IS NULL`))
    .limit(1);
  if (existing.length > 0) {
    await db.update(quizzes)
      .set({ passingScore: data.passingScore, ...(data.title ? { title: data.title } : {}) })
      .where(eq(quizzes.id, existing[0].id));
    return { id: existing[0].id };
  }
  const [r] = await db.insert(quizzes).values({
    courseId: data.courseId,
    title: data.title ?? "Final Quiz",
    passingScore: data.passingScore,
  });
  return { id: (r as any).insertId as number };
}

export async function importQuizQuestions(input: {
  courseId: number;
  rows: Array<{
    lessonSlug: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
}): Promise<{ imported: number; byLesson: Record<string, number>; quizzesCreated: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // 1. Resolve lesson slugs to lesson rows for this course only.
  const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, input.courseId));
  const lessonsBySlug = new Map(courseLessons.map(l => [l.slug, l]));

  // 2. Validate every row (the client should have already, but defense in depth).
  for (let i = 0; i < input.rows.length; i++) {
    const r = input.rows[i];
    const lesson = lessonsBySlug.get(r.lessonSlug);
    if (!lesson) throw new Error(`Row ${i + 1}: lesson_slug "${r.lessonSlug}" not found in this course`);
    if (r.options.length < 2 || r.options.length > 6) throw new Error(`Row ${i + 1}: must have 2–6 options`);
    if (r.correctIndex < 0 || r.correctIndex >= r.options.length) throw new Error(`Row ${i + 1}: correct answer index out of range`);
    if (!r.question.trim()) throw new Error(`Row ${i + 1}: question text is empty`);
  }

  // 3. Group rows by lesson, find or create the per-lesson quiz, insert questions
  //    at MAX(displayOrder)+1 so they append rather than overwrite.
  const byLesson: Record<string, number> = {};
  let quizzesCreated = 0;
  const lessonGroups = new Map<number, typeof input.rows>();
  for (const row of input.rows) {
    const lesson = lessonsBySlug.get(row.lessonSlug)!;
    if (!lessonGroups.has(lesson.id)) lessonGroups.set(lesson.id, []);
    lessonGroups.get(lesson.id)!.push(row);
  }

  for (const [lessonId, rows] of Array.from(lessonGroups.entries())) {
    const lesson = courseLessons.find(l => l.id === lessonId)!;
    // Find or create the lesson's quiz.
    let [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
    if (!quiz) {
      const [r] = await db.insert(quizzes).values({
        courseId: input.courseId,
        lessonId,
        title: `${lesson.title} Quiz`,
        passingScore: 70,
      });
      quizzesCreated++;
      const insertId = (r as any).insertId as number;
      quiz = (await db.select().from(quizzes).where(eq(quizzes.id, insertId)).limit(1))[0];
    }
    // Get current max displayOrder for this quiz.
    const [maxRow] = await db.select({ max: sql<number | null>`MAX(${quizQuestions.displayOrder})` })
      .from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id));
    let nextOrder = (maxRow?.max ?? -1) + 1;
    for (const row of rows) {
      await db.insert(quizQuestions).values({
        quizId: quiz.id,
        question: row.question,
        options: row.options as any,
        correctIndex: row.correctIndex,
        explanation: row.explanation ?? null,
        displayOrder: nextOrder,
      } as any);
      nextOrder++;
    }
    byLesson[lesson.slug] = (byLesson[lesson.slug] ?? 0) + rows.length;
  }

  return { imported: input.rows.length, byLesson, quizzesCreated };
}

export async function upsertLessonQuiz(data: { lessonId: number; title?: string; passingScore: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, data.lessonId)).limit(1);
  if (!lesson) throw new Error("Lesson not found");
  const existing = await db.select().from(quizzes).where(eq(quizzes.lessonId, data.lessonId)).limit(1);
  if (existing.length > 0) {
    await db.update(quizzes)
      .set({ passingScore: data.passingScore, ...(data.title ? { title: data.title } : {}) })
      .where(eq(quizzes.id, existing[0].id));
    return { id: existing[0].id };
  }
  const [r] = await db.insert(quizzes).values({
    courseId: lesson.courseId,
    lessonId: data.lessonId,
    title: data.title ?? `${lesson.title} Quiz`,
    passingScore: data.passingScore,
  });
  return { id: (r as any).insertId as number };
}

export async function updateQuizQuestion(questionId: number, fields: {
  question?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string | null;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const update: Record<string, unknown> = {};
  if (fields.question !== undefined) update.question = fields.question;
  if (fields.options !== undefined) update.options = fields.options;
  if (fields.correctIndex !== undefined) update.correctIndex = fields.correctIndex;
  if (fields.explanation !== undefined) update.explanation = fields.explanation;
  if (fields.displayOrder !== undefined) update.displayOrder = fields.displayOrder;
  if (Object.keys(update).length === 0) return;
  await db.update(quizQuestions).set(update).where(eq(quizQuestions.id, questionId));
}

export async function deleteQuizQuestion(questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(quizQuestions).where(eq(quizQuestions.id, questionId));
}

export async function reorderQuizQuestions(quizId: number, questionIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  for (let i = 0; i < questionIds.length; i++) {
    await db.update(quizQuestions)
      .set({ displayOrder: i })
      .where(and(eq(quizQuestions.id, questionIds[i]), eq(quizQuestions.quizId, quizId)));
  }
}

export async function addQuizQuestionWithOrder(data: {
  quizId: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [maxRow] = await db.select({ max: sql<number | null>`MAX(${quizQuestions.displayOrder})` })
    .from(quizQuestions).where(eq(quizQuestions.quizId, data.quizId));
  const displayOrder = (maxRow?.max ?? -1) + 1;
  const [r] = await db.insert(quizQuestions).values({ ...data, displayOrder } as any);
  return { id: (r as any).insertId as number };
}
// ─── Role Promotion Requests ──────────────────────────────────────────────────
export async function createRolePromotionRequest(userId: number, requestedRole: string, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(rolePromotionRequests).values({ userId, requestedRole, reason });
}
export async function listPendingRolePromotions() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: rolePromotionRequests.id,
    userId: rolePromotionRequests.userId,
    requestedRole: rolePromotionRequests.requestedRole,
    reason: rolePromotionRequests.reason,
    status: rolePromotionRequests.status,
    createdAt: rolePromotionRequests.createdAt,
    userName: users.name,
    userEmail: users.email,
    currentRole: users.platformRole,
  }).from(rolePromotionRequests)
    .leftJoin(users, eq(rolePromotionRequests.userId, users.id))
    .where(eq(rolePromotionRequests.status, 'pending'))
    .orderBy(desc(rolePromotionRequests.createdAt));
}
export async function reviewRolePromotion(id: number, status: 'approved' | 'rejected', reviewedByUserId: number, reviewNotes?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [req] = await db.select().from(rolePromotionRequests).where(eq(rolePromotionRequests.id, id));
  if (!req) throw new Error("Request not found");
  await db.update(rolePromotionRequests).set({ status, reviewedByUserId, reviewNotes, reviewedAt: new Date() }).where(eq(rolePromotionRequests.id, id));
  if (status === 'approved') {
    await db.update(users).set({ platformRole: req.requestedRole as any }).where(eq(users.id, req.userId));
  }
}
// ─── Re-engagement: Inactive Users ───────────────────────────────────────────
export async function getInactiveUsers(daysSinceLastSignIn = 30, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - daysSinceLastSignIn * 24 * 60 * 60 * 1000);
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    lastSignedIn: users.lastSignedIn,
  }).from(users).where(sql`${users.lastSignedIn} < ${cutoff}`).limit(limit);
}
// ─── Course: linked discussion ────────────────────────────────────────────────
export async function updateCourseLinkedDiscussion(courseId: number, discussionId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(courses).set({ linkedDiscussionId: discussionId } as any).where(eq(courses.id, courseId));
}
export async function getCourseLinkedDiscussion(courseId: number) {
  const db = await getDb();
  if (!db) return null;
  const [c] = await db.select({ linkedDiscussionId: courses.linkedDiscussionId }).from(courses).where(eq(courses.id, courseId));
  if (!c?.linkedDiscussionId) return null;
  const [disc] = await db.select().from(discussions).where(eq(discussions.id, c.linkedDiscussionId));
  return disc ?? null;
}

// ─── Tag helpers: find-or-create and bulk attach ──────────────────────────────
export async function findOrCreateTag(name: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const [existing] = await db.select().from(globalTags).where(eq(globalTags.slug, slug)).limit(1);
  if (existing) return existing.id;
  const [r] = await db.insert(globalTags).values({ name: name.trim(), slug }).$returningId();
  return r.id;
}

export async function addTagsToPost(tagIds: number[], targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return;
  for (const tagId of tagIds) {
    // Ignore duplicates
    const [exists] = await db.select().from(postTags)
      .where(and(eq(postTags.tagId, tagId), eq(postTags.targetType, targetType), eq(postTags.targetId, targetId)))
      .limit(1);
    if (!exists) {
      await db.insert(postTags).values({ tagId, targetType, targetId });
      await db.update(globalTags).set({ usageCount: sql`usageCount + 1` }).where(eq(globalTags.id, tagId));
    }
  }
}

export async function getTagsForPost(targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ tag: globalTags })
    .from(postTags)
    .innerJoin(globalTags, eq(postTags.tagId, globalTags.id))
    .where(and(eq(postTags.targetType, targetType), eq(postTags.targetId, targetId)));
  return rows.map(r => r.tag);
}




// ─── Certificates ─────────────────────────────────────────────────────────────
export async function issueCertificate(userId: number, courseId: number | null, certificateType: "course_completion" | "opa_practitioner") {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const uniqueId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const [result] = await db.insert(certificates).values({ userId, courseId, certificateType, uniqueId });
  return { id: (result as any).insertId, uniqueId };
}

export async function getUserCertificates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: certificates.id,
    courseId: certificates.courseId,
    certificateType: certificates.certificateType,
    uniqueId: certificates.uniqueId,
    issuedAt: certificates.issuedAt,
    courseTitle: courses.title,
    courseSlug: courses.slug,
  }).from(certificates)
    .leftJoin(courses, eq(certificates.courseId, courses.id))
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt));
}

export async function verifyCertificate(uniqueId: string) {
  const db = await getDb();
  if (!db) return null;
  const [cert] = await db.select({
    id: certificates.id,
    certificateType: certificates.certificateType,
    uniqueId: certificates.uniqueId,
    issuedAt: certificates.issuedAt,
    userName: users.name,
    courseTitle: courses.title,
  }).from(certificates)
    .leftJoin(users, eq(certificates.userId, users.id))
    .leftJoin(courses, eq(certificates.courseId, courses.id))
    .where(eq(certificates.uniqueId, uniqueId));
  return cert || null;
}

export async function hasCourseCertificate(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return false;
  const [existing] = await db.select({ id: certificates.id }).from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)));
  return !!existing;
}

export async function hasOPAPractitionerCertificate(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const [existing] = await db.select({ id: certificates.id }).from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.certificateType, "opa_practitioner")));
  return !!existing;
}

export async function getCompletedCourseCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: count() }).from(courseEnrollments)
    .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.progress, 100)));
  return rows[0]?.count || 0;
}

// ─── Case Studies ─────────────────────────────────────────────────────────────
export async function submitCaseStudy(data: {
  title: string; description: string; summary?: string; industry: string;
  companySize: "startup" | "small" | "medium" | "large" | "enterprise";
  roi?: string; implementationTimeline?: string; techStack?: string;
  keyResults?: string; challenges?: string; lessons?: string;
  authorId: number; coverImageUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(caseStudies).values(data);
  return (result as any).insertId as number;
}

export async function listCaseStudies(status?: string, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  let q = db.select({
    id: caseStudies.id, title: caseStudies.title, summary: caseStudies.summary,
    industry: caseStudies.industry, companySize: caseStudies.companySize,
    roi: caseStudies.roi, implementationTimeline: caseStudies.implementationTimeline,
    techStack: caseStudies.techStack, status: caseStudies.status,
    isFeatured: caseStudies.isFeatured, coverImageUrl: caseStudies.coverImageUrl,
    authorName: users.name, createdAt: caseStudies.createdAt,
  }).from(caseStudies).leftJoin(users, eq(caseStudies.authorId, users.id)).$dynamic();
  if (status) q = q.where(eq(caseStudies.status, status as any));
  return q.orderBy(desc(caseStudies.createdAt)).limit(limit).offset(offset);
}

export async function getCaseStudyById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [study] = await db.select({
    id: caseStudies.id, title: caseStudies.title, description: caseStudies.description,
    summary: caseStudies.summary, industry: caseStudies.industry, companySize: caseStudies.companySize,
    roi: caseStudies.roi, implementationTimeline: caseStudies.implementationTimeline,
    techStack: caseStudies.techStack, keyResults: caseStudies.keyResults,
    challenges: caseStudies.challenges, lessons: caseStudies.lessons,
    status: caseStudies.status, isFeatured: caseStudies.isFeatured,
    coverImageUrl: caseStudies.coverImageUrl, authorId: caseStudies.authorId,
    authorName: users.name, createdAt: caseStudies.createdAt,
  }).from(caseStudies).leftJoin(users, eq(caseStudies.authorId, users.id))
    .where(eq(caseStudies.id, id));
  return study || null;
}

export async function reviewCaseStudy(id: number, status: "approved" | "featured" | "draft") {
  const db = await getDb();
  if (!db) return;
  const isFeatured = status === "featured";
  await db.update(caseStudies).set({ status: isFeatured ? "approved" : status, isFeatured }).where(eq(caseStudies.id, id));
}

// ─── Benchmarking ─────────────────────────────────────────────────────────────
export async function submitBenchmarkEntry(data: {
  userId?: number; isAnonymous?: boolean; industry: string;
  companySize: "startup" | "small" | "medium" | "large" | "enterprise";
  roi?: string; implementationTimeline?: string; teamSize?: number;
  techStack?: string; challenges?: string; keySuccesses?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(benchmarkingData).values(data);
  return (result as any).insertId as number;
}

export async function getBenchmarkAggregates() {
  const db = await getDb();
  if (!db) return { total: 0, byIndustry: [], byCompanySize: [], byRoi: [] };
  const [totalRow] = await db.select({ count: count() }).from(benchmarkingData);
  const total = totalRow?.count || 0;
  const byIndustry = await db.select({ industry: benchmarkingData.industry, count: count() })
    .from(benchmarkingData).groupBy(benchmarkingData.industry).orderBy(desc(count()));
  const byCompanySize = await db.select({ companySize: benchmarkingData.companySize, count: count() })
    .from(benchmarkingData).groupBy(benchmarkingData.companySize).orderBy(desc(count()));
  const allEntries = await db.select({
    roi: benchmarkingData.roi,
    techStack: benchmarkingData.techStack,
    industry: benchmarkingData.industry,
    companySize: benchmarkingData.companySize,
    implementationTimeline: benchmarkingData.implementationTimeline,
    teamSize: benchmarkingData.teamSize,
  }).from(benchmarkingData).orderBy(desc(benchmarkingData.submittedAt)).limit(200);
  return { total, byIndustry, byCompanySize, entries: allEntries };
}

// ─── Consulting Services ──────────────────────────────────────────────────────
export async function listConsultingServices(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  let q = db.select().from(consultingServices).$dynamic();
  if (activeOnly) q = q.where(eq(consultingServices.isActive, true));
  return q.orderBy(asc(consultingServices.serviceType));
}

export async function getConsultingServiceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [service] = await db.select().from(consultingServices).where(eq(consultingServices.id, id));
  return service || null;
}

export async function createConsultingService(data: {
  name: string; description: string;
  serviceType: "architecture_review" | "custom_training" | "implementation_advisory";
  price: string; duration?: string; maxSlotsPerMonth?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(consultingServices).values(data);
  return (result as any).insertId as number;
}

export async function updateConsultingService(id: number, data: Partial<{
  name: string; description: string; price: string; duration: string;
  maxSlotsPerMonth: number; isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(consultingServices).set(data as any).where(eq(consultingServices.id, id));
}

export async function submitConsultingInquiry(data: {
  serviceId: number; userId: number; email: string;
  phone?: string; message?: string; preferredDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(consultingInquiries).values(data);
  return (result as any).insertId as number;
}

export async function listConsultingInquiries(status?: string) {
  const db = await getDb();
  if (!db) return [];
  let q = db.select({
    id: consultingInquiries.id,
    serviceId: consultingInquiries.serviceId,
    serviceName: consultingServices.name,
    userId: consultingInquiries.userId,
    userName: users.name,
    email: consultingInquiries.email,
    phone: consultingInquiries.phone,
    message: consultingInquiries.message,
    preferredDate: consultingInquiries.preferredDate,
    status: consultingInquiries.status,
    createdAt: consultingInquiries.createdAt,
    respondedAt: consultingInquiries.respondedAt,
  }).from(consultingInquiries)
    .leftJoin(consultingServices, eq(consultingInquiries.serviceId, consultingServices.id))
    .leftJoin(users, eq(consultingInquiries.userId, users.id))
    .$dynamic();
  if (status) q = q.where(eq(consultingInquiries.status, status as any));
  return q.orderBy(desc(consultingInquiries.createdAt));
}

export async function updateConsultingInquiryStatus(id: number, status: "new" | "contacted" | "scheduled" | "completed" | "cancelled", adminNotes?: string) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { status, respondedAt: new Date() };
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  await db.update(consultingInquiries).set(updateData).where(eq(consultingInquiries.id, id));
}


// ─── Email Digest Preferences ─────────────────────────────────────────────────
export async function getOrCreateDigestPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let prefs = await db.select().from(emailDigestPreferences).where(eq(emailDigestPreferences.userId, userId)).limit(1);
  
  if (prefs.length === 0) {
    await db.insert(emailDigestPreferences).values({
      userId,
      enabled: true,
      frequency: "weekly",
      dayOfWeek: 1,
      hourOfDay: 9,
      includeNewDiscussions: true,
      includePopularDiscussions: true,
      includeNewBlogPosts: true,
      includeUpcomingEvents: true,
      includeNewMembers: false,
      minEngagementLevel: "all",
    });
    prefs = await db.select().from(emailDigestPreferences).where(eq(emailDigestPreferences.userId, userId)).limit(1);
  }
  
  return prefs[0] || null;
}

export async function updateDigestPreferences(userId: number, updates: Partial<InsertEmailDigestPreference>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(emailDigestPreferences)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(emailDigestPreferences.userId, userId));
  
  return getOrCreateDigestPreferences(userId);
}

export async function getDigestPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const prefs = await db.select().from(emailDigestPreferences).where(eq(emailDigestPreferences.userId, userId)).limit(1);
  return prefs[0] || null;
}

export async function getUsersForWeeklyDigest() {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hourOfDay = now.getHours();
  
  return db.select({
    userId: emailDigestPreferences.userId,
    preferences: emailDigestPreferences,
  }).from(emailDigestPreferences)
    .where(and(
      eq(emailDigestPreferences.enabled, true),
      eq(emailDigestPreferences.frequency, "weekly"),
      eq(emailDigestPreferences.dayOfWeek, dayOfWeek),
      sql`HOUR(NOW()) = ${hourOfDay}`
    ));
}

export async function markDigestSent(userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(emailDigestPreferences)
    .set({ lastSentAt: new Date() })
    .where(eq(emailDigestPreferences.userId, userId));
}


// ─── User Profiles & Activity ─────────────────────────────────────────────────
// ─── Section Heroes ─────────────────────────────────────────────────────────
export async function getSectionHero(sectionKey: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(sectionHeroes).where(eq(sectionHeroes.sectionKey, sectionKey)).limit(1);
  return result[0] || null;
}

export async function getAllSectionHeroes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sectionHeroes);
}

export async function upsertSectionHero(sectionKey: string, data: { heroImageUrl: string; title?: string; subtitle?: string; updatedByUserId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(sectionHeroes).where(eq(sectionHeroes.sectionKey, sectionKey)).limit(1);
  if (existing.length > 0) {
    await db.update(sectionHeroes).set(data).where(eq(sectionHeroes.sectionKey, sectionKey));
    return { ...existing[0], ...data };
  } else {
    await db.insert(sectionHeroes).values({ sectionKey, ...data });
    return { sectionKey, ...data };
  }
}

export async function deleteSectionHero(sectionKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sectionHeroes).where(eq(sectionHeroes.sectionKey, sectionKey));
}

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const user = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    bio: userProfiles.bio,
    location: userProfiles.location,
    createdAt: users.createdAt,
  }).from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.length === 0) return null;

  const profile = user[0];
  
  // Get stats
  const discussionCount = await db.select({ count: sql`COUNT(*)` })
    .from(discussions)
    .where(eq(discussions.authorId, userId));
  
  const replyCount = await db.select({ count: sql`COUNT(*)` })
    .from(forumPosts)
    .where(eq(forumPosts.authorId, userId));

  const followerCount = await db.select({ count: sql`COUNT(*)` })
    .from(follows)
    .where(and(eq(follows.targetType, 'user'), eq(follows.targetId, userId)));

  // Get recent discussions
  const recentDiscussions = await db.select({
    id: discussions.id,
    title: discussions.title,
    slug: discussions.slug,
    replyCount: discussions.replyCount,
    viewCount: discussions.viewCount,
    createdAt: discussions.createdAt,
  }).from(discussions)
    .where(eq(discussions.authorId, userId))
    .orderBy(desc(discussions.createdAt))
    .limit(5);

  return {
    ...profile,
    discussionCount: Number(discussionCount[0]?.count || 0),
    replyCount: Number(replyCount[0]?.count || 0),
    followerCount: Number(followerCount[0]?.count || 0),
    reputation: (Number(discussionCount[0]?.count || 0) * 10) + (Number(replyCount[0]?.count || 0) * 5),
    recentDiscussions,
  };
}


export async function getForumStats() {
  const db = await getDb();
  if (!db) return { totalDiscussions: 0, totalGroups: 0, activeMembers: 0, totalCategories: 0 };

  const [discRow] = await db.select({ count: sql<number>`count(*)` }).from(discussions);
  const [groupRow] = await db.select({ count: sql<number>`count(*)` }).from(forumGroups);
  const [catRow] = await db.select({ count: sql<number>`count(*)` }).from(forumCategories);
  
  // Active members = users who have posted or created discussions
  const [activeRow] = await db.select({ 
    count: sql<number>`count(distinct author_id)` 
  }).from(discussions);

  return {
    totalDiscussions: discRow?.count ?? 0,
    totalGroups: groupRow?.count ?? 0,
    activeMembers: activeRow?.count ?? 0,
    totalCategories: catRow?.count ?? 0,
  };
}

// ─── Email Blasts ─────────────────────────────────────────────────────────────
export async function getBlastRecipients(): Promise<{ id: number; email: string; name: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  // Members with an email who have NOT opted out of digest/marketing email.
  const rows = await db.select({ id: users.id, email: users.email, name: users.name, digestOptIn: users.digestOptIn })
    .from(users);
  return rows
    .filter(r => r.digestOptIn && r.email && r.email.includes("@"))
    .map(r => ({ id: r.id, email: r.email as string, name: r.name }));
}

export async function recordEmailBlast(data: {
  sentBy: number;
  subject: string;
  bodyMarkdown: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [r] = await db.insert(emailBlasts).values(data);
  return { id: (r as any).insertId as number };
}

export async function listEmailBlasts(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: emailBlasts.id,
    subject: emailBlasts.subject,
    recipientCount: emailBlasts.recipientCount,
    sentCount: emailBlasts.sentCount,
    failedCount: emailBlasts.failedCount,
    sentAt: emailBlasts.sentAt,
    sentByName: users.name,
  })
    .from(emailBlasts)
    .leftJoin(users, eq(emailBlasts.sentBy, users.id))
    .orderBy(desc(emailBlasts.sentAt))
    .limit(limit);
}
