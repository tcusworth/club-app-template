/**
 * Weekly Digest Cron Job
 *
 * Runs every Monday at 9:00 AM (server time) and sends a branded HTML email
 * digest to all opted-in members. Also sends an in-app notification and
 * logs the send to the digest_sends table.
 *
 * Can also be triggered manually via the admin panel (digest.send mutation).
 */

import cron from "node-cron";
import * as db from "./db";
import { buildWeeklyDigestEmail, sendEmail } from "./email";

/** Assemble digest data and send emails + in-app notifications to all subscribers */
export async function executeWeeklyDigest(): Promise<{
  success: boolean;
  emailsSent: number;
  notificationsSent: number;
  errors: number;
}> {
  console.log("[digest-cron] Starting weekly digest generation...");

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentDiscussions, recentBlogPosts, upcomingEvents, newMembers, stats, subscribers] =
    await Promise.all([
      db.getRecentDiscussions(oneWeekAgo, 10),
      db.getRecentBlogPosts(oneWeekAgo, 5),
      db.getUpcomingEvents(5),
      db.getNewMembers(oneWeekAgo, 10),
      db.getPlatformStats(),
      db.getDigestSubscribers(),
    ]);

  if (subscribers.length === 0) {
    console.log("[digest-cron] No subscribers opted in — skipping.");
    return { success: true, emailsSent: 0, notificationsSent: 0, errors: 0 };
  }

  // Determine base URL from env (production domain or fallback)
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  // Build digest content summary for in-app notification
  const discussionsSection =
    recentDiscussions.length > 0
      ? recentDiscussions.map((d: any) => `- ${d.title} (${d.replyCount} replies)`).join("\n")
      : "No new discussions this week.";
  const blogSection =
    recentBlogPosts.length > 0
      ? recentBlogPosts.map((p: any) => `- ${p.title} by ${p.authorName ?? "Community Member"}`).join("\n")
      : "No new blog posts this week.";
  const eventsSection =
    upcomingEvents.length > 0
      ? upcomingEvents.map((e: any) => `- ${e.title} (${new Date(e.startDate).toLocaleDateString()})`).join("\n")
      : "No upcoming events.";
  const membersSection =
    newMembers.length > 0
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

  let emailsSent = 0;
  let notificationsSent = 0;
  let errors = 0;

  // Get DB connection for in-app notifications
  const { notificationsTable } = await import("../drizzle/schema");
  const { getDb } = await import("./db");
  const dbConn = await getDb();

  for (const sub of subscribers) {
    const subAny = sub as any;
    const recipientName = subAny.name ?? "Community Member";
    const recipientEmail = subAny.email;

    // 1. Send HTML email
    if (recipientEmail) {
      try {
        const { subject, html, text } = buildWeeklyDigestEmail({
          recipientName,
          discussions: recentDiscussions.map((d: any) => ({
            title: d.title,
            replyCount: d.replyCount ?? 0,
            viewCount: d.viewCount ?? 0,
            slug: d.slug,
            authorName: d.authorName,
          })),
          blogPosts: recentBlogPosts.map((b: any) => ({
            title: b.title,
            slug: b.slug,
            authorName: b.authorName,
            excerpt: b.excerpt,
          })),
          events: upcomingEvents.map((e: any) => ({
            title: e.title,
            startDate: e.startDate,
            eventType: e.eventType,
          })),
          newMembers: newMembers.map((m: any) => ({
            name: m.name ?? "New Member",
            organization: m.organization,
          })),
          stats: {
            totalMembers: stats.users ?? 0,
            totalDiscussions: recentDiscussions.length,
            totalArticles: stats.content ?? 0,
            newThisWeek: newMembers.length,
          },
          baseUrl,
        });

        const sent = await sendEmail({ to: recipientEmail, subject, html, text });
        if (sent) emailsSent++;
        else errors++;
      } catch (err) {
        console.error(`[digest-cron] Email failed for ${recipientEmail}:`, err);
        errors++;
      }
    }

    // 2. Send in-app notification
    if (dbConn) {
      try {
        await dbConn.insert(notificationsTable).values({
          userId: subAny.id,
          type: "digest",
          title: "OPA Community Weekly Digest",
          content: digestContent,
          link: "/community",
          isRead: false,
        });
        await db.updateLastDigestSent(subAny.id);
        notificationsSent++;
      } catch (err) {
        console.error(`[digest-cron] Notification failed for user ${subAny.id}:`, err);
      }
    }
  }

  // Log the send
  const contentSummary = JSON.stringify({
    discussions: recentDiscussions.length,
    blogPosts: recentBlogPosts.length,
    events: upcomingEvents.length,
    members: newMembers.length,
  });

  await db.logDigestSend({
    sentByUserId: 0, // system-triggered (cron)
    recipientCount: emailsSent + notificationsSent,
    newDiscussions: recentDiscussions.length,
    newBlogPosts: recentBlogPosts.length,
    upcomingEvents: upcomingEvents.length,
    newMembers: newMembers.length,
    contentSummary,
  });

  // Notify owner
  try {
    const { notifyOwner } = await import("./_core/notification");
    await notifyOwner({
      title: `Weekly Digest Sent — ${emailsSent} emails, ${notificationsSent} notifications`,
      content: `Digest delivered to ${subscribers.length} subscribers.\nEmails: ${emailsSent} | In-app: ${notificationsSent} | Errors: ${errors}\n\n${digestContent}`,
    });
  } catch {}

  console.log(
    `[digest-cron] Complete: ${emailsSent} emails, ${notificationsSent} notifications, ${errors} errors`
  );

  return { success: true, emailsSent, notificationsSent, errors };
}

/** Start the cron schedule: every Monday at 9:00 AM */
export function startDigestCron(): void {
  // Cron expression: minute hour dayOfMonth month dayOfWeek
  // "0 9 * * 1" = every Monday at 09:00
  const task = cron.schedule("0 9 * * 1", async () => {
    console.log("[digest-cron] Triggered by cron schedule (Monday 9:00 AM)");
    try {
      const result = await executeWeeklyDigest();
      console.log("[digest-cron] Result:", JSON.stringify(result));
    } catch (err) {
      console.error("[digest-cron] Fatal error:", err);
    }
  });

  console.log("[digest-cron] Scheduled: every Monday at 9:00 AM");
  task.start();
}
