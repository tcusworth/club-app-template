/**
 * OCOS Workflow Engine
 * Automated triggers: welcome, moderation, reply notifications, follows, etc.
 * Email delivery is wired in for key events when the user has an email address
 * and has not opted out of notifications (digestOptIn = true).
 */
import { getDb } from "./db";
import { workflowSettings, workflowEvents, notificationsTable, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { sendEmail, buildWelcomeEmail, buildNotificationEmail } from "./email";

export type WorkflowKey =
  | "new_member_welcome"
  | "post_submitted_moderation"
  | "post_approved"
  | "post_rejected"
  | "new_discussion_reply"
  | "new_follower"
  | "new_blog_comment"
  | "new_event_rsvp";

interface WorkflowContext {
  triggerUserId?: number;
  targetUserId?: number;
  entityType?: string;
  entityId?: number;
  payload?: Record<string, unknown>;
}

async function isWorkflowEnabled(key: WorkflowKey): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ enabled: workflowSettings.enabled })
    .from(workflowSettings)
    .where(eq(workflowSettings.workflowKey, key))
    .limit(1);
  if (!rows.length) return true;
  return rows[0].enabled;
}

async function logEvent(key: WorkflowKey, ctx: WorkflowContext, status: "success" | "failed" | "skipped") {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(workflowEvents).values({
      workflowKey: key,
      triggerUserId: ctx.triggerUserId ?? null,
      targetUserId: ctx.targetUserId ?? null,
      entityType: ctx.entityType ?? null,
      entityId: ctx.entityId ?? null,
      payload: ctx.payload ? JSON.stringify(ctx.payload) : null,
      status,
    });
  } catch (e) {
    console.error("[Workflow] log failed:", e);
  }
}

async function sendNotification(userId: number, title: string, content: string, link?: string) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(notificationsTable).values({
      userId,
      type: "system",
      title,
      content: content ?? null,
      link: link ?? null,
      isRead: false,
    });
  } catch (e) {
    console.error("[Workflow] notification failed:", e);
  }
}

/** Fetch user email + name + opt-in preference in one query */
async function getUserEmailInfo(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ email: users.email, name: users.name, digestOptIn: users.digestOptIn })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

async function run(key: WorkflowKey, ctx: WorkflowContext, action: () => Promise<void>) {
  try {
    const enabled = await isWorkflowEnabled(key);
    if (!enabled) { await logEvent(key, ctx, "skipped"); return; }
    await action();
    await logEvent(key, ctx, "success");
  } catch (e) {
    console.error(`[Workflow] ${key} failed:`, e);
    await logEvent(key, ctx, "failed");
  }
}

// ─── Exported Triggers ────────────────────────────────────────────────────────

export async function triggerNewMemberWelcome(userId: number, userName: string) {
  await run("new_member_welcome", { triggerUserId: userId, entityType: "member", entityId: userId }, async () => {
    await sendNotification(userId, "Welcome to the OPA Community!", `Hi ${userName}! Start by completing your profile, joining a group, and introducing yourself in the forum.`, "/community");
    await notifyOwner({ title: "New Member Joined", content: `${userName} just joined the OPA Community.` });
    // Send welcome email
    const u = await getUserEmailInfo(userId);
    if (u?.email) {
      const { subject, html, text } = buildWelcomeEmail(userName);
      await sendEmail({ to: u.email, subject, html, text }).catch(console.error);
    }
  });
}

export async function triggerPostSubmittedForModeration(authorId: number, authorName: string, postTitle: string, postId: number, postType: "discussion" | "blog") {
  await run("post_submitted_moderation", { triggerUserId: authorId, entityType: postType, entityId: postId, payload: { title: postTitle } }, async () => {
    await notifyOwner({ title: `New ${postType === "blog" ? "Blog Post" : "Discussion"} Pending Review`, content: `"${postTitle}" by ${authorName} is awaiting moderation. Review it in the Admin panel.` });
  });
}

