/**
 * Email delivery service using nodemailer.
 *
 * Reads SMTP credentials from environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Falls back to Ethereal (fake SMTP) when credentials are absent so
 * development works without real credentials.
 */

import nodemailer, { Transporter } from "nodemailer";
import { marked } from "marked";
import { CLUB_NAME, CLUB_TAGLINE, CLUB_EMAIL_FROM } from "@shared/clubConfig";

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    const port = parseInt(process.env.SMTP_PORT ?? "587");
    // Auto-detect secure mode: port 465 = implicit TLS, others = STARTTLS
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    console.log(`[email] SMTP configured: ${host}:${port} secure=${secure}`);
  } else {
    // Dev fallback: Ethereal test account (messages visible at https://ethereal.email)
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log("[email] No SMTP credentials found — using Ethereal test account:", testAccount.user);
  }

  return _transporter;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    const from = process.env.SMTP_FROM ?? CLUB_EMAIL_FROM;
    const info = await transporter.sendMail({ from, ...opts });
    if (process.env.SMTP_HOST) {
      console.log("[email] Sent:", info.messageId);
    } else {
      console.log("[email] Preview URL:", nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return false;
  }
}

// ─── Template helpers ────────────────────────────────────────────────

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #1a1f2e; border-radius: 12px; overflow: hidden; border: 1px solid #2d3748; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; color: #fff; font-weight: 700; }
    .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }
    .content { padding: 28px 32px; }
    .content p { margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #cbd5e0; }
    .btn { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 8px 0; }
    .divider { border: none; border-top: 1px solid #2d3748; margin: 20px 0; }
    .footer { padding: 16px 32px; font-size: 12px; color: #718096; border-top: 1px solid #2d3748; }
    .item-card { background: #0f1117; border: 1px solid #2d3748; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }
    .item-card .title { font-size: 14px; font-weight: 600; color: #e2e8f0; margin: 0 0 4px; }
    .item-card .meta { font-size: 12px; color: #718096; margin: 0; }
    .badge { display: inline-block; background: #1e40af22; color: #60a5fa; border: 1px solid #1e40af44; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${CLUB_NAME}</h1>
      <p>${CLUB_TAGLINE}</p>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      You're receiving this because you're a member of the ${CLUB_NAME} platform.
      Manage your notification preferences in your profile settings.
    </div>
  </div>
</body>
</html>`;
}

export function buildWelcomeEmail(name: string): { subject: string; html: string; text: string } {
  const subject = `Welcome to the ${CLUB_NAME}`;
  const html = baseLayout(subject, `
    <p>Hi ${name || "there"},</p>
    <p>Welcome to the <strong>${CLUB_NAME}</strong> — the practitioner network for Open Process Automation professionals.</p>
    <p>Here's what you can do right now:</p>
    <div class="item-card">
      <p class="title">Join a Space</p>
      <p class="meta">Find your community in Architecture, Security, Integration, and more.</p>
    </div>
    <div class="item-card">
      <p class="title">Explore the Knowledge Base</p>
      <p class="meta">Browse O-PAS aligned guides, reference architectures, and best practices.</p>
    </div>
    <div class="item-card">
      <p class="title">Start a Discussion</p>
      <p class="meta">Ask questions, share insights, and connect with peers.</p>
    </div>
    <hr class="divider" />
    <p>We're glad you're here.</p>
    <p>— The ${CLUB_NAME} Team</p>
  `);
  const text = `Welcome to ${CLUB_NAME}, ${name || "there"}!\n\nJoin a Space, explore the Knowledge Base, and start discussions.\n\n— The ${CLUB_NAME} Team`;
  return { subject, html, text };
}

export function buildNotificationEmail(opts: {
  recipientName: string;
  notificationType: "reply" | "mention" | "follow" | "upvote" | "digest";
  actorName: string;
  contentTitle: string;
  contentUrl?: string;
}): { subject: string; html: string; text: string } {
  const { recipientName, notificationType, actorName, contentTitle, contentUrl } = opts;

  const subjects: Record<string, string> = {
    reply: `${actorName} replied to your post`,
    mention: `${actorName} mentioned you`,
    follow: `${actorName} started following you`,
    upvote: `${actorName} upvoted your post`,
    digest: `Your ${CLUB_NAME} digest`,
  };

  const bodies: Record<string, string> = {
    reply: `<p>Hi ${recipientName},</p><p><strong>${actorName}</strong> replied to <strong>${contentTitle}</strong>.</p>`,
    mention: `<p>Hi ${recipientName},</p><p><strong>${actorName}</strong> mentioned you in <strong>${contentTitle}</strong>.</p>`,
    follow: `<p>Hi ${recipientName},</p><p><strong>${actorName}</strong> is now following you on ${CLUB_NAME}.</p>`,
    upvote: `<p>Hi ${recipientName},</p><p><strong>${actorName}</strong> upvoted your post <strong>${contentTitle}</strong>.</p>`,
    digest: `<p>Hi ${recipientName},</p><p>Here's what's been happening in the ${CLUB_NAME}.</p>`,
  };

  const subject = subjects[notificationType] ?? `${CLUB_NAME} notification`;
  const bodyHtml = bodies[notificationType] ?? `<p>Hi ${recipientName},</p><p>You have a new notification.</p>`;
  const ctaHtml = contentUrl
    ? `<p><a href="${contentUrl}" class="btn">View →</a></p>`
    : "";

  const html = baseLayout(subject, bodyHtml + ctaHtml);
  const text = `${subject}\n\n${contentUrl ?? ""}`;
  return { subject, html, text };
}

export function buildWeeklyDigestEmail(opts: {
  recipientName: string;
  discussions: Array<{ title: string; replyCount: number; viewCount?: number; slug: string; authorName?: string }>;
  blogPosts: Array<{ title: string; slug: string; authorName?: string; excerpt?: string }>;
  events: Array<{ title: string; startDate: Date | string; eventType?: string }>;
  newMembers: Array<{ name: string; organization?: string }>;
  stats: { totalMembers: number; totalDiscussions: number; totalArticles: number; newThisWeek: number };
  baseUrl: string;
}): { subject: string; html: string; text: string } {
  const { recipientName, discussions, blogPosts, events, newMembers, stats, baseUrl } = opts;
  const weekOf = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const subject = `${CLUB_NAME} Weekly Digest — ${weekOf}`;

  // Stats bar
  const statsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;">
      <tr>
        <td style="text-align:center;padding:12px 8px;background:#0f1117;border-radius:8px 0 0 8px;border:1px solid #2d3748;border-right:none;">
          <div style="font-size:20px;font-weight:700;color:#60a5fa;">${stats.totalMembers}</div>
          <div style="font-size:11px;color:#718096;margin-top:2px;">Members</div>
        </td>
        <td style="text-align:center;padding:12px 8px;background:#0f1117;border:1px solid #2d3748;border-right:none;">
          <div style="font-size:20px;font-weight:700;color:#a78bfa;">${stats.totalDiscussions}</div>
          <div style="font-size:11px;color:#718096;margin-top:2px;">Discussions</div>
        </td>
        <td style="text-align:center;padding:12px 8px;background:#0f1117;border:1px solid #2d3748;border-right:none;">
          <div style="font-size:20px;font-weight:700;color:#34d399;">${stats.totalArticles}</div>
          <div style="font-size:11px;color:#718096;margin-top:2px;">Articles</div>
        </td>
        <td style="text-align:center;padding:12px 8px;background:#0f1117;border-radius:0 8px 8px 0;border:1px solid #2d3748;">
          <div style="font-size:20px;font-weight:700;color:#fbbf24;">+${stats.newThisWeek}</div>
          <div style="font-size:11px;color:#718096;margin-top:2px;">New This Week</div>
        </td>
      </tr>
    </table>
  `;

  // Discussions section
  const discussionItems = discussions.slice(0, 5).map(d => `
    <div class="item-card">
      <p class="title"><a href="${baseUrl}/community/${d.slug}" style="color:#e2e8f0;text-decoration:none;">${d.title}</a></p>
      <p class="meta">${d.replyCount} replies${d.viewCount ? ` · ${d.viewCount} views` : ""}${d.authorName ? ` · by ${d.authorName}` : ""}</p>
    </div>
  `).join("");

  // Blog posts section
  const blogItems = blogPosts.slice(0, 3).map(b => `
    <div class="item-card">
      <p class="title"><a href="${baseUrl}/blog/${b.slug}" style="color:#e2e8f0;text-decoration:none;">${b.title}</a></p>
      <p class="meta">${b.authorName ? `by ${b.authorName}` : ""}${b.excerpt ? ` — ${b.excerpt.slice(0, 80)}${b.excerpt.length > 80 ? "..." : ""}` : ""}</p>
    </div>
  `).join("");

  // Events section
  const eventItems = events.slice(0, 3).map(e => {
    const dateStr = new Date(e.startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const typeBadge = e.eventType ? `<span class="badge">${e.eventType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span> ` : "";
    return `
    <div class="item-card">
      <p class="title">${e.title}</p>
      <p class="meta">${typeBadge}${dateStr}</p>
    </div>
  `;
  }).join("");

  // New members section
  const memberItems = newMembers.slice(0, 5).map(m =>
    `<span style="display:inline-block;background:#1e40af22;color:#60a5fa;border:1px solid #1e40af44;border-radius:16px;padding:3px 12px;font-size:12px;margin:2px 4px 2px 0;">${m.name}${m.organization ? ` (${m.organization})` : ""}</span>`
  ).join("");

  const body = `
    <p>Hi ${recipientName},</p>
    <p>Here's your weekly roundup of what's happening in the <strong>${CLUB_NAME}</strong>.</p>
    ${statsHtml}
    ${discussions.length > 0 ? `
      <h3 style="font-size:15px;color:#e2e8f0;margin:24px 0 10px;border-bottom:1px solid #2d3748;padding-bottom:8px;">Top Discussions This Week</h3>
      ${discussionItems}
    ` : ""}
    ${blogPosts.length > 0 ? `
      <h3 style="font-size:15px;color:#e2e8f0;margin:24px 0 10px;border-bottom:1px solid #2d3748;padding-bottom:8px;">Latest Blog Posts</h3>
      ${blogItems}
    ` : ""}
    ${events.length > 0 ? `
      <h3 style="font-size:15px;color:#e2e8f0;margin:24px 0 10px;border-bottom:1px solid #2d3748;padding-bottom:8px;">Upcoming Events</h3>
      ${eventItems}
    ` : ""}
    ${newMembers.length > 0 ? `
      <h3 style="font-size:15px;color:#e2e8f0;margin:24px 0 10px;border-bottom:1px solid #2d3748;padding-bottom:8px;">Welcome New Members</h3>
      <div style="margin-bottom:16px;">${memberItems}${newMembers.length > 5 ? `<span style="font-size:12px;color:#718096;"> and ${newMembers.length - 5} more</span>` : ""}</div>
    ` : ""}
    <hr class="divider" />
    <p style="text-align:center;margin:24px 0;"><a href="${baseUrl}" class="btn">Visit ${CLUB_NAME} →</a></p>
    <p style="color:#718096;font-size:12px;text-align:center;">You're receiving this because you opted in to weekly digests. <a href="${baseUrl}/settings" style="color:#60a5fa;">Manage preferences</a></p>
  `;

  const html = baseLayout(subject, body);

  // Plain text fallback
  const textParts = [`${CLUB_NAME} Weekly Digest — ${weekOf}`, `\nHi ${recipientName},\n`];
  if (discussions.length > 0) {
    textParts.push("Top Discussions:");
    discussions.slice(0, 5).forEach(d => textParts.push(`  - ${d.title} (${d.replyCount} replies)`));
  }
  if (blogPosts.length > 0) {
    textParts.push("\nLatest Blog Posts:");
    blogPosts.slice(0, 3).forEach(b => textParts.push(`  - ${b.title}`));
  }
  if (events.length > 0) {
    textParts.push("\nUpcoming Events:");
    events.slice(0, 3).forEach(e => textParts.push(`  - ${e.title} (${new Date(e.startDate).toLocaleDateString()})`));
  }
  if (newMembers.length > 0) {
    textParts.push(`\nNew Members: ${newMembers.slice(0, 5).map(m => m.name).join(", ")}`);
  }
  textParts.push(`\nVisit: ${baseUrl}`);
  const text = textParts.join("\n");

  return { subject, html, text };
}

// ─── Re-engagement Email ────────────────────────────────────────────────────────────────
/**
 * Send an admin-authored blast email. The body is Markdown; it's rendered to
 * HTML and wrapped in the standard OPA Community layout. Used by the admin
 * "Email Blast" tab for both the test send and the real broadcast.
 */
export async function sendBlastEmail(opts: { to: string; subject: string; bodyMarkdown: string }): Promise<boolean> {
  const renderedBody = marked.parse(opts.bodyMarkdown) as string;
  const html = baseLayout(opts.subject, renderedBody);
  return sendEmail({ to: opts.to, subject: opts.subject, html, text: opts.bodyMarkdown });
}

export async function sendReEngagementEmail(toEmail: string, name: string): Promise<boolean> {
  const subject = `We miss you, ${name}! Here's what's new in the ${CLUB_NAME}`;
  const html = baseLayout(subject, `
    <p>Hi ${name || 'there'},</p>
    <p>It's been a while since you last visited the ${CLUB_NAME}. A lot has been happening — new discussions, knowledge articles, and events you might have missed.</p>
    <div class="item-card">
      <p class="title">New Discussions</p>
      <p class="meta">Community members are actively discussing O-PAS architecture, integration patterns, and more.</p>
    </div>
    <div class="item-card">
      <p class="title">Knowledge Base Updates</p>
      <p class="meta">New articles and guides have been added to the knowledge base.</p>
    </div>
    <div class="item-card">
      <p class="title">Upcoming Events</p>
      <p class="meta">Webinars, working group sessions, and community calls are scheduled.</p>
    </div>
    <hr class="divider" />
    <p><a href="${process.env.APP_BASE_URL ?? 'http://localhost:3000'}" class="btn">Rejoin the Community →</a></p>
    <p style="color:#718096;font-size:12px;">You're receiving this because you haven't visited in 30+ days. Visit your profile settings to manage notification preferences.</p>
  `);
  const text = `Hi ${name}, we miss you! Visit the ${CLUB_NAME} to catch up on new discussions, articles, and events.`;
  return sendEmail({ to: toEmail, subject, html, text });
}

// ─── Password Reset Email ────────────────────────────────────────────────────────────────
export function buildPasswordResetEmail(name: string, resetUrl: string): { subject: string; html: string; text: string } {
  const subject = `Reset Your ${CLUB_NAME} Password`;
  const html = baseLayout(subject, `
    <p>Hi ${name || "there"},</p>
    <p>We received a request to reset your password for the ${CLUB_NAME} platform. Click the button below to set a new password:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" class="btn">Reset Password →</a>
    </p>
    <p style="color:#718096;font-size:13px;">This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
    <hr class="divider" />
    <p style="color:#718096;font-size:12px;">If the button above doesn't work, copy and paste this URL into your browser:</p>
    <p style="word-break:break-all;font-size:12px;color:#60a5fa;">${resetUrl}</p>
  `);
  const text = `Hi ${name}, reset your ${CLUB_NAME} password by visiting: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`;
  return { subject, html, text };
}

export async function sendPasswordResetEmail(toEmail: string, name: string, resetUrl: string): Promise<boolean> {
  const { subject, html, text } = buildPasswordResetEmail(name, resetUrl);
  return sendEmail({ to: toEmail, subject, html, text });
}

// ─── Magic-Link Sign-In Email ─────────────────────────────────────────────────
export function buildMagicLinkEmail(name: string, magicUrl: string): { subject: string; html: string; text: string } {
  const subject = `Sign in to ${CLUB_NAME}`;
  const html = baseLayout(subject, `
    <p>Hi ${name || "there"},</p>
    <p>Click the button below to sign in to your ${CLUB_NAME} account. No password needed.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${magicUrl}" class="btn">Sign in →</a>
    </p>
    <p style="color:#718096;font-size:13px;">This link will expire in <strong>15 minutes</strong>. If you didn't request a sign-in link, you can safely ignore this email.</p>
    <hr class="divider" />
    <p style="color:#718096;font-size:12px;">If the button above doesn't work, copy and paste this URL into your browser:</p>
    <p style="word-break:break-all;font-size:12px;color:#60a5fa;">${magicUrl}</p>
  `);
  const text = `Hi ${name || "there"},\n\nSign in to ${CLUB_NAME}: ${magicUrl}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`;
  return { subject, html, text };
}

export async function sendMagicLinkEmail(toEmail: string, name: string, magicUrl: string): Promise<boolean> {
  const { subject, html, text } = buildMagicLinkEmail(name, magicUrl);
  return sendEmail({ to: toEmail, subject, html, text });
}

// ─── Verification Decision Email ──────────────────────────────────────────────

export function buildVerificationEmail(
  name: string,
  decision: "approved" | "rejected",
  notes?: string
): { subject: string; html: string; text: string } {
  const isApproved = decision === "approved";
  const subject = isApproved
    ? `Congratulations! You're now a Verified Expert on ${CLUB_NAME}`
    : `Update on your ${CLUB_NAME} verification request`;

  const statusBadge = isApproved
    ? `<span style="display:inline-block;background:#065f4622;color:#10b981;border:1px solid #065f4644;border-radius:4px;padding:2px 10px;font-size:12px;font-weight:600;">✓ Verified Expert</span>`
    : `<span style="display:inline-block;background:#7f1d1d22;color:#ef4444;border:1px solid #7f1d1d44;border-radius:4px;padding:2px 10px;font-size:12px;font-weight:600;">Not Approved</span>`;

  const bodyApproved = `
    <p>Hi ${name},</p>
    <p>Great news! Your expert verification request has been <strong>approved</strong>.</p>
    <div style="text-align:center;margin:20px 0;">${statusBadge}</div>
    <p>You now have the <strong>Verified Expert</strong> badge on your profile, which is visible across the community — on your posts, replies, and member profile.</p>
    ${notes ? `<div class="item-card"><p class="title">Reviewer Notes</p><p class="meta">${notes}</p></div>` : ''}
    <p>Thank you for contributing your expertise to the ${CLUB_NAME}!</p>
  `;

  const bodyRejected = `
    <p>Hi ${name},</p>
    <p>Thank you for submitting your expert verification request. After review, we were unable to approve it at this time.</p>
    <div style="text-align:center;margin:20px 0;">${statusBadge}</div>
    ${notes ? `<div class="item-card"><p class="title">Reviewer Notes</p><p class="meta">${notes}</p></div>` : ''}
    <p>You're welcome to resubmit with additional credentials or information. Visit your <strong>Account Settings</strong> to submit a new request.</p>
  `;

  const html = baseLayout(subject, isApproved ? bodyApproved : bodyRejected);
  const text = isApproved
    ? `Hi ${name}, your expert verification has been approved! You now have the Verified Expert badge.${notes ? ` Reviewer notes: ${notes}` : ''}`
    : `Hi ${name}, your verification request was not approved at this time.${notes ? ` Reviewer notes: ${notes}` : ''} You can resubmit from Account Settings.`;

  return { subject, html, text };
}

// ─── Consulting Inquiry Emails ──────────────────────────────────────────────

export function buildConsultingInquiryConfirmation(opts: {
  memberName: string;
  serviceName: string;
  serviceType: string;
  message?: string;
  preferredDate?: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your consulting inquiry has been received — ${opts.serviceName}`;
  const dateInfo = opts.preferredDate
    ? `<div class="item-card"><p class="title">Preferred Date</p><p class="meta">${new Date(opts.preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>`
    : '';
  const messageInfo = opts.message
    ? `<div class="item-card"><p class="title">Your Message</p><p class="meta">${opts.message}</p></div>`
    : '';
  const html = baseLayout(subject, `
    <p>Hi ${opts.memberName},</p>
    <p>Thank you for your interest in our consulting services. We've received your inquiry and will be in touch within <strong>1-2 business days</strong>.</p>
    <div class="item-card">
      <p class="title">${opts.serviceName}</p>
      <p class="meta"><span class="badge">${opts.serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></p>
    </div>
    ${dateInfo}
    ${messageInfo}
    <hr class="divider" />
    <p><strong>What happens next:</strong></p>
    <p>1. Our team reviews your inquiry<br/>2. We'll reach out to discuss scope and scheduling<br/>3. You'll receive a proposal with timeline and deliverables</p>
    <p>If you have any questions in the meantime, reply to this email.</p>
    <p>— The ${CLUB_NAME} Team</p>
  `);
  const text = `Hi ${opts.memberName},\n\nThank you for your consulting inquiry for ${opts.serviceName}. We've received your request and will be in touch within 1-2 business days.\n\nService: ${opts.serviceName}\nType: ${opts.serviceType}\n${opts.preferredDate ? `Preferred Date: ${opts.preferredDate}\n` : ''}${opts.message ? `Your Message: ${opts.message}\n` : ''}\n— The ${CLUB_NAME} Team`;
  return { subject, html, text };
}

export function buildConsultingInquiryAdminNotification(opts: {
  memberName: string;
  memberEmail: string;
  serviceName: string;
  serviceType: string;
  message?: string;
  phone?: string;
  preferredDate?: string;
}): { subject: string; html: string; text: string } {
  const subject = `New Consulting Inquiry: ${opts.serviceName} — ${opts.memberName}`;
  const html = baseLayout(subject, `
    <p>A new consulting inquiry has been submitted.</p>
    <div class="item-card">
      <p class="title">${opts.memberName}</p>
      <p class="meta"><a href="mailto:${opts.memberEmail}" style="color:#60a5fa;">${opts.memberEmail}</a>${opts.phone ? ` · ${opts.phone}` : ''}</p>
    </div>
    <div class="item-card">
      <p class="title">${opts.serviceName}</p>
      <p class="meta"><span class="badge">${opts.serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></p>
    </div>
    ${opts.preferredDate ? `<div class="item-card"><p class="title">Preferred Date</p><p class="meta">${new Date(opts.preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>` : ''}
    ${opts.message ? `<div class="item-card"><p class="title">Message</p><p class="meta">${opts.message}</p></div>` : ''}
    <hr class="divider" />
    <p>Please respond within 1-2 business days.</p>
  `);
  const text = `New Consulting Inquiry\n\nMember: ${opts.memberName}\nEmail: ${opts.memberEmail}\n${opts.phone ? `Phone: ${opts.phone}\n` : ''}Service: ${opts.serviceName}\nType: ${opts.serviceType}\n${opts.preferredDate ? `Preferred Date: ${opts.preferredDate}\n` : ''}${opts.message ? `Message: ${opts.message}\n` : ''}`;
  return { subject, html, text };
}

export async function sendConsultingInquiryEmails(opts: {
  memberEmail: string;
  memberName: string;
  adminEmail: string;
  serviceName: string;
  serviceType: string;
  message?: string;
  phone?: string;
  preferredDate?: string;
}): Promise<{ memberSent: boolean; adminSent: boolean }> {
  const confirmation = buildConsultingInquiryConfirmation(opts);
  const adminNotif = buildConsultingInquiryAdminNotification(opts);
  const [memberSent, adminSent] = await Promise.all([
    sendEmail({ to: opts.memberEmail, ...confirmation }),
    sendEmail({ to: opts.adminEmail, ...adminNotif }),
  ]);
  return { memberSent, adminSent };
}
