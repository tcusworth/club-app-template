/**
 * Cross-cutting club branding, importable from both client and server via
 * the existing @shared/* path alias (see tsconfig.json).
 *
 * This is deliberately plain (no React/lucide-react deps) so server code —
 * e.g. server/email.ts — can import it without pulling in client-only
 * packages. Client-only branding values (the icon component) live in
 * client/src/lib/clubConfig.ts, which re-exports CLUB_NAME from here so
 * there's still one source of truth for the name itself.
 *
 * CLUB_TAGLINE and CLUB_EMAIL_FROM below are still OPA-specific content,
 * not just the name — edit both when cloning for a new club, alongside the
 * name. Some email copy in server/email.ts (e.g. "O-PAS aligned guides",
 * "Architecture, Security, Integration" space names, the re-engagement
 * email's "O-PAS architecture, integration patterns" line) describes
 * OPA-specific product content directly and was NOT mechanically swapped —
 * that's a copywriting decision per club, not something to auto-generate.
 */

export const CLUB_NAME = "OPA Community";

/** Shown in the email header, under the club name. */
export const CLUB_TAGLINE = "Open Process Automation — Practitioner Network";

/** Fallback sender when SMTP_FROM env var isn't set. */
export const CLUB_EMAIL_FROM = "OPA Community <noreply@opa-community.io>";