export async function triggerPostApproved(authorId: number, postTitle: string, postId: number, postType: "discussion" | "blog") {
  await run("post_approved", { targetUserId: authorId, entityType: postType, entityId: postId }, async () => {
    const link = postType === "blog" ? `/blog/${postId}` : `/community/${postId}`;
    await sendNotification(authorId, "Your post was approved!", `"${postTitle}" is now live in the community.`, link);
    // Email notification
    const u = await getUserEmailInfo(authorId);
    if (u?.email && u.digestOptIn !== false) {
      const { subject, html, text } = buildNotificationEmail({
        recipientName: u.name ?? "Member",
        notificationType: "reply",
        actorName: "OPA Community",
        contentTitle: postTitle,
        contentUrl: `${BASE_URL}${link}`,
      });
      await sendEmail({ to: u.email, subject: `Your post "${postTitle}" is now live`, html, text }).catch(console.error);
    }
  });
}

export async function triggerPostRejected(authorId: number, postTitle: string, reason?: string) {
  await run("post_rejected", { targetUserId: authorId, payload: { title: postTitle, reason } }, async () => {
    await sendNotification(authorId, "Your post was not approved", reason ? `"${postTitle}" was not approved. Reason: ${reason}` : `"${postTitle}" was not approved. Please review the community guidelines.`, "/community");
  });
}

export async function triggerNewDiscussionReply(replyAuthorId: number, replyAuthorName: string, discussionAuthorId: number, discussionTitle: string, discussionSlug: string) {
  if (replyAuthorId === discussionAuthorId) return;
  await run("new_discussion_reply", { triggerUserId: replyAuthorId, targetUserId: discussionAuthorId, entityType: "discussion" }, async () => {
    await sendNotification(discussionAuthorId, `${replyAuthorName} replied to your discussion`, `New reply on "${discussionTitle}"`, `/community/${discussionSlug}`);
    // Email notification
    const u = await getUserEmailInfo(discussionAuthorId);
    if (u?.email && u.digestOptIn !== false) {
      const { subject, html, text } = buildNotificationEmail({
        recipientName: u.name ?? "Member",
        notificationType: "reply",
        actorName: replyAuthorName,
        contentTitle: discussionTitle,
        contentUrl: `${BASE_URL}/community/discussion/${discussionSlug}`,
      });
      await sendEmail({ to: u.email, subject, html, text }).catch(console.error);
    }
  });
}

export async function triggerNewFollower(followerId: number, followerName: string, followedUserId: number) {
  await run("new_follower", { triggerUserId: followerId, targetUserId: followedUserId }, async () => {
    await sendNotification(followedUserId, `${followerName} started following you`, `You have a new follower in the OPA Community.`, `/members/${followerId}`);
    // Email notification
    const u = await getUserEmailInfo(followedUserId);
    if (u?.email && u.digestOptIn !== false) {
      const { subject, html, text } = buildNotificationEmail({
        recipientName: u.name ?? "Member",
        notificationType: "follow",
        actorName: followerName,
        contentTitle: "",
        contentUrl: `${BASE_URL}/members/${followerId}`,
      });
      await sendEmail({ to: u.email, subject, html, text }).catch(console.error);
    }
  });
}

export async function triggerNewBlogComment(commentAuthorId: number, commentAuthorName: string, blogAuthorId: number, blogTitle: string, blogPostId: number) {
  if (commentAuthorId === blogAuthorId) return;
  await run("new_blog_comment", { triggerUserId: commentAuthorId, targetUserId: blogAuthorId, entityType: "blog", entityId: blogPostId }, async () => {
    await sendNotification(blogAuthorId, `${commentAuthorName} commented on your blog post`, `New comment on "${blogTitle}"`, `/blog/${blogPostId}`);
    // Email notification
    const u = await getUserEmailInfo(blogAuthorId);
    if (u?.email && u.digestOptIn !== false) {
      const { subject, html, text } = buildNotificationEmail({
        recipientName: u.name ?? "Member",
        notificationType: "reply",
        actorName: commentAuthorName,
        contentTitle: blogTitle,
        contentUrl: `${BASE_URL}/blog/${blogPostId}`,
      });
      await sendEmail({ to: u.email, subject, html, text }).catch(console.error);
    }
  });
}

export async function triggerNewEventRsvp(attendeeId: number, attendeeName: string, eventCreatorId: number, eventTitle: string, eventId: number, rsvpStatus: string) {
  if (attendeeId === eventCreatorId) return;
  await run("new_event_rsvp", { triggerUserId: attendeeId, targetUserId: eventCreatorId, entityType: "event", entityId: eventId }, async () => {
    await sendNotification(eventCreatorId, `${attendeeName} RSVPed to your event`, `${attendeeName} marked "${eventTitle}" as ${rsvpStatus}.`, `/events`);
  });
}
