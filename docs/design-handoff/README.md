# Handoff: OPA Community Dashboard Redesign

## Overview
A modernized redesign of the OPA Community platform's authenticated app shell: top nav, left sidebar, and 14 screens (dashboard home + 13 sub-pages). Built on the "Industry" design system's tokens (steel-blue accent, Barlow/Barlow Condensed type) but with the blueprint/wireframe corner-marks dropped in favor of a friendlier, more colorful rounded-card treatment per user feedback during design review.

## About the Design Files
The `.dc.html` files in this bundle are **design references** — interactive HTML prototypes built to show intended look, structure, and behavior. They are **not production code to copy directly**. The task is to **recreate these designs in the target codebase's existing environment** — this repo is a React + TypeScript + Vite app using Tailwind CSS and shadcn/ui components (see `client/src/components/ui/`), tRPC for data, and Wouter for routing. Recreate each screen as a proper React component using the existing `Button`, `Card`, `Badge`, `Input`, `Select`, `DropdownMenu`, etc. primitives already in `client/src/components/ui/`, restyled per the tokens below — do not introduce a parallel styling system.

## Fidelity
**High-fidelity.** Colors, spacing, typography, and card/button shapes below are final. Copy/sample content (names, numbers, post titles) is placeholder — wire up real data from the existing tRPC routers (`forum`, `notifications`, `gamification`, etc. in `server/routers.ts`) instead of the hardcoded arrays in the prototype JS.

## Design Tokens

**Colors** (ground + accent from the existing Industry system, extended with a harmonious multi-hue palette for category coding):
- Background: `#f2f2f3` · Surface (cards): `#e9e9ea` · Text: `#1d1f20`
- Primary accent (steel blue): `#5980a6` — ramp 100→900 available (100 `#eef6ff` … 700 `#416180` … 900 `#1d2d3d`)
- Divider: `color-mix(in srgb, #1d1f20 16%, transparent)`
- Extended category/status palette (tint bg / deep text pairs used for tags, icon chips, avatars):
  - Blue: bg `#eef4fa` / text `#2c4f6e`
  - Teal: bg `#eaf6f4` / text `#2a5650`
  - Violet: bg `#f1eef8` / text `#4a3d70`
  - Amber: bg `#fbf1e4` / text `#7a5220`
  - Coral: bg `#fbeeec` / text `#7a3830`
  - These same 5 hues (solid, not tinted) are used for avatar backgrounds: `#5980a6`, `#4f9b93`, `#7d6fa8`, `#c98a3e`, `#c76b62`

**Typography**: Headings in "Barlow Condensed" (weight 600), body in "Barlow" (400). Page title (h1) 34px, section h3 18–19px, card title (h4) 18px, body/meta text 13–15.5px. Never below 12px anywhere.

**Shape**: All cards, buttons, inputs, avatars, tags use rounded corners (`border-radius: 4–8px`, avatars/tags/badges are full pill `999px` or circle `50%`). No square "blueprint" corners — that treatment was explicitly rejected during review.

**Elevation**: Cards use a 1px `#1d1f20`-tinted divider border + a soft shadow (`0 1px 2px rgba(0,0,0,.08)` resting, `0 3px 10px rgba(0,0,0,.1)` on hover).

**Spacing**: 4/8/12/16/20/24/32px scale (maps to the existing `--space-*` tokens).

## Shared App Shell (every screen)

**Top nav bar** (60px tall, sticky, bottom 1px divider):
- Left: hamburger toggle (34×34 icon button) → collapses sidebar to 0 width; logo mark (32×32 rounded-md, solid accent fill, white shield icon) + "OPA Community" wordmark (Barlow Condensed 600, 20px).
- Center: search input, pill/rounded (`border-radius: var(--radius-md)`), 40px tall, magnifier icon inset left.
- Right: notification bell (with coral `#c76b62` unread-count badge), message icon, user avatar (32px circle, gradient `linear-gradient(135deg,#7d6fa8,#5980a6)`, initials) + first name + name dropdown (profile/settings/sign out).

**Left sidebar** (230px wide when open, collapses to 0px, 0.18s width transition):
- Nav groups in order: **Dashboard** (standalone), **Discover** (Events, Blog, Tags, Member Directory), **Resources** (Case Studies, Benchmarking, Consulting), **My Space** (My Profile, My Connections, Messages [with coral unread badge], Activity Feed), **Admin** (Administration — role-gated), then a divider and **Account Settings** pinned at the bottom.
- Each item: icon (15px, Lucide-style thin stroke) + label, 13.5–15px text, `padding: 8px 12px`, `border-radius: 6px`. Active state = solid accent fill (`#5980a6`) with white text/icon and 600 weight. Inactive hover = light accent tint (`--color-accent-100`).
- Section labels ("DISCOVER", "RESOURCES", etc.) are 11.5px, 600 weight, uppercase, `letter-spacing: 0.1em`, muted gray, with a top margin for grouping rhythm.

**Main content area**: max-width 1180px, centered, `padding: 24px 24px 32px`, vertical `gap: 24px` between sections.

## Screens

