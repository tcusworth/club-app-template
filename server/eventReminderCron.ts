/**
 * Event Reminder Cron Job
 * Runs every hour and sends 24h reminder emails to RSVPed attendees
 * for events starting within the next 24-25 hours (1h window to avoid duplicates).
 * Uses the reminderSent flag on the events table to prevent duplicate sends.
 */

import cron from "node-cron";
import { getDb } from "./db";
import { events, eventRsvps, users } from "../drizzle/schema";
import { eq, and, between, or } from "drizzle-orm";
import { sendEmail } from "./email";

function buildEventReminderEmail(opts: {
  name: string;
  eventTitle: string;
  eventType: string;
  startDate: Date;
  location: string | null;
  isVirtual: boolean;
  meetingUrl: string | null;
  eventUrl: string;
}): { subject: string; html: string; text: string } {
  const dateStr = opts.startDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const locationLine = opts.isVirtual
    ? opts.meetingUrl
      ? `<p><strong>Join Link:</strong> <a href="${opts.meetingUrl}">${opts.meetingUrl}</a></p>`
      : `<p><strong>Format:</strong> Virtual</p>`
    : opts.location
      ? `<p><strong>Location:</strong> ${opts.location}</p>`
      : "";

  const subject = `Reminder: "${opts.eventTitle}" starts tomorrow`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
      <div style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700;">⏰ Event Reminder</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Your event starts in ~24 hours</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #94a3b8; margin: 0 0 8px;">Hi ${opts.name},</p>
        <p style="color: #e2e8f0; margin: 0 0 24px;">Just a reminder that you're registered for:</p>
        <div style="background: #0f172a; border-radius: 8px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
          <h2 style="color: #f1f5f9; margin: 0 0 12px; font-size: 18px;">${opts.eventTitle}</h2>
          <p style="color: #94a3b8; margin: 0 0 8px; font-size: 14px;"><strong style="color: #cbd5e1;">When:</strong> ${dateStr}</p>
          <p style="color: #94a3b8; margin: 0 0 8px; font-size: 14px;"><strong style="color: #cbd5e1;">Type:</strong> ${opts.eventType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
          ${locationLine}
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${opts.eventUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #6366f1); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Event Details</a>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">You're receiving this because you RSVP'd as "Going". <br>Manage your events at <a href="${opts.eventUrl}" style="color: #0ea5e9;">OPA Community OS</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Reminder: "${opts.eventTitle}" starts tomorrow\n\nHi ${opts.name},\n\nYou're registered for: ${opts.eventTitle}\nWhen: ${dateStr}\n\nView details: ${opts.eventUrl}`;

  return { subject, html, text };
}

async function sendEventReminders() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find upcoming events starting in the 24-25h window that haven't had reminders sent
    const db = await getDb();
    if (!db) return;

    // Find upcoming events starting in the 24-25h window that haven't had reminders sent
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.reminderSent, false),
          eq(events.status, "upcoming"),
          between(events.startDate, in24h, in25h)
        )
      );

    if (upcomingEvents.length === 0) return;

    console.log(`[event-reminder] Found ${upcomingEvents.length} event(s) needing reminders`);

    for (const event of upcomingEvents) {
      // Get all "going" RSVPs for this event
      const rsvps = await db
        .select({ userId: eventRsvps.userId })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.status, "going")));

      if (rsvps.length === 0) {
        // Mark as sent even if no attendees to avoid re-checking
        await db.update(events).set({ reminderSent: true }).where(eq(events.id, event.id));
        continue;
      }

      const userIds = rsvps.map((r: { userId: number }) => r.userId);
      const attendees = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(
          or(...userIds.map((id: number) => eq(users.id, id)))
        );

      const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
      const eventUrl = `${baseUrl}/events`;

      let sentCount = 0;
      for (const attendee of attendees) {
        if (!attendee.email) continue;
        const emailContent = buildEventReminderEmail({
          name: attendee.name || "Member",
          eventTitle: event.title,
          eventType: event.eventType,
          startDate: event.startDate,
          location: event.location,
          isVirtual: event.isVirtual,
          meetingUrl: event.meetingUrl,
          eventUrl,
        });
        const sent = await sendEmail({
          to: attendee.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
        if (sent) sentCount++;
      }

      // Mark reminder as sent
      await db.update(events).set({ reminderSent: true }).where(eq(events.id, event.id));
      console.log(`[event-reminder] Sent ${sentCount}/${attendees.length} reminders for "${event.title}"`);
    }
  } catch (err) {
    console.error("[event-reminder] Error:", err);
  }
}

export function startEventReminderCron() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", () => {
    console.log("[event-reminder] Running hourly check...");
    sendEventReminders();
  });
  console.log("[event-reminder] Scheduled: hourly check for 24h event reminders");
}
