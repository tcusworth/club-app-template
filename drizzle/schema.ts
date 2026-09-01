import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, decimal, unique } from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  platformRole: mysqlEnum("platformRole", [
    "owner_operator",
    "epc_integrator",
    "automation_engineer",
    "executive",
    "vendor",
    "analyst",
    "instructor",
  ]),
  bio: text("bio"),
  organization: varchar("organization", { length: 256 }),
  linkedInUrl: varchar("linkedInUrl", { length: 512 }),
  verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified"]).default("unverified").notNull(),
  verificationNotes: text("verificationNotes"),
  credentials: json("credentials").$type<string[]>(),
  reputationScore: int("reputationScore").default(0).notNull(),
  tier: mysqlEnum("tier", ["free", "pro"]).default("free").notNull(),
  onboarded: boolean("onboarded").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  digestOptIn: boolean("digestOptIn").default(true).notNull(),
  lastDigestSentAt: timestamp("lastDigestSentAt"),
  passwordHash: varchar("passwordHash", { length: 256 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── O-PAS Capabilities ─────────────────────────────────────────────
export const capabilities = mysqlTable("capabilities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),
  opasLayer: varchar("opasLayer", { length: 128 }),
  parentId: int("parentId"),
  icon: varchar("icon", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Capability = typeof capabilities.$inferSelect;

// ─── Requirements ────────────────────────────────────────────────────
export const requirements = mysqlTable("requirements", {
  id: int("id").autoincrement().primaryKey(),
  capabilityId: int("capabilityId").notNull(),
  definition: text("definition").notNull(),
  validationCriteria: text("validationCriteria"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Content Nodes (Knowledge Graph) ─────────────────────────────────
export const contentNodes = mysqlTable("content_nodes", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  slug: varchar("slug", { length: 512 }).notNull().unique(),
  type: mysqlEnum("type", ["article", "diagram", "case_study", "post", "guide"]).notNull(),
  body: text("body"),
  summary: text("summary"),
  authorId: int("authorId").notNull(),
  version: int("version").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "pending_review", "published", "rejected", "archived"]).default("draft").notNull(),
  rejectionReason: text("rejectionReason"),
  linkedCapabilities: json("linkedCapabilities").$type<number[]>(),
  tags: json("tags").$type<string[]>(),
  categoryId: int("categoryId"),
  sourceDiscussionId: int("sourceDiscussionId"),
  lastReviewedAt: timestamp("lastReviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentNode = typeof contentNodes.$inferSelect;

// ─── Media Attachments ───────────────────────────────────────────────
export const mediaAttachments = mysqlTable("media_attachments", {
  id: int("id").autoincrement().primaryKey(),
  contentNodeId: int("contentNodeId"),
  projectId: int("projectId"),
  uploaderId: int("uploaderId").notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileKey: varchar("fileKey", { length: 1024 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  sizeBytes: int("sizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MediaAttachment = typeof mediaAttachments.$inferSelect;

// ─── Vendors ─────────────────────────────────────────────────────────
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),
  website: varchar("website", { length: 512 }),
  logoUrl: varchar("logoUrl", { length: 2048 }),
  submittedById: int("submittedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;

// ─── Vendor Capability Claims ────────────────────────────────────────
export const vendorClaims = mysqlTable("vendor_claims", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull(),
  capabilityId: int("capabilityId").notNull(),
  claimText: text("claimText"),
  evidenceLinks: json("evidenceLinks").$type<string[]>(),
  status: mysqlEnum("status", ["unverified", "verified", "challenged"]).default("unverified").notNull(),
  submittedById: int("submittedById").notNull(),
  reviewedById: int("reviewedById"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VendorClaim = typeof vendorClaims.$inferSelect;

// ─── Claim Challenges (Community Validation) ────────────────────────
export const claimChallenges = mysqlTable("claim_challenges", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  challengerId: int("challengerId").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClaimChallenge = typeof claimChallenges.$inferSelect;

// ─── Projects (Workspaces) ───────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  ownerId: int("ownerId").notNull(),
  status: mysqlEnum("status", ["active", "archived", "completed"]).default("active").notNull(),
  architectureData: json("architectureData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;

// ─── Project Members ─────────────────────────────────────────────────
export const projectMembers = mysqlTable("project_members", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  memberRole: mysqlEnum("memberRole", ["owner", "editor", "viewer"]).default("editor").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

// ─── Decision Logs ───────────────────────────────────────────────────
export const decisionLogs = mysqlTable("decision_logs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  decision: text("decision"),
  rationale: text("rationale"),
  authorId: int("authorId").notNull(),
  linkedCapabilities: json("linkedCapabilities").$type<number[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Architecture Components (for Builder) ───────────────────────────
export const architectureComponents = mysqlTable("architecture_components", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  type: mysqlEnum("type", ["dcn", "runtime", "network", "controller", "gateway", "sensor", "actuator"]).notNull(),
  description: text("description"),
  properties: json("properties"),
  riskFlags: json("riskFlags").$type<string[]>(),
  opasLayer: varchar("opasLayer", { length: 128 }),
  icon: varchar("icon", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Saved Architectures ─────────────────────────────────────────────
export const savedArchitectures = mysqlTable("saved_architectures", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  components: json("components"),
  connections: json("connections"),
  riskSummary: json("riskSummary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── AI Chat History ─────────────────────────────────────────────────
export const aiChats = mysqlTable("ai_chats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }),
  messages: json("messages").$type<Array<{ role: string; content: string; timestamp: number }>>(),
  context: json("context").$type<{ capabilities?: number[]; projectId?: number }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Migration Plans ─────────────────────────────────────────────────
export const migrationPlans = mysqlTable("migration_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  currentEnvironment: json("currentEnvironment"),
  phases: json("phases"),
  riskProfile: json("riskProfile"),
  costImplications: json("costImplications"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── RFP Documents ───────────────────────────────────────────────────
// ─── Knowledge Categories ──────────────────────────────────────────
export const knowledgeCategories = mysqlTable("knowledge_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }),
  parentId: int("parentId"),
  order: int("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeCategory = typeof knowledgeCategories.$inferSelect;
export type InsertKnowledgeCategory = typeof knowledgeCategories.$inferInsert;

// ─── RFP Documents ───────────────────────────────────────────────────
export const rfpDocuments = mysqlTable("rfp_documents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  selectedCapabilities: json("selectedCapabilities").$type<number[]>(),
  generatedContent: text("generatedContent"),
  evaluationCriteria: json("evaluationCriteria"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});


// ─── OPA Community Forum ──────────────────────────────────────────────
export const forumCategories = mysqlTable("forum_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }),
  parentId: int("parentId").default(0).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumCategory = typeof forumCategories.$inferSelect;
export type InsertForumCategory = typeof forumCategories.$inferInsert;

export const discussions = mysqlTable("discussions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  content: text("content").notNull(),
  authorId: int("authorId").notNull(),
  categoryId: int("categoryId").notNull(),
  groupId: int("groupId"),
  postType: mysqlEnum("postType", ["question", "discussion", "insight", "announcement", "case_study", "draft"]).default("discussion").notNull(),
  tags: json("tags").$type<string[]>(),
  acceptedPostId: int("acceptedPostId"),
  aiSummary: text("aiSummary"),
  promotedArticleId: int("promotedArticleId"),
  youtubeUrl: varchar("youtubeUrl", { length: 512 }),
  mediaUrls: json("mediaUrls").$type<string[]>(),
  isPinned: boolean("isPinned").default(false).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  replyCount: int("replyCount").default(0).notNull(),
  lastReplyAt: timestamp("lastReplyAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Discussion = typeof discussions.$inferSelect;
export type InsertDiscussion = typeof discussions.$inferInsert;

export const forumPosts = mysqlTable("forum_posts", {
  id: int("id").autoincrement().primaryKey(),
  discussionId: int("discussionId").notNull(),
  authorId: int("authorId").notNull(),
  content: text("content").notNull(),
  parentPostId: int("parentPostId"),
  likeCount: int("likeCount").default(0).notNull(),
  isSolution: boolean("isSolution").default(false).notNull(),
  isEditorPick: boolean("isEditorPick").default(false).notNull(),
  mediaUrls: json("mediaUrls").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = typeof forumPosts.$inferInsert;

export const forumGroups = mysqlTable("forum_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  creatorId: int("creatorId").notNull(),
  // "public": listed, join instantly. "private": listed, join requires
  // admin/moderator approval. "secret": NOT listed in any group directory —
  // only reachable via direct link, and joining still requires approval.
  // Replaces the old isPrivate boolean (public/private only) with a third
  // tier, added for the club-app whitelisting work.
  visibility: mysqlEnum("visibility", ["public", "private", "secret"]).default("public").notNull(),
  memberCount: int("memberCount").default(1).notNull(),
  avatarUrl: varchar("avatarUrl", { length: 2048 }),
  coverImageUrl: varchar("coverImageUrl", { length: 2048 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumGroup = typeof forumGroups.$inferSelect;
export type InsertForumGroup = typeof forumGroups.$inferInsert;

export const groupMembers = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["member", "moderator", "admin"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;

export const groupJoinRequests = mysqlTable("group_join_requests", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  message: text("message"), // optional note from the requester
  respondedBy: int("respondedBy"), // group admin/moderator userId who acted on it
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
});

export type GroupJoinRequest = typeof groupJoinRequests.$inferSelect;
export type InsertGroupJoinRequest = typeof groupJoinRequests.$inferInsert;

export const connectionRequests = mysqlTable("connection_requests", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull(),
  recipientId: int("recipientId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
});

export type ConnectionRequest = typeof connectionRequests.$inferSelect;
export type InsertConnectionRequest = typeof connectionRequests.$inferInsert;

export const activityReactions = mysqlTable("activity_reactions", {
  id: int("id").autoincrement().primaryKey(),
  activityId: int("activityId").notNull(), // references activityLog.id
  userId: int("userId").notNull(),
  reactionType: mysqlEnum("reactionType", ["favorite"]).default("favorite").notNull(), // room to add more reaction types later without a migration
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityReaction = typeof activityReactions.$inferSelect;
export type InsertActivityReaction = typeof activityReactions.$inferInsert;

// ─── Document Library ────────────────────────────────────────────────
// Deliberately a separate table from mediaAttachments rather than
// overloading it — mediaAttachments is tightly coupled to contentNodeId/
// projectId elsewhere in the app; keeping this separate means zero risk of
// disturbing that existing behavior. Reuses the same R2/S3 upload plumbing
// (storagePut etc.) at the server layer, just its own metadata table.
export const documentFolders = mysqlTable("document_folders", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId"), // null = club-wide (not scoped to a group)
  parentFolderId: int("parentFolderId"), // null = root folder
  name: varchar("name", { length: 256 }).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DocumentFolder = typeof documentFolders.$inferSelect;
export type InsertDocumentFolder = typeof documentFolders.$inferInsert;

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  folderId: int("folderId"), // null = sits at library root
  groupId: int("groupId"), // null = club-wide, visible to all members
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  fileKey: varchar("fileKey", { length: 1024 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  sizeBytes: int("sizeBytes"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LibraryDocument = typeof documents.$inferSelect;
export type InsertLibraryDocument = typeof documents.$inferInsert;

// ─── Custom Profile Fields ───────────────────────────────────────────
// Admin-configurable fields, in addition to the fixed columns already on
// userProfiles (bio, company, jobTitle, location, website). Separate
// definition + value tables (rather than a JSON blob on userProfiles) so
// field types, required-ness, and ordering can be managed and validated
// server-side without a schema migration every time a club wants a new field.
export const profileFieldDefinitions = mysqlTable("profile_field_definitions", {
  id: int("id").autoincrement().primaryKey(),
  fieldKey: varchar("fieldKey", { length: 64 }).notNull().unique(), // stable identifier, e.g. "t_shirt_size"
  label: varchar("label", { length: 128 }).notNull(), // display label, e.g. "T-Shirt Size"
  fieldType: mysqlEnum("fieldType", ["text", "textarea", "select", "url", "date", "number"]).default("text").notNull(),
  options: json("options").$type<string[]>(), // choices, only used when fieldType === "select"
  isRequired: boolean("isRequired").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProfileFieldDefinition = typeof profileFieldDefinitions.$inferSelect;
export type InsertProfileFieldDefinition = typeof profileFieldDefinitions.$inferInsert;

export const profileFieldValues = mysqlTable("profile_field_values", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fieldDefinitionId: int("fieldDefinitionId").notNull(),
  value: text("value"),
}, (table) => ({
  userFieldUnique: unique("profile_field_values_user_field_unique").on(table.userId, table.fieldDefinitionId),
}));
export type ProfileFieldValue = typeof profileFieldValues.$inferSelect;
export type InsertProfileFieldValue = typeof profileFieldValues.$inferInsert;

export const directMessages = mysqlTable("direct_messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = typeof directMessages.$inferInsert;

export const forumNotifications = mysqlTable("forum_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["reply", "mention", "message", "group_invite", "verification"]).notNull(),
  relatedUserId: int("relatedUserId"),
  discussionId: int("discussionId"),
  postId: int("postId"),
  groupId: int("groupId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ForumNotification = typeof forumNotifications.$inferSelect;
export type InsertForumNotification = typeof forumNotifications.$inferInsert;

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  bio: text("bio"),
  company: varchar("company", { length: 256 }),
  jobTitle: varchar("jobTitle", { length: 128 }),
  location: varchar("location", { length: 128 }),
  website: varchar("website", { length: 256 }),
  discussionCount: int("discussionCount").default(0).notNull(),
  postCount: int("postCount").default(0).notNull(),
  followerCount: int("followerCount").default(0).notNull(),
  followingCount: int("followingCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── Member Follows (Social) ────────────────────────────────────────
export const memberFollows = mysqlTable("member_follows", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(),
  followingId: int("followingId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemberFollow = typeof memberFollows.$inferSelect;
export type InsertMemberFollow = typeof memberFollows.$inferInsert;

// ─── Member Badges (Gamification) ──────────────────────────────────
export const memberBadges = mysqlTable("member_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeType: mysqlEnum("badgeType", [
    "first_discussion",
    "first_post",
    "active_member",
    "group_leader",
    "expert",
    "trusted_member",
    "community_champion",
    "verified",
  ]).notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 256 }),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type MemberBadge = typeof memberBadges.$inferSelect;
export type InsertMemberBadge = typeof memberBadges.$inferInsert;

// ─── Activity Log (Tracking) ────────────────────────────────────────
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", [
    "discussion_created",
    "post_created",
    "group_joined",
    "member_followed",
    "badge_earned",
    "content_published",
    "group_created",
  ]).notNull(),
  relatedUserId: int("relatedUserId"),
  discussionId: int("discussionId"),
  groupId: int("groupId"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

// ─── Points Transactions (Gamification) ────────────────────────────
export const pointsTransactions = mysqlTable("points_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  points: int("points").notNull(),
  reason: varchar("reason", { length: 256 }).notNull(),
  activityType: varchar("activityType", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = typeof pointsTransactions.$inferInsert;

// ─── Group Announcements ────────────────────────────────────────────
export const groupAnnouncements = mysqlTable("group_announcements", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GroupAnnouncement = typeof groupAnnouncements.$inferSelect;
export type InsertGroupAnnouncement = typeof groupAnnouncements.$inferInsert;

// ─── Blog Posts ─────────────────────────────────────────────────────
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImageUrl: text("coverImageUrl"),
  authorId: int("authorId").notNull(),
  status: mysqlEnum("status", ["draft", "published", "coming_soon"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;


// ─── Events ─────────────────────────────────────────────────────────
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  eventType: mysqlEnum("eventType", ["webinar", "ama", "roundtable", "working_group", "conference", "office_hours", "training_cohort"]).default("webinar").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  location: varchar("location", { length: 512 }),
  isVirtual: boolean("isVirtual").default(false).notNull(),
  meetingUrl: text("meetingUrl"),
  replayUrl: text("replayUrl"),
  relatedDiscussionId: int("relatedDiscussionId"),
  coverImageUrl: text("coverImageUrl"),
  organizerId: int("organizerId").notNull(),
  maxAttendees: int("maxAttendees"),
  status: mysqlEnum("status", ["upcoming", "ongoing", "completed", "cancelled"]).default("upcoming").notNull(),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Event RSVPs ─────────────────────────────────────────────────────
export const eventRsvps = mysqlTable("event_rsvps", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["going", "maybe", "not_going"]).default("going").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertEventRsvp = typeof eventRsvps.$inferInsert;

// ─── Courses ─────────────────────────────────────────────────────────
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),
  excerpt: text("excerpt"),
  coverImageUrl: text("coverImageUrl"),
  authorId: int("authorId").notNull(),
  level: mysqlEnum("level", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  category: varchar("category", { length: 128 }),
  duration: varchar("duration", { length: 64 }),
  lessonCount: int("lessonCount").default(0).notNull(),
  isFree: boolean("isFree").default(true).notNull(),
  status: mysqlEnum("status", ["draft", "published", "coming_soon"]).default("draft").notNull(),
  enrollmentCount: int("enrollmentCount").default(0).notNull(),
  linkedDiscussionId: int("linkedDiscussionId"),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

// ─── Lessons ─────────────────────────────────────────────────────────
export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),

  videoSource: mysqlEnum("videoSource", ["cloudflare_stream", "r2", "youtube", "none"]).default("cloudflare_stream").notNull(),
  streamVideoId: varchar("streamVideoId", { length: 64 }),
  videoUrl: text("videoUrl"),
  videoDurationSeconds: int("videoDurationSeconds"),
  thumbnailUrl: text("thumbnailUrl"),

  supplementMarkdown: text("supplementMarkdown"),

  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;

// ─── Lesson Progress ─────────────────────────────────────────────────
export const lessonProgress = mysqlTable("lesson_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  watchedSeconds: int("watchedSeconds").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = typeof lessonProgress.$inferInsert;

// ─── Course Enrollments ───────────────────────────────────────────────
export const courseEnrollments = mysqlTable("course_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  userId: int("userId").notNull(),
  progress: int("progress").default(0).notNull(), // 0-100
  completedAt: timestamp("completedAt"),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
});
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type InsertCourseEnrollment = typeof courseEnrollments.$inferInsert;

// ─── Workflow Settings ────────────────────────────────────────────────
export const workflowSettings = mysqlTable("workflow_settings", {
  id: int("id").autoincrement().primaryKey(),
  workflowKey: varchar("workflowKey", { length: 128 }).notNull().unique(),
  label: varchar("label", { length: 256 }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WorkflowSetting = typeof workflowSettings.$inferSelect;
export type InsertWorkflowSetting = typeof workflowSettings.$inferInsert;

// ─── Workflow Events Log ──────────────────────────────────────────────
export const workflowEvents = mysqlTable("workflow_events", {
  id: int("id").autoincrement().primaryKey(),
  workflowKey: varchar("workflowKey", { length: 128 }).notNull(),
  triggerUserId: int("triggerUserId"),
  targetUserId: int("targetUserId"),
  entityType: varchar("entityType", { length: 64 }), // 'post', 'discussion', 'member', etc.
  entityId: int("entityId"),
  payload: text("payload"), // JSON string with context
  status: mysqlEnum("status", ["success", "failed", "skipped"]).default("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WorkflowEvent = typeof workflowEvents.$inferSelect;
export type InsertWorkflowEvent = typeof workflowEvents.$inferInsert;

// ─── Rich Notifications (Workflow) ───────────────────────────────────────────
export const notificationsTable = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull().default("system"), // system, reply, follow, moderation, etc.
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content"),
  link: varchar("link", { length: 512 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;

// ─── Digest Send History ─────────────────────────────────────────────────────
export const digestSends = mysqlTable("digest_sends", {
  id: int("id").autoincrement().primaryKey(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  sentByUserId: int("sentByUserId"), // null = scheduled/automated
  recipientCount: int("recipientCount").default(0).notNull(),
  newDiscussions: int("newDiscussions").default(0).notNull(),
  newBlogPosts: int("newBlogPosts").default(0).notNull(),
  upcomingEvents: int("upcomingEvents").default(0).notNull(),
  newMembers: int("newMembers").default(0).notNull(),
  contentSummary: text("contentSummary"), // JSON snapshot of digest content
});
export type DigestSend = typeof digestSends.$inferSelect;
export type InsertDigestSend = typeof digestSends.$inferInsert;

// ─── Email Digest Preferences ────────────────────────────────────────────────
export const emailDigestPreferences = mysqlTable("email_digest_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly", "never"]).default("weekly").notNull(),
  dayOfWeek: int("dayOfWeek").default(1),
  hourOfDay: int("hourOfDay").default(9),
  includeNewDiscussions: boolean("includeNewDiscussions").default(true).notNull(),
  includePopularDiscussions: boolean("includePopularDiscussions").default(true).notNull(),
  includeNewBlogPosts: boolean("includeNewBlogPosts").default(true).notNull(),
  includeUpcomingEvents: boolean("includeUpcomingEvents").default(true).notNull(),
  includeNewMembers: boolean("includeNewMembers").default(false).notNull(),
  minEngagementLevel: mysqlEnum("minEngagementLevel", ["all", "high", "very_high"]).default("all").notNull(),
  lastSentAt: timestamp("lastSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailDigestPreference = typeof emailDigestPreferences.$inferSelect;
export type InsertEmailDigestPreference = typeof emailDigestPreferences.$inferInsert;

// ─── Organizations ───────────────────────────────────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  type: mysqlEnum("type", ["owner_operator", "epc_integrator", "vendor", "consultant", "research", "other"]).default("other").notNull(),
  website: varchar("website", { length: 512 }),
  description: text("description"),
  logoUrl: text("logoUrl"),
  industry: varchar("industry", { length: 128 }),
  sizeBand: mysqlEnum("sizeBand", ["1-10", "11-50", "51-200", "201-1000", "1000+"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Expertise Tags ──────────────────────────────────────────────────────────
export const expertiseTags = mysqlTable("expertise_tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  category: mysqlEnum("category", ["technology", "standard", "lifecycle", "industry", "role"]).default("technology").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExpertiseTag = typeof expertiseTags.$inferSelect;

// ─── User Expertise (Join) ───────────────────────────────────────────────────
export const userExpertise = mysqlTable("user_expertise", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tagId: int("tagId").notNull(),
  level: mysqlEnum("level", ["beginner", "intermediate", "expert"]).default("intermediate").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // Fixes a pre-existing bug: this table had NO unique constraint on
  // (userId, tagId), so addUserExpertise()'s onDuplicateKeyUpdate() was
  // silently a no-op — every call inserted a new row rather than updating,
  // letting duplicate pairs accumulate. Discovered during a Postgres
  // conversion evaluation (later reverted — staying on MySQL), kept because
  // it's a real fix independent of that decision. Existing data should be
  // de-duplicated (one row per userId+tagId) before this migrates, or the
  // migration will fail on the duplicates.
  userTagUnique: unique("user_expertise_user_tag_unique").on(table.userId, table.tagId),
}));
export type UserExpertise = typeof userExpertise.$inferSelect;

// ─── Polymorphic Follows ─────────────────────────────────────────────────────
export const follows = mysqlTable("follows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetType: mysqlEnum("targetType", ["space", "post", "tag", "user", "course", "event"]).notNull(),
  targetId: int("targetId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Follow = typeof follows.$inferSelect;

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  actionType: varchar("actionType", { length: 128 }).notNull(),
  targetType: varchar("targetType", { length: 64 }),
  targetId: int("targetId"),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;

// ─── Expert Verification Requests ───────────────────────────────────────────
export const verificationRequests = mysqlTable("verification_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  linkedInUrl: varchar("linkedInUrl", { length: 512 }),
  credentials: text("credentials"),
  statement: text("statement"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});
export type VerificationRequest = typeof verificationRequests.$inferSelect;
// ─── Global Tags ─────────────────────────────────────────────────────────────
export const globalTags = mysqlTable("global_tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GlobalTag = typeof globalTags.$inferSelect;
// ─── Post Tags (join table) ───────────────────────────────────────────────────
export const postTags = mysqlTable("post_tags", {
  id: int("id").autoincrement().primaryKey(),
  tagId: int("tagId").notNull(),
  targetType: varchar("targetType", { length: 64 }).notNull(), // 'discussion' | 'content_node' | 'blog_post' | 'course'
  targetId: int("targetId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PostTag = typeof postTags.$inferSelect;
// ─── Quizzes ─────────────────────────────────────────────────────────────────
// A quiz belongs to either a course (legacy/final assessment) or a lesson
// (per-lesson gate). Exactly one of courseId / lessonId should be set per row;
// enforced at the app layer.
export const quizzes = mysqlTable("quizzes", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  lessonId: int("lessonId"),
  title: varchar("title", { length: 256 }).notNull(),
  passingScore: int("passingScore").default(70).notNull(), // percent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Quiz = typeof quizzes.$inferSelect;
// ─── Quiz Questions ───────────────────────────────────────────────────────────
export const quizQuestions = mysqlTable("quiz_questions", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull(),
  question: text("question").notNull(),
  options: json("options").$type<string[]>().notNull(),
  correctIndex: int("correctIndex").notNull(),
  explanation: text("explanation"),
  displayOrder: int("displayOrder").default(0).notNull(),
});
export type QuizQuestion = typeof quizQuestions.$inferSelect;
// ─── Quiz Attempts ────────────────────────────────────────────────────────────
export const quizAttempts = mysqlTable("quiz_attempts", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull(),
  userId: int("userId").notNull(),
  score: int("score").notNull(), // percent
  passed: boolean("passed").default(false).notNull(),
  answers: json("answers").$type<number[]>().notNull(), // selected option indices
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});
export type QuizAttempt = typeof quizAttempts.$inferSelect;
// ─── Role Promotion Requests ──────────────────────────────────────────────────
export const rolePromotionRequests = mysqlTable("role_promotion_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  requestedRole: varchar("requestedRole", { length: 64 }).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});
export type RolePromotionRequest = typeof rolePromotionRequests.$inferSelect;


// ─── Case Studies ─────────────────────────────────────────────────────────────
export const caseStudies = mysqlTable("case_studies", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description").notNull(),
  summary: text("summary"),
  industry: varchar("industry", { length: 128 }).notNull(),
  companySize: mysqlEnum("companySize", ["startup", "small", "medium", "large", "enterprise"]).notNull(),
  roi: varchar("roi", { length: 128 }), // e.g., "25% cost reduction", "40% faster deployment"
  implementationTimeline: varchar("implementationTimeline", { length: 128 }), // e.g., "6 months", "12 weeks"
  techStack: text("techStack"), // JSON array or comma-separated
  keyResults: text("keyResults"), // bullet points or JSON
  challenges: text("challenges"),
  lessons: text("lessons"),
  authorId: int("authorId").notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "featured"]).default("submitted").notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  coverImageUrl: text("coverImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CaseStudy = typeof caseStudies.$inferSelect;
export type InsertCaseStudy = typeof caseStudies.$inferInsert;

// ─── Benchmarking Data ─────────────────────────────────────────────────────────
export const benchmarkingData = mysqlTable("benchmarking_data", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  isAnonymous: boolean("isAnonymous").default(true).notNull(),
  industry: varchar("industry", { length: 128 }).notNull(),
  companySize: mysqlEnum("companySize", ["startup", "small", "medium", "large", "enterprise"]).notNull(),
  roi: varchar("roi", { length: 128 }), // e.g., "25%", "40%", "Not yet measured"
  implementationTimeline: varchar("implementationTimeline", { length: 128 }), // e.g., "6 months", "12 weeks"
  teamSize: int("teamSize"), // number of people
  techStack: text("techStack"), // JSON array or comma-separated
  challenges: text("challenges"),
  keySuccesses: text("keySuccesses"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});
export type BenchmarkingData = typeof benchmarkingData.$inferSelect;
export type InsertBenchmarkingData = typeof benchmarkingData.$inferInsert;

// ─── Consulting Services ───────────────────────────────────────────────────────
export const consultingServices = mysqlTable("consulting_services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description").notNull(),
  serviceType: mysqlEnum("serviceType", ["architecture_review", "custom_training", "implementation_advisory"]).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: varchar("duration", { length: 128 }), // e.g., "2 hours", "1 week", "Ongoing"
  maxSlotsPerMonth: int("maxSlotsPerMonth"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ConsultingService = typeof consultingServices.$inferSelect;
export type InsertConsultingService = typeof consultingServices.$inferInsert;

// ─── Consulting Inquiries ──────────────────────────────────────────────────────
export const consultingInquiries = mysqlTable("consulting_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  serviceId: int("serviceId").notNull(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  message: text("message"),
  preferredDate: timestamp("preferredDate"),
  status: mysqlEnum("status", ["new", "contacted", "scheduled", "completed", "cancelled"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
  adminNotes: text("adminNotes"),
});
export type ConsultingInquiry = typeof consultingInquiries.$inferSelect;
export type InsertConsultingInquiry = typeof consultingInquiries.$inferInsert;

// ─── Certificates ─────────────────────────────────────────────────────────────
export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId"),
  certificateType: mysqlEnum("certificateType", ["course_completion", "opa_practitioner"]).notNull(),
  uniqueId: varchar("uniqueId", { length: 64 }).notNull().unique(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  certificateUrl: text("certificateUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

// ─── Section Hero Images ────────────────────────────────────────────────────
export const sectionHeroes = mysqlTable("section_heroes", {
  id: int("id").autoincrement().primaryKey(),
  sectionKey: varchar("sectionKey", { length: 64 }).notNull().unique(), // e.g. "community", "training", "events", "blog", "knowledge", "members"
  heroImageUrl: text("heroImageUrl").notNull(),
  title: varchar("title", { length: 256 }),
  subtitle: text("subtitle"),
  updatedByUserId: int("updatedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SectionHero = typeof sectionHeroes.$inferSelect;
export type InsertSectionHero = typeof sectionHeroes.$inferInsert;

// ─── Email Blasts ────────────────────────────────────────────────────
// Audit log for admin-authored mass emails to members.
export const emailBlasts = mysqlTable("email_blasts", {
  id: int("id").autoincrement().primaryKey(),
  sentBy: int("sentBy").notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  bodyMarkdown: text("bodyMarkdown").notNull(),
  recipientCount: int("recipientCount").notNull(),
  sentCount: int("sentCount").notNull(),
  failedCount: int("failedCount").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type EmailBlast = typeof emailBlasts.$inferSelect;

// ─── Magic-Link Tokens ──────────────────────────────────────────────
export const magicLinkTokens = mysqlTable("magic_link_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
});

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = typeof magicLinkTokens.$inferInsert;

// ─── API Tokens (personal tokens for programmatic/MCP access) ───────
export const apiTokens = mysqlTable("api_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  revokedAt: timestamp("revokedAt"),
});

export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = typeof apiTokens.$inferInsert;