1. **Dashboard** (`Dashboard.dc.html`) — Welcome header + "New Discussion" primary button; a 4-segment inline stat strip (Discussions / Unread / Topics / Your Reputation, each with a colored icon chip); a two-column body: left = search + category filter + a list of discussion cards (colored left stripe by category, category pill tag, pinned/locked icons, title, excerpt, tag chips, author/views/replies/time meta row), right rail = Quick Actions list, Top Contributors ranked list, Notifications preview — each in its own card.
2. **Events** (`Events.dc.html`) — Same stat-strip pattern (Upcoming / This Month / You're Registered / Past Events) + event rows: a 64×64 colored date block (month + day) beside format tag (Webinar/In-person/Workshop, each its own hue), title, description, time/location/attendee meta, RSVP button. Right rail unchanged.
3. **Blog** (`Blog.dc.html`) — Post list reusing the discussion-card shape (colored stripe + category pill + title + excerpt + author/read-time/date meta), no pin/lock/solved/video badges.
4. **Tags** (`Tags.dc.html`) — No stat strip. A "Trending this week" pill row, then a wrapping tag-cloud card where each tag pill is sized 12–20px by popularity count, colored by rotating through the 5-hue palette.
5. **Member Directory** (`MemberDirectory.dc.html`) — Stats: Members / Online Now / New This Week / Verified. 2-column grid of member cards: circular avatar, name + verified check, title/company, colored role pill (Operator/Vendor/Integrator/Consultant), reputation, "Connect" ghost button.
6. **Case Studies** (`CaseStudies.dc.html`) — Stats: Published / Industries / Avg Payback / Downloads. Row cards: colored left stripe by industry, industry pill, title, summary, company line, and a right-aligned big colored outcome metric (e.g. "-32% downtime").
7. **Benchmarking** (`Benchmarking.dc.html`) — Stats: Submissions / Avg Payback / Median Uptime Gain / Participants. A `.table`-styled metrics table (Metric / Community Median / Top Quartile / Trend pill) plus a caption note.
8. **Consulting** (`Consulting.dc.html`) — 3-stat strip (Vetted Advisors / Engagements Completed / Avg Rating). 2-column grid of service cards: focus-area pill, title, description, price line + "Learn more" ghost button.
9. **My Profile** (`MyProfile.dc.html`) — Profile header card (72px gradient avatar, name, title, bio, "Edit Profile" button) replaces the welcome block; 3-stat strip (Reputation / Discussions Started / Badges Earned); left column = "Recent Activity" list (colored dot + text + timestamp rows); right rail replaced with a Badges grid (circular colored icon chips) and an Expertise tag card.
10. **My Connections** (`MyConnections.dc.html`) — No button. 3-stat strip (Connections / Pending / Suggested). 2-column grid of connection cards: avatar, name, title, "Message" ghost button.
11. **Messages** (`Messages.dc.html`) — No stat strip, no right rail. Full-width two-pane inbox: 300px conversation list (avatar, name, time, preview, active row tinted) + a thread pane (header with avatar/name, scrollable message bubbles — accent-filled bubble right-aligned for "me", light-gray left-aligned for the other party — and a bottom input + Send button).
12. **Activity Feed** (`ActivityFeed.dc.html`) — No stat strip. A single card containing a vertical timeline: a connecting line down the left, each row a small colored dot (color varies by activity type) + text + timestamp.
13. **Administration** (`Admin.dc.html`) — No right rail. Stats: Total Members / New Signups (7d) / Pending Reports / Active Discussions. Two full-width tables: "Moderation Queue" (Reported Item / Reason / Reported By / Approve+Remove actions) and "Recent Signups" (Name / Role / Company / Joined).
14. **Account Settings** (`AccountSettings.dc.html`) — No stat strip, no right rail. Three stacked form-section cards (max-width 640px): Profile Information (name/email/title/bio fields), Notification Preferences (label + checkbox toggle rows), Danger Zone (coral-outlined "Delete Account" button).

## Interactions & Behavior
- Sidebar hamburger toggles sidebar width between 230px and 0 (animated).
- Sidebar nav items navigate between the 14 pages (in the prototype, via `window.location.href` to the sibling `.dc.html` file — in the real app, use Wouter's `useLocation`/`Link` to route between the corresponding pages instead).
- Active nav item is determined by the current route matching one of the fixed keys (`dashboard`, `events`, `blog`, `tags`, `members`, `case_studies`, `benchmarking`, `consulting`, `profile`, `connections`, `messages`, `activity`, `admin`, `settings`).
- User avatar click toggles a dropdown menu (Profile / Settings / Sign out).
- Dashboard/Events/Member Directory/etc. filter bars: text search filters the list client-side by title/excerpt match; the category/role `<select>` filters by exact match. Re-implement against real tRPC queries server-side once wired up.
- All buttons in the prototype are visual-only placeholders (`preventDefault`) — wire to real mutations per the existing tRPC routers.

## State Management
- `sidebarOpen` (boolean) — sidebar collapsed state, per-session.
- `userMenuOpen` (boolean) — avatar dropdown open state.
- `search` (string), `category` (string) — client-side filter state on list pages.
- Everything else (discussions, events, members, etc.) should come from tRPC queries, not local state.

## Assets
No external image assets — all icons are inline thin-stroke (1.5px) SVGs in the Lucide style, drawn directly in the markup. Avatars are solid-color initials circles/gradients, no photos.

## Files
All 14 screens are in this bundle's `screens/` folder:
- `screens/Dashboard.dc.html`
- `screens/Events.dc.html`
- `screens/Blog.dc.html`
- `screens/Tags.dc.html`
- `screens/MemberDirectory.dc.html`
- `screens/CaseStudies.dc.html`
- `screens/Benchmarking.dc.html`
- `screens/Consulting.dc.html`
- `screens/MyProfile.dc.html`
- `screens/MyConnections.dc.html`
- `screens/Messages.dc.html`
- `screens/ActivityFeed.dc.html`
- `screens/Admin.dc.html`
- `screens/AccountSettings.dc.html`

Each file is a self-contained streaming component (`<x-dc>` template + a plain-JS logic class in a trailing `<script>` tag) — open any one in a browser via its companion `support.js` runtime to view it live, or just read the markup/inline styles directly; all styling is inline (no external stylesheet to cross-reference besides the linked Industry design-system tokens noted above).
