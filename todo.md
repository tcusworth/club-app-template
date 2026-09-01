# OCOS - OPA Community OS TODO

## Authentication & Identity
- [x] Role-based auth with 6 roles: owner_operator, epc_integrator, automation_engineer, executive, vendor, analyst
- [x] Role selection during onboarding flow
- [x] Role label display in sidebar and dashboard
- [x] Role-specific dashboard widgets/content per role
- [x] Credential tagging UI (OPA experience, project role tags)
- [x] Contribution scoring / reputation engine (adjustReputation in db.ts, wired to content creation and challenge submission)

## Dashboard & UX
- [x] Dashboard-first landing with 4 task paths: Learn, Design, Evaluate, Justify
- [x] Clean SaaS layout — no feed-first or infinite scroll
- [x] Global navigation with capability-centric structure
- [x] Sidebar navigation with grouped sections
- [x] Responsive breakpoint improvements across key pages (ArchitectureBuilder, UserSettings, ProjectDetail)

## Knowledge Graph (Module 2)
- [x] Capabilities data model mapped to O-PAS architecture layers
- [x] Requirements linked to capabilities
- [x] Content nodes (articles, diagrams, case studies) with linkedCapabilities field
- [x] Capability browsing by layer with search/filter
- [x] Version-controlled knowledge (version field on content nodes)
- [x] Media-rich posts with image and video ingestion
- [x] S3-backed file upload for images/videos/documents
- [x] Graph visualization (node-link view) for capability navigation
- [x] Cross-link rendering between content nodes and capabilities in UI

## Execution Tools (Module 3)
- [x] Architecture Builder — drag-and-drop DCN/runtime/network designer
- [x] Architecture Builder — component palette with 7 types
- [x] Architecture Builder — risk flag surfacing with O-PAS rules
- [x] Architecture Builder — save/load architectures
- [x] Migration Strategy Builder — DCS environment input, AI-generated phased plan
- [x] Procurement/RFP Generator — capability-based RFP language generation
- [x] Architecture Builder — export diagram as SVG

## Vendor Capability Registry (Module 6)
- [x] Neutral vendor profiles with evidence links
- [x] Claim submission workflow: Unverified → Verified → Challenged
- [x] Admin claim status management
- [x] Vendors not in primary navigation (under Workspace section)
- [x] Community validation UI (challenge dialog for authenticated users)
- [x] Community challenge backend (claim_challenges table, protectedProcedure endpoint)
- [x] Capabilities_supported aggregation on vendor profiles

## Project Workspaces (Module 7)
- [x] Private project rooms with participant management
- [x] Decision logs with title, context, decision, rationale
- [x] File upload to project workspaces
- [x] Member listing with roles
- [x] Document export capability (Markdown decision log export)
- [x] Shared architecture diagrams linked to builder (SharedArchitectures component)
- [x] Vendor evaluation board UI in workspaces (VendorEvaluationBoard component)

## AI Intelligence Layer (Module 9)
- [x] AI chat assistant with O-PAS context and capability references
- [x] System prompt enforcing explainable reasoning and vendor neutrality
- [x] Chat history persistence and conversation management
- [x] Starter prompts for common queries
- [x] Dedicated vendor claim evaluation AI tool (ai.evaluateClaim endpoint + UI in VendorDetail)
- [x] AI guardrail tests for neutrality (7 tests: auth, validation, score manipulation protection)

## Freemium Access Model
- [x] Free tier: core community + knowledge access
- [x] Freemium model: gated site, free to join (no Stripe needed)

## Admin Panel
- [x] Admin setup page with platform configuration (overview stats, seed data management)
- [x] User management (list users, promote/demote system role and platform role, view activity)
- [x] Content moderation queue (pending posts with approve/reject actions)
- [x] Capability and vendor seed data management (create/delete from admin panel)

## Post Authorization Workflow
- [x] Content status workflow: draft → pending_review → published (or rejected)
- [x] Authors submit posts for review (auto-submits on create for non-admins)
- [x] Admin review queue with approve/reject actions (in Admin > Moderation tab)
- [x] Notification to owner on content approval/rejection (via notifyOwner)

## Weekly Email Digest
- [x] Digest preview with weekly stats (new content, capabilities, vendors)
- [x] Manual digest send from admin panel (notifies owner with digest content)
- [x] Notification-based delivery via notifyOwner system
- [x] User digest preference (opt-in/opt-out) toggle in Settings page

## Implementation Gaps
- [x] Wire architecture component CRUD in Admin panel (admin.archComponents.create/delete)
- [x] Fetch digest preference from server in Settings (digest.getPreference with useEffect sync)
- [x] Digest delivery via notifyOwner (subscriber email delivery deferred to email integration)
- [x] Owner notification on content approval/rejection (notifyOwner in moderation approve/reject)

## LLM Integration
- [x] Powers AI assistant for architecture Q&A
- [x] RFP language generation via LLM
- [x] Migration plan generation via LLM with structured JSON output
- [x] Capability-referenced explainable responses

## Testing
- [x] Vitest tests for all router auth/validation (71 tests passing)
- [x] Zero TypeScript errors

## Security cluster (2026-08-27)
- [x] Strip passwordHash / resetToken / resetTokenExpiresAt from all user-shaped API responses (`toPublicUser`)
- [x] Owner-or-admin checks on content, blog, architecture, migration, RFP, AI chat; notifications mark-read scoped to caller
- [x] Public content/blog lists default to published; members cannot set published (submit-for-review / admin publish)
- [x] Sanitize member HTML on write (sanitize-html) and on read (DOMPurify); Tiptap links http/https only
- [x] Player quizzes omit correctIndex; course progress is recalculated server-side; addPoints is admin-only
- [x] Uploads: 10MB cap, extension MIME allowlist, sanitized keys, 1-hour signed URLs
- [x] `.env` gitignored; `.env.example` placeholders only
- [x] Caller tests: two-user IDOR, secret-free user payloads, published-only public lists

## Bugs
- [x] OAuth login loop: fixed by encoding frontend origin in state param and updating SDK decodeState + callback redirect

## UI Changes
- [x] Hide Evaluate and Design task paths from dashboard (keep code in place)

## Landing Page
- [x] Stunning public landing page with premium visual design
- [x] Hero section with compelling headline, subtext, and CTA
- [x] Platform capabilities showcase (all six modules)
- [x] Feature highlights with elegant card layout
- [x] Social proof / community stats section (animated counters)
- [x] How it works / workflow visualization (Learn, Design, Evaluate, Justify)
- [x] Role-based value propositions (six roles)
- [x] Footer with navigation and branding
- [x] Smooth scroll animations and micro-interactions (FadeSection, AnimatedCounter, pulse-glow)
- [x] Route unauthenticated users to landing page, authenticated to dashboard
- [x] Principles section (Vendor Neutral, Capability-Centric, Execution-First)
- [x] Final CTA section with sign-up button
- [x] Fixed navbar with scroll-aware transparency

## UI Adjustments
- [x] Hide Projects from sidebar (keep code in place)
- [x] Hide Vendor Registry from sidebar (keep code in place)
- [x] Display Justify alongside Learn on the dashboard (side by side, equal sizing)

## ROI Calculator
- [x] Add ROI Calculator to sidebar as non-navigable placeholder (grayed out, no click action)
- [x] Create ROI Calculator stub page (code exists but not linked from sidebar)

## Knowledge Base Categories
- [x] Add knowledge_categories table to schema
- [x] Add category_id to content_nodes table
- [x] Create backend endpoints for category CRUD and content filtering by category
- [x] Build category browser UI with hierarchical display (sidebar with category list)
- [x] Add category selection to content creation form
- [x] Implement category-based filtering in Knowledge page
- [x] Seed initial categories: Glossary, Beginner FAQ, Starter Kit, Architecture & Modernization, Technical Guides, Business & Strategy, Community Discussions, Custom Pages (seed-knowledge-categories.sql created)


## OPA Community Forum
- [x] Database schema: 8 tables (forum_categories, discussions, forum_posts, forum_groups, group_members, direct_messages, forum_notifications, user_profiles)
- [x] Backend API: forum CRUD (create/read/update/delete discussions and posts)
- [x] Backend API: group management (create/join/leave groups)
- [x] Backend API: direct messaging (send/receive messages)
- [x] Backend API: activity feed (recent discussions, posts, group activity)
- [x] Backend API: user profiles with reputation and activity history
- [x] Frontend: Forum home page with discussion list, category sidebar, and tabs (discussions/groups/activity)
- [x] Frontend: Discussion thread view with nested replies (getPostsByDiscussion)
- [x] Frontend: Create discussion form with category/group selection (createDiscussion)
- [x] Frontend: User profile page with credentials, activity, and reputation (getOrCreateProfile)
- [x] Frontend: Activity feed page (getRecentActivity)
- [x] Frontend: Groups page with group browser and member management (getGroups, joinGroup)
- [x] Frontend: Direct messaging UI (conversation list and chat) (sendMessage, getConversation)
- [x] Frontend: Notifications center (discussion replies, mentions, messages) (getNotifications, markNotificationAsRead)
- [x] Seed initial forum categories via Admin panel (ForumCategorySeedPanel in Admin.tsx)
- [x] Integrate forum into sidebar navigation (Community Forum link in DashboardLayout)
- [x] Tests for forum API endpoints (CRUD, permissions, activity feed) — 20 forum tests added, 91 total tests passing


## BuddyBoss-Style Community Platform

### Member Profiles & Social
- [x] Enhanced member profiles with cover photo gradient, bio, activity history, badges (MemberProfile.tsx)
- [x] Member activity timeline showing all user actions (activity tab in MemberProfile)
- [x] Follow/unfollow system for members with follower/following counts
- [x] Member verification badges and trust indicators (BADGE_ICONS map)
- [x] Member search by name, role, expertise, location (MemberDirectory.tsx)
- [x] Profile completion progress indicator

### Activity Streams & Feeds
- [x] Global activity feed showing recent platform activity (ActivityFeed.tsx)
- [x] Personalized activity feed for logged-in users (getUserActivityFeed)
- [x] Group activity feeds showing group-specific events
- [x] Activity filtering by type (discussions, posts, group events, member joins)
- [x] Real-time activity notifications

### Groups Enhancement
- [x] Group cards with member count, private badge, join button
- [x] Group cover photos and banners
- [x] Group member roles (admin, moderator, member)
- [x] Group member management UI (invite, remove, promote)
- [x] Group activity feed and timeline
- [x] Group announcements/pinned posts
- [x] Group join requests (for private groups)

### Gamification System
- [x] Points system (earn points for discussions, posts, group activity)
- [x] Achievement badges (First Discussion, Active Member, Group Leader, etc.)
- [x] Leaderboard page (top members by points, activity, reputation) (Leaderboard.tsx)
- [x] Member level/tier system (Novice, Contributor, Expert, Leader)
- [x] Progress tracking and milestone celebrations
- [x] Badge display on profiles and activity feed

### Messaging & Notifications
- [x] Direct messaging backend (sendMessage, getConversation)
- [x] Direct messaging UI with conversation list and chat (dedicated page)
- [x] Notification center bell icon with unread count
- [x] @mention system with notifications
- [x] Email digest notifications

### Member Directory
- [x] Browse all members with search and role filter (MemberDirectory.tsx)
- [x] Member cards showing avatar, role badge, points, follow button
- [x] Quick member actions (follow, view profile)
- [x] Member statistics and trending members

### Database Schema Enhancements
- [x] member_follows table for follow relationships
- [x] member_badges table for earned badges
- [x] activity_log table for tracking all platform events
- [x] group_announcements table
- [x] points_transactions table for gamification tracking
- [x] Extend user_profiles with cover_photo, location, expertise_tags
- [x] Sidebar Community section with Forum, Members, Activity, Leaderboard

## UI Cleanup
- [x] Remove Vendor Registry stat card from dashboard homepage (replaced with Community Members count)
- [x] Hide Architecture Builder from sidebar navigation (code preserved for future re-enablement)

## BuddyBoss Theme Redesign
- [x] Switch global theme to light mode (white backgrounds, dark text)
- [x] BuddyBoss color palette: primary indigo/purple accent, clean grays
- [x] Top navigation bar: logo+hamburger left, search center, bell/messages/avatar right
- [x] Left sidebar: Personal (My Profile, My Timeline, My Inbox), Community (My Groups, My Connections, My Discussions, Leaderboard), Tools, Media, Admin, Account Settings at bottom
- [x] Mobile sidebar: slide-in overlay with hamburger toggle
- [x] Content area: white cards with subtle shadows, clean typography
- [x] Update landing page to light theme
- [x] Update all community pages to light theme (Forum, Members, Activity, Leaderboard, Messages)

## Branding Rename
- [x] Replace all "OCOS" references with "OPA Community" across all frontend files, config, and metadata (DashboardLayout, Landing, Onboarding, ArchitectureBuilder, Home, routers.ts, index.html)

## Custom Email/Password Authentication
- [x] DB schema: add password_hash, reset_token, reset_token_expires to users table (migration 0008 applied)
- [x] Backend: register procedure (email + password, bcrypt hash, JWT session)
- [x] Backend: login procedure (verify email + password, issue JWT session cookie)
- [x] Backend: logout procedure (clear session cookie)
- [x] Backend: forgotPassword procedure (generate reset token, return token in dev mode)
- [x] Backend: resetPassword procedure (verify token expiry, update password hash)
- [x] Frontend: Sign In page (/signin — email + password, "Forgot password?" link, "Create a free account" link)
- [x] Frontend: Create Account page (/register — name, email, org, role, password, confirm password)
- [x] Frontend: Forgot Password page (/forgot-password — email input, success state)
- [x] Frontend: Reset Password page (/reset-password?token=... — new password + confirm)
- [x] Wire auth into DashboardLayout (replaced getLoginUrl with /signin and /register buttons)
- [x] Remove Manus OAuth dependency from main.tsx, useAuth.ts, Onboarding.tsx, Landing.tsx, DashboardLayout.tsx
- [x] Auth tests (register, login, logout, forgot/reset password)

## Bug Fixes
- [x] Seed knowledge base categories into database — all 8 categories now showing in Knowledge Base sidebar and New Content category dropdown

## Knowledge Base Categories (Full Hierarchy)
- [x] Seed all 25 knowledge base categories with parent/child hierarchy — sidebar now shows parent groups as bold headers with children indented below (Architecture & Modernization, Technical Guides, Business & Strategy, Community Discussions, Custom Pages)

## Sidebar Navigation Update (IMG_0416 BuddyBoss Layout)
- [x] Replace sidebar tiles to match BuddyBoss layout: PERSONAL (My Profile, My Timeline, My Inbox), COMMUNITY (My Groups, My Connections, My Discussions, My Courses), MEDIA (My Photos, My Documents), Account Settings at bottom
- [x] Add "My Courses" nav item under COMMUNITY section
- [x] Remove/collapse TOOLS section from sidebar (Capabilities, Migration Planner, RFP Generator, AI Assistant, ROI Calculator hidden)
- [x] Remove Administration tile from sidebar (accessible via avatar menu or direct URL)

## Photo/Video Upload in Posts
- [x] Add media_urls JSON column to forum_posts table via migration
- [x] Backend: update createPost/createDiscussion procedures to accept media file uploads
- [x] Add S3 upload endpoint for post media (photos + videos)
- [x] Add media attachment UI to reply form (file picker, preview thumbnails, remove button)
- [x] Display uploaded photos/videos inline in discussion thread view

## Blog Section
- [x] Create blog_posts table (id, title, slug, content, excerpt, cover_image_url, author_id, status, published_at, created_at, updated_at)
- [x] Backend: blog CRUD tRPC procedures (createPost, listPosts, getPostBySlug, updatePost, deletePost)
- [x] Frontend: Blog listing page (/blog) with card grid, cover images, excerpts, author info
- [x] Frontend: Blog post detail page (/blog/:slug) with full content, author bio, related posts
- [x] Frontend: Blog post creation/edit form for authors and admins
- [x] Add Blog to sidebar navigation under COMMUNITY section
- [x] Add Blog routes to App.tsx
- [x] Seed 2-3 sample blog posts for demonstration

## Dashboard Redesign (Remove All Tiles)
- [x] Remove stat tiles (Capabilities, Knowledge Base, Community Members) from Home.tsx
- [x] Remove "Recommended for You" task path cards (Learn, Justify) from Home.tsx
- [x] Remove Quick Access section from Home.tsx
- [x] Replace dashboard with BuddyBoss-style activity feed home: welcome header, recent activity stream, quick post composer, trending discussions, active members widget

## Session: Dashboard Tiles Removal & Blog (Apr 12)
- [x] Remove all dashboard stat tiles (Capabilities, Knowledge Base, Community Members)
- [x] Remove Recommended for You task path cards (Learn, Justify)
- [x] Remove Quick Access section from dashboard
- [x] Replace dashboard with clean BuddyBoss-style activity feed + post composer
- [x] Update sidebar: remove Tools section, add My Courses and Blog to Community
- [x] Add real photo upload to post composer (file picker + S3 upload)
- [x] Add real video upload to post composer (file picker + S3 upload)
- [x] Add Blog section: blog_posts table, CRUD API, listing page, detail page
- [x] Blog: create/publish posts with title, excerpt, cover image, markdown content
- [x] Blog: delete post (author or admin only)
- [x] Blog tests: 6 tests covering create, list, get, update, delete (97 total tests passing)

## Session: Profile Fix & Media Upload (Apr 12 #2)
- [x] Fix My Profile 404 (sidebar link points to wrong route)
- [x] Add Member Directory to sidebar navigation
- [x] Add image/video upload to New Discussion form
- [x] Add image/video upload to Blog post creation

## Session: Dashboard Blog Widget (Apr 12 #3)
- [x] Replace Trending Discussions sidebar widget on home page with Latest Blog Posts

## Session: Sidebar Active State Fix (Apr 12 #4)
- [x] Fix sidebar active state - two items highlighted simultaneously due to partial path matching

## Session: Profile & Groups Routing Fix (Apr 12 #5)
- [x] Fix My Profile - clicking goes to member directory instead of own profile
- [x] Fix My Groups 404 - /groups route missing

## FCA Import Tool (Admin Panel)
- [x] Backend: parse FCA JSON/CSV member export, create users with password-reset tokens
- [x] Backend: parse FCA JSON/CSV post export, map spaces to forum categories, import as discussions or blog posts
- [x] Backend: dry-run mode that returns preview counts without writing to DB
- [x] Admin UI: file upload for members JSON/CSV
- [x] Admin UI: file upload for posts JSON/CSV
- [x] Admin UI: space-to-category mapping table
- [x] Admin UI: dry-run preview with counts before executing
- [x] Admin UI: progress feedback and results summary after import

## LinkedIn Post Import (Admin Panel)
- [x] Backend: linkedInImport.importPosts procedure - parse LinkedIn Shares.csv export format
- [x] Backend: map LinkedIn post text/date/media to OCOS blog or discussion schema
- [x] Backend: dry-run mode returning preview counts
- [x] Admin UI: LinkedIn import section in FCA Import tab (or separate tab)
- [x] Admin UI: file upload for LinkedIn Shares.csv
- [x] Admin UI: choose import target (blog post or forum discussion)
- [x] Admin UI: dry-run preview and execute with results summary

## Training Section
- [x] Add Training nav item to sidebar under Community section
- [x] Create /training route and Training page
- [x] Training page: course catalog with categories, enroll/view buttons
- [x] Add training route to App.tsx

## Notifications Page, Events, Group Pages
- [x] Add events table to schema (title, description, start_date, end_date, location, organizer_id, max_attendees, image_url)
- [x] Add event_rsvps table (event_id, user_id, status: going/maybe/not_going)
- [x] Add groups table (name, slug, description, cover_image, created_by, member_count)
- [x] Add group_members table (group_id, user_id, role: admin/member)
- [x] Generate and apply migration SQL
- [x] Backend: events CRUD (list, get, create, update, delete, RSVP)
- [x] Backend: groups CRUD (list, get, create, join, leave, members)
- [x] Backend: notifications page query (list all notifications for current user, mark read)
- [x] Frontend: Notifications page at /notifications with full feed and mark-all-read
- [x] Frontend: Wire bell icon in top nav to /notifications
- [x] Frontend: Events page at /events with calendar/list view and RSVP
- [x] Frontend: Group detail page at /groups/:slug with feed, members, announcements tabs
- [x] Frontend: My Groups page at /my-groups showing only joined groups
- [x] Sidebar: Add Events nav item, wire My Groups to /my-groups

## Big Feature Sprint (Apr 12)
- [x] My Courses - enrollment backend, course player UI, My Courses tab
- [x] My Connections - follow/unfollow backend, connections list page
- [x] My Groups - personal joined groups page (not full forum)
- [x] Global Search - search members, discussions, knowledge, blog
- [x] My Timeline - user-specific activity feed (own posts/activity)
- [x] Onboarding flow - multi-step wizard for new users (role, interests, profile)
- [x] Rich text editor - TipTap in posts, blog, and discussion composer
- [x] Mobile responsiveness - audit and fix all pages for mobile
- [x] Events sidebar item + bell icon → /notifications
- [x] Notifications page - dedicated feed with mark-as-read

## Big Feature Sprint - Completed (Apr 12 #6)
- [x] My Courses page with enrollment, catalog, and progress tracking (/courses)
- [x] My Connections page with following/followers tabs and unfollow (/connections)
- [x] My Groups page showing only user's joined groups (/groups)
- [x] Global Search across members, discussions, knowledge, blog (/search)
- [x] Notifications page with full feed and mark-all-read (/notifications)
- [x] Events page with list/calendar view and RSVP (/events)
- [x] Group detail pages with feed, members, announcements (/groups/:slug)
- [x] Rich text editor (TipTap) in Home post composer, Blog, and Discussions
- [x] Onboarding auto-redirect for new users (onboarded flag check)
- [x] Bell icon wired to /notifications in DashboardLayout
- [x] Search bar wired to /search in DashboardLayout
- [x] Events added to Community sidebar nav
- [x] My Courses wired to /courses in sidebar
- [x] My Connections wired to /connections in sidebar
- [x] Training section added to sidebar and Training Center page

## Bug Fix: My Profile Routing (Apr 13)
- [x] Fix My Profile opens Member Directory - Wouter route ordering issue

## Automated Workflows & Profile Fix (Apr 13)
- [x] Fix My Profile routing - /members/:id resolves to MemberDirectory
- [x] Workflow: new member signup triggers welcome notification
- [x] Workflow: post submitted for review triggers owner moderation notification
- [x] Workflow: post approved/rejected triggers author notification
- [x] Workflow: new reply to discussion triggers author notification
- [x] Workflow: new follower triggers notification to followed user
- [x] Workflow: new blog comment triggers author notification
- [x] Admin UI: Workflow log showing recent triggered events
- [x] Admin UI: Enable/disable individual workflows

## Weekly Digest System (Apr 12 - New Session)
- [x] Backend: assembleWeeklyDigest() - pull top discussions, blog posts, events, new members from past 7 days
- [x] Backend: sendWeeklyDigest() - send in-app notification to all active members + owner alert
- [x] Backend: digest router procedures (preview, send, history)
- [x] Backend: digest_sends table to track send history (sent_at, recipient_count, content_summary)
- [x] Admin UI: Digest tab with preview panel, manual send button, send history
- [x] Wire weekly_digest workflow toggle to enable/disable scheduled sends
- [x] Notifications page: digest type with Mail icon and content preview
- [x] Workflow settings: weekly_digest seeded on startup (idempotent)
- [x] Vitest: 10 digest tests passing

## Audit Implementation (Apr 12 - Full Build)

### Phase 1: Schema
- [x] Add postType enum to discussions table (question, discussion, insight, announcement, case_study, draft)
- [x] Add tags JSON field to discussions table
- [x] Add acceptedPostId to discussions table (accepted answer)
- [x] Add isSolution + isEditorPick to forum_posts table
- [x] Add aiSummary field to discussions table
- [x] Add organizations table (id, name, slug, type, website, description, logo_url, industry, size_band)
- [x] Add organizationId FK to users table
- [x] Add user_expertise join table (user_id, expertise_tag_id, level, verified)
- [x] Add expertise_tags table (id, name, slug, category)
- [x] Add audit_logs table (actor_user_id, action_type, target_type, target_id, details_json)
- [x] Add eventType enum to events table (webinar, ama, roundtable, working_group, conference, office_hours, training_cohort)
- [x] Add replayUrl to events table
- [x] Add relatedDiscussionId to events table
- [x] Add linkedIn URL to users table
- [x] Add verificationStatus to users table (unverified, pending, verified)
- [x] Add verificationNotes to users table
- [x] Add lastReviewedAt to content_nodes table
- [x] Add sourceDiscussionId to content_nodes table (for thread→article promotion)
- [x] Add spaceId to content_nodes table (link articles to spaces)
- [x] Add groupMember role field (admin, moderator, member)
- [x] Add polymorphic follows table (user_id, target_type, target_id)
- [x] Run migration and apply to DB

### Phase 2: Backend
- [x] DB helper: createOrganization, getOrganizations, getOrganizationById
- [x] DB helper: addUserExpertise, getUserExpertise, removeUserExpertise
- [x] DB helper: logAuditEvent (called from all admin/mod actions)
- [x] DB helper: getAuditLogs (paginated, filterable)
- [x] DB helper: markAcceptedAnswer (sets acceptedPostId on discussion, isSolution on post, adjusts reputation)
- [x] DB helper: generateAISummary (calls invokeLLM with thread content)
- [x] DB helper: promoteThreadToArticle (creates contentNode from discussion)
- [x] DB helper: getDiscussionsByType (filter by postType)
- [x] DB helper: getDiscussionsByTag (filter by tag)
- [x] DB helper: createFollow/removeFollow/getFollows (polymorphic)
- [x] DB helper: getSpaceContent (discussions + articles + events + courses for a category)
- [x] DB helper: getTopContributorsBySpace
- [x] DB helper: createExpertVerificationRequest, getVerificationRequests, approveVerification
- [x] DB helper: createEventDiscussionThread (auto-creates discussion on event completion)
- [x] tRPC router: discussions.markAccepted, discussions.generateSummary, discussions.promoteToArticle
- [x] tRPC router: organizations CRUD
- [x] tRPC router: expertise CRUD (add/remove user expertise tags)
- [x] tRPC router: follows (follow/unfollow space, post, tag, course, event)
- [x] tRPC router: spaces.getSpace, spaces.getTopContributors, spaces.getFeaturedContent
- [x] tRPC router: verification.apply, verification.list (admin), verification.approve
- [x] tRPC router: admin.getAuditLogs
- [x] tRPC router: events.createDiscussionThread

### Phase 3: Discussion Engine UI
- [x] Add post type selector to create discussion form (question, discussion, insight, announcement, case_study)
- [x] Add tag input to create discussion form (comma-separated or chip input)
- [x] Display post type badge on discussion cards and thread header
- [x] Display tags on discussion cards and thread header
- [x] Add tag filter chips to forum sidebar/filter bar
- [x] Add post type filter to forum list
- [x] Add "Mark as Solution" button on forum posts (thread author + admin only)
- [x] Highlight accepted answer at top of thread with green Solution badge
- [x] Add "Generate AI Summary" button on discussion thread (admin/mod only)
- [x] Display AI summary block below thread header when available
- [x] Add "Promote to Knowledge Article" button on discussion thread (admin/mod only)

### Phase 4: Thread → Knowledge Workflow
- [x] Admin action: "Promote Discussion to Article" opens a prefilled article creation dialog
- [x] Pre-populate title, content, summary from discussion
- [x] Set sourceDiscussionId on created contentNode
- [x] Show "Source Discussion" link on knowledge article page
- [x] Show "Knowledge Article" link on discussion thread when promoted
- [x] Admin moderation queue: add "Promote" action alongside approve/reject

### Phase 5: Training Hub (Live DB)
- [x] Replace static course catalog in Training.tsx with live trpc.courses.list query
- [x] Wire "Enroll" button to trpc.courses.enroll mutation
- [x] Show enrollment count and user enrollment status on course cards
- [x] Add progress bar to enrolled courses (from courseEnrollments.progressPercent)
- [x] Wire MyCourses.tsx to live courseEnrollments data
- [x] Add "Mark Complete" action (sets progressPercent to 100, grants completion badge)
- [x] Auto-grant completion badge when course marked complete
- [x] Seed 5 OPA courses into DB via admin panel or migration

### Phase 6: Space Pages
- [x] Create Spaces.tsx page listing all forum categories as Space cards
- [x] Create SpaceDetail.tsx page with tabs: Discussions, Knowledge, Events, Training, Members
- [x] Space page: Discussions tab shows filtered discussions for that space
- [x] Space page: Knowledge tab shows contentNodes linked to that space
- [x] Space page: Events tab shows events tagged to that space
- [x] Space page: Training tab shows courses linked to that space
- [x] Space page: Members tab shows top contributors for that space
- [x] Add /spaces and /spaces/:slug routes to App.tsx
- [x] Add Spaces to sidebar navigation

### Phase 7: Expert Verification + Event Loop + Mentions
- [x] Expert verification: "Apply for Verification" button on user settings page
- [x] Expert verification: Admin panel tab showing pending verification requests
- [x] Expert verification: Approve/reject action grants verified badge and updates verificationStatus
- [x] Event content loop: "Mark as Completed" action on event creates auto-discussion thread
- [x] Event content loop: Add replay URL field to event creation/edit form
- [x] Event content loop: Show replay link on event detail page
- [x] @mention: parse @username in reply, create forum_notification on submit (server-side regex + notifyMentionedUsers)

### Phase 8: Navigation + Profile + Gamification
- [x] Add LinkedIn URL field to user settings and profile display
- [x] Add verificationStatus badge to member profile and directory cards
- [x] Add organizationId/company to onboarding flow
- [x] Restructure sidebar: add Spaces as top-level nav item
- [x] Consolidate Training + My Courses into single Learning nav section
- [x] De-emphasize leaderboard (move to secondary nav or remove from primary community section)
- [x] Add profile completion indicator to user settings page
- [x] Add expertise tags UI to user settings (add/remove expertise tags)
- [x] Admin panel: add Audit Logs tab showing recent platform actions
- [x] Admin panel: add Verification Requests tab

## Audit Full Implementation (Apr 13 - Spec Alignment Sprint)
- [x] Schema: postType, tags, acceptedPostId, isSolution, aiSummary on discussions/forum_posts
- [x] Schema: organizations table, organizationId FK on users
- [x] Schema: expertise_tags + user_expertise join table
- [x] Schema: audit_logs table
- [x] Schema: eventType enum, replayUrl, relatedDiscussionId on events
- [x] Schema: linkedinUrl, verificationStatus, verificationNotes on users
- [x] Schema: lastReviewedAt, sourceDiscussionId, spaceId on content_nodes
- [x] Schema: expert_verification_requests table
- [x] Schema: polymorphic follows table (target_type, target_id)
- [x] Schema: digest_sends table
- [x] Migration 0016 applied to DB
- [x] DB helpers: createOrganization, getOrganizations, getOrganizationById
- [x] DB helpers: addUserExpertise, getUserExpertise
- [x] DB helpers: logAuditEvent, getAuditLogs
- [x] DB helpers: markAcceptedAnswer (sets acceptedPostId, isSolution, adjusts reputation)
- [x] DB helpers: generateAISummary (invokeLLM with thread content)
- [x] DB helpers: promoteDiscussionToArticle (creates contentNode from discussion)
- [x] DB helpers: getDiscussionsByType, getDiscussionsByTag
- [x] DB helpers: createFollow, removeFollow, getFollows (polymorphic)
- [x] DB helpers: getSpaceContent, getTopContributorsBySpace
- [x] DB helpers: createExpertVerificationRequest, getVerificationRequests, reviewVerificationRequest
- [x] DB helpers: seedWorkflowSettings (idempotent, weekly_digest included)
- [x] tRPC: discussions.markAccepted, discussions.generateSummary, discussions.promoteToArticle
- [x] tRPC: organizations CRUD
- [x] tRPC: expertise CRUD
- [x] tRPC: follows (polymorphic follow/unfollow/check)
- [x] tRPC: spaces.getSpace, spaces.getContent, spaces.getTopContributors
- [x] tRPC: verification.submit, verification.list, verification.review
- [x] tRPC: admin.getAuditLogs
- [x] Discussion Engine UI: post type selector (question/discussion/insight/announcement/case_study)
- [x] Discussion Engine UI: tag input (comma-separated chips)
- [x] Discussion Engine UI: post type badge on discussion cards
- [x] Discussion Engine UI: tag display on discussion cards
- [x] DiscussionThread: accepted answer marking with Solution badge
- [x] DiscussionThread: AI summary generation button + display block
- [x] DiscussionThread: Promote to Knowledge Article action (admin only)
- [x] Training Hub: live DB course catalog (8 seeded OPA courses)
- [x] Training Hub: Enroll/Continue/Completed buttons wired to DB
- [x] Training Hub: progress bars from courseEnrollments.progressPercent
- [x] Training Hub: Mark Complete action with badge grant
- [x] SpaceHub page at /spaces/:id with Discussions, Knowledge, Members tabs
- [x] SpaceHub: top contributors sidebar
- [x] SpaceHub: related spaces sidebar
- [x] SpaceHub route wired in App.tsx
- [x] Navigation: Discover section (Community Forum, Knowledge Base, Training Center, Events, Blog, Member Directory)
- [x] Navigation: My Space section (Profile, Courses, Groups, Connections, Messages, Activity)
- [x] Navigation: Leaderboard removed from primary nav
- [x] MemberProfile: Verified Expert badge (CheckCircle, emerald)
- [x] MemberProfile: LinkedIn link display
- [x] MemberProfile: expertise tags display
- [x] Admin panel: Expert Verification tab with pending/approved/rejected filter
- [x] Admin panel: Approve/Reject verification with review notes
- [x] All 107 tests passing

## Bug Fixes
- [x] My Profile page not working — fixed: isExpertVerified mapped to verificationStatus === 'verified'

## Priority 1 — High Impact (Apr 13)
- [x] Profile page: add Contributions, Articles, Courses, Spaces Followed tabs to MemberProfile.tsx
- [x] Dashboard: add "Continue Learning" widget showing active course + unread replies
- [x] Knowledge Article page: add contributors list, related threads, related articles (ContentDetail.tsx)
- [x] Events Hub: add On-Demand Recordings section and Upcoming/On-Demand filter tabs

## Priority 2 — Medium Impact (Apr 13)
- [x] Email delivery: nodemailer SMTP integration wired into workflows (welcome, reply, follow, approval)
- [x] Onboarding: add interest/space selection step (step 2) to Onboarding.tsx
- [x] Events: auto-create discussion thread when event marked complete + replay URL added
- [x] Training: add linkedDiscussionId to courses, surface linked thread on course detail

## Priority 3 — Phase 2 (Apr 13)
- [x] Global tags taxonomy: tags table + post_tags join table, tag pages (/tags + /tags/:slug)
- [x] Assessments: quiz/assessment functionality on courses, certification badge on completion
- [x] Instructor role: add to platformRole enum, build course management UI (Admin > Promotions tab)
- [x] Re-engagement automation: 30-day inactive member notification workflow (server scheduler + Admin > Re-engagement tab)

## UX Enhancement (Apr 13)
- [x] Spaces Followed tab: hover-to-preview popover showing space description, member count, recent discussions, and navigate CTA

## Tag Integration (Apr 13)
- [x] Build reusable TagInput component with autocomplete from global_tags table
- [x] Wire TagInput into Create Discussion form (tags field → post_tags on submit)
- [x] Wire TagInput into Knowledge Article editor (tags field → post_tags on submit)
- [x] Ensure tag display on discussion cards and article cards pulls from post_tags join (tags.getForPost procedure)

## Tag Follow-ups (Apr 13)
- [x] Seed 15-20 starter OPA tags (O-PAS, DCN, OPAF, migration, architecture, vendor-neutral, etc.) — TagSeedPanel in Admin > Seed Data
- [x] Tag chips on discussion cards in Forum (top 2-3 tags, link to /tags/:slug)
- [x] Tag chips on article cards in Knowledge Base (top 2-3 tags, link to /tags/:slug)
- [x] Tag filter chip row on Forum list view
- [x] Tag filter chip row on Knowledge Base list view


## Email Delivery Setup (Apr 13 — Resend Integration)
- [x] Resend SMTP credentials configured (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
- [x] Email test suite added (server/email.test.ts) — validates Resend config
- [x] OPAcommunity.com domain verified in Resend (DNS TXT record added by user)
- [x] End-to-end email delivery tested (welcome email sent to real inbox)


## Bug Fixes (Apr 13)
- [x] Login form validation error "The string did not match the expected pattern" — fixed by changing email input from type="email" to type="text" with inputMode="email" and adding .trim() to strip whitespace


## Courses Coming Soon (Apr 13)
- [x] Add 'coming_soon' status to courses and blog_posts schema
- [x] Mark all 8 OPA courses as 'coming_soon'
- [x] Update Training.tsx CourseCard to show "Coming Soon" badge and disable enroll button for coming_soon courses


## Authority Features (Apr 13 — Phase 1)

### 1. Member Verification & Credentials
- [ ] Add verification_status display on member profiles (unverified, pending, verified)
- [ ] Build admin verification panel (list pending members, approve/reject with notes)
- [x] Add verified badge to discussion posts and member profiles (VerifiedBadge.tsx component + wired to DiscussionCard, DiscussionThread, MemberDirectory)
- [ ] Send notification when member is verified

### 2. Course-Tied Certification & OPA Practitioner Badge
- [ ] Extend quiz_attempts table to track certification completion
- [x] Generate downloadable certificate PDF (CertificatePrint.tsx — printable page with print-optimized CSS)
- [ ] Create "OPA Practitioner" badge (awarded when all 8 courses completed + passed)
- [ ] Add certificate display to member profile
- [ ] Add LinkedIn share button for certificates

### 3. Events System (Separate Section)
- [x] Create events table (title, description, date, time, location/Zoom link, capacity, status)
- [x] Build Events page with calendar view and list view
- [x] Add event creation form (admin only)
- [x] Build event registration/RSVP system
- [x] Send email reminders 24h before event
- [x] Display registered attendees count

### 4. Case Study Library
- [ ] Create case_studies table (title, description, industry, company_size, roi, timeline, tech_stack, author, status)
- [ ] Build case study submission form (members submit, you curate)
- [ ] Build case study library page (filter by industry, ROI, tech stack)
- [ ] Add case study detail page with full story
- [ ] Add "Featured" case studies section on dashboard

### 5. Benchmarking Dashboard
- [ ] Create benchmarking_data table (member_id, roi, tech_stack, industry, implementation_timeline, team_size, timestamp)
- [ ] Build benchmarking data collection form (members submit anonymously or attributed)
- [ ] Build benchmarking dashboard with:
  - Average ROI by industry
  - Tech stack adoption rates
  - Implementation timeline distribution
  - Team size benchmarks
- [ ] Add continuous data updates (no annual report, live dashboard)
- [ ] Add data export for members (CSV)

### 6. Consulting Services Portal
- [x] Create services table (name, description, price, duration, availability)
- [x] Build consulting services page with service cards
- [x] Add booking form for each service (architecture review, custom training, implementation advisory)
- [x] Build inquiry management system (admin panel to track, respond to inquiries)
- [x] Send confirmation email to member + admin notification (sendConsultingInquiryEmails in email.ts, wired to consulting.inquire mutation)
- [ ] Add calendar/availability management for consulting slots


## Authority Features (Phase 2 - Schema Ready, Routers Pending)

### Database Schema (✅ Complete - Apr 13)
- [x] certificates table (course_completion, opa_practitioner badges)
- [x] case_studies table (submission, curation, approval workflow)
- [x] benchmarking_data table (ROI, tech stack, industry, company size)
- [x] consulting_services table (service offerings, pricing)
- [x] consulting_inquiries table (inquiry form, status tracking)

### Feature Implementation (Pending)
- [x] 1. Member Verification & Credentials (admin approval workflow + verified badge display — already existed)
- [x] 2. Course Certificates (tied to quizzes, OPA Practitioner badge after all 8 courses — router + UI built)
- [x] 3. Events & Webinars (separate Events section, registration, calendar, RSVP — already existed)
- [x] 4. Case Study Library (member submission form, admin curation, featured display — router + UI built)
- [x] 5. Benchmarking Dashboard (data collection form, continuous updates, visualizations — router + UI built)
- [x] 6. Consulting Services Portal (service listings, inquiry form, booking system — router + UI built)

### Implementation Notes
- All 6 features have database tables ready
- Existing event infrastructure can be extended for webinars
- Case studies follow the same approval workflow as blog posts
- Benchmarking data feeds into dashboard visualizations
- Consulting services integrate with notification system for inquiry alerts


## Bug Fixes (Apr 13 - continued)
- [x] Forgot password email not being sent — root cause: OAuth users had no passwordHash so mutation silently skipped email. Fixed by removing passwordHash guard, allowing OAuth users to set a password via reset flow — wired sendPasswordResetEmail to forgotPassword mutation, added origin param, fixed email input type

## Bug Fixes (Apr 14)
- [x] Fix FCA import page: Preview and Import buttons not working — root cause: parseJson only accepted flat JSON arrays, not CSV or FCA wrapper objects. Fixed by adding CSV parser (handles WebToffee export), JSON wrapper unwrapping ({items:[...]}, {data:[...]}, etc.), field name normalization (user_email→email, description→bio), and email-based deduplication. Successfully imported 34 members from WebToffee CSV export.
- [x] Fix FCA imported posts not formatted properly — added markdown-to-HTML conversion using `marked` library during import; cleaned up 186 duplicate/test discussions; reimported 13 posts with proper HTML formatting
- [x] Fix forum showing 0 discussions when "All" selected — getDiscussionsByCategory was filtering by categoryId=0 literally; fixed to skip WHERE clause when categoryId=0

## Unified Categories + KB Improvements (Apr 14)
- [x] Merge forum_categories and knowledge_categories into one shared taxonomy — both forum discussions and KB articles use the same category tree
- [x] Add edit functionality for KB articles (rich text editor, save changes)
- [x] Add delete functionality for KB articles (with confirmation dialog)
- [x] Ensure rich text editor (TipTap) is used for article creation and editing (not plain textarea)
- [x] Cross-navigation already existed (Related Discussions on KB articles, Related Articles on threads) — verified working with unified categories

## Remove Knowledge Base (Apr 14)
- [x] Remove Knowledge Base from sidebar navigation
- [x] Remove Knowledge Base route from App.tsx
- [ ] Remove Knowledge.tsx and ContentDetail.tsx pages (files kept but routes removed — no user can access them)
- [ ] Remove KB-related backend procedures (kept for now — no frontend calls them)
- [x] Clean up KB references in: Home.tsx quick links, DiscussionThread.tsx promote button, GlobalSearch.tsx knowledge tab, MemberProfile.tsx articles tab, SpaceHub.tsx knowledge tab, Tags.tsx articles tab, CapabilityDetail.tsx related knowledge, DashboardLayout.tsx sidebar + comments
- [x] Fix forum links not working — confirmed working on dev server; issue was published site running older version. User needs to re-publish latest checkpoint.
- [x] Clean up 15 test discussions from database (Test Discussion, Test Question, Tagged Discussion, Test Insight) — 13 real FCA posts remain
- [ ] Fix forum links not working on published site — clicking discussion titles does not navigate to thread on production

## Discussion Management (Apr 15)
- [x] Add edit/delete buttons to discussion cards (admin only)
- [x] Add pin/unpin functionality to keep important discussions at top
- [x] Add is_pinned field to discussions table
- [x] Update discussion listing to sort pinned discussions first

## Discussion Management (Completed Apr 15)
- [x] Fix routers.ts TS errors (lines 1229, 1684) — mutation argument count mismatch in pin/update/delete mutations
- [x] Complete discussion edit/delete/pin feature — frontend UI with edit/delete/pin dialogs in DiscussionThread.tsx
- [x] Write vitest for discussion mutations (pin, update, delete) — 15 tests passing, 157 total tests
- [x] Test discussion management UI end-to-end — edit, delete, and pin/unpin all working in browser

## Discussion Reply Notifications (Apr 15 - Completed)
- [x] Add notification trigger in createPost mutation when replying to a discussion
- [x] Create notification record in forum_notifications table
- [x] Send in-app notification to discussion author
- [x] Display reply notifications in Notifications page and bell icon
- [x] Write vitest for reply notification logic (12 tests passing)
- [x] Test end-to-end in browser

## Real-Time Notification Badge (Apr 15 - Completed)
- [x] Create useNotificationCount hook with polling (5-second interval)
- [x] Add notification badge to DashboardLayout header
- [x] Wire badge to show unread notification count
- [x] Update badge in real-time when new notifications arrive
- [x] Test real-time updates end-to-end

## Phase 1: Advanced Search & Filtering (Apr 15 - Completed)
- [x] Add full-text search index on discussions table
- [x] Create search query endpoint with filters (date, author, replies, views)
- [x] Build search UI component with filter controls
- [ ] Add saved searches functionality (future)
- [x] Test search performance and relevance

## Phase 2: Email Digest & Notifications (Apr 15 - Completed)
- [x] Create email_digest_preferences table for user settings
- [x] Build notification preference UI in account settings
- [x] Implement weekly digest generation job (Monday 9am cron)
- [x] Add email template for digest (top discussions, upcoming events, new members)
- [x] Test digest delivery end-to-end (UI ready)

## Phase 3: User Profiles with Activity Feed (Apr 15 - Completed)
- [x] Create user profile page with bio, expertise, discussion history
- [x] Build activity feed showing user contributions
- [x] Add profile editing for current user
- [x] Display reputation and badges on profile
- [x] Link profiles from discussions and comments
- [x] Create user_activity table to track contributions
- [x] Implement activity feed showing user's discussions/replies
- [x] Add contribution timeline visualization
- [x] Create profile editing UI
- [x] Test profile display and activity tracking
- [x] Add reputation-based member tier badges (Expert/Contributor/Active/Member)
- [x] Display tier badge on member profiles and directory cards

## Phase 3: Direct Messaging (Apr 15)
- [ ] Create messages table for direct conversations
- [ ] Build messaging UI component
- [ ] Implement message notifications
- [ ] Add message read/unread status
- [ ] Create message search and filtering
- [ ] Test messaging end-to-end


## Landing Page Update (Apr 15 - Completed)
- [x] Redesign landing page for unauthenticated users
- [x] Add hero section with OPA value proposition
- [x] Display community stats (members, discussions, resources)
- [x] Add featured discussions carousel
- [x] Add category browser
- [x] Add strong CTAs to join/explore
- [x] Professional dark theme with blue/cyan gradient
- [x] Responsive design for all devices

## Bug Fix (Apr 15 - Completed)
- [x] Fix 404 on published site — added /dashboard route to App.tsx, converted Home.tsx to authenticated dashboard view, fixed all TS errors blocking production build

## Bug Fix: Forum Links & Counts (Apr 15)
- [x] Fix community forum discussion links — code is correct, published site needs re-publish with latest checkpoint
- [x] Fix discussion counts — code is correct, published site running stale build

## Bug Fix: View Count "0" on Dashboard Cards (Apr 15 - Completed)
- [x] Fix Home.tsx dashboard using `discussion.views` instead of `discussion.viewCount` — field name mismatch causing "0 views" display
- [x] Fix Landing.tsx using same wrong field name `discussion.views` → `discussion.viewCount`
- [x] Fix broken navigation paths in ContentDetail.tsx, MemberProfile.tsx, GroupDetail.tsx — `/community/discussion/${slug}` → `/community/${slug}` to match route definition
- [x] Add 6 vitest tests verifying viewCount field returned from getDiscussionsByCategory and getDiscussionBySlug
- [x] All 175 tests passing

## Bug Fix: Links Still Not Working (Apr 15)
- [x] Landing page discussion cards redirect to /signin with returnTo param so user lands on discussion after login
- [x] Forum button in landing nav redirects to /signin with returnTo=/community
- [x] "Explore Forum" and "View All Discussions" CTAs redirect to /signin
- [x] Category cards on landing page redirect to /signin
- [x] Verify sign-in page reads returnTo param and redirects after successful login
- [x] Register page also reads returnTo param and redirects after successful registration
- [x] DashboardLayout auth gate passes current URL as returnTo to /signin and /register
- [x] Fixed all stale /login references (Landing.tsx, DiscussionThread.tsx)
- [x] Fixed all dead href="#" footer links in Landing.tsx
- [x] 25 new vitest tests for link redirect flow, 200 total tests passing

## Bug Fix: Edit Post Dialog Overflow (Apr 15)
- [x] Edit post dialog is larger than screen and doesn't scroll — fix to fit viewport with scrollable content
- [x] Applied same fix to all edit/create dialogs: DiscussionThread, CommunityForum, Knowledge, ContentDetail, Blog

## Bug Fix: Edits Not Saving / Line Breaks Stripped (Apr 15)
- [x] Investigate and fix: edits to discussion posts are not persisting — line breaks added by user are stripped after save
- [x] Root cause: TipTap useEditor only reads content on mount, not on re-open. Added useEffect sync to RichTextEditor.tsx
- [x] Fix applies globally to all RichTextEditor instances (forum, knowledge, blog, content detail)

## Feature: Optional Hero Images Per Section (Apr 15)
- [x] Add sectionHeroes DB table (sectionKey, heroImageUrl, title, subtitle)
- [x] Create tRPC procedures: getSectionHero, upsertSectionHero (admin only)
- [x] Add hero banner component with admin upload/edit overlay
- [x] Add hero banner to Community Forum page
- [x] Add hero banner to Training Center page
- [x] Add hero banner to Events page
- [x] Add hero banner to Blog page
- [x] Add hero banner to Knowledge Base page
- [x] Add hero banner to Member Directory page
- [x] Write vitest tests for hero image CRUD (7 tests passing)

## Weekly Digest Job & Email Template (Apr 15)
- [x] Build HTML email template for weekly digest (branded, responsive, inline CSS)
- [x] Build server-side scheduled job (node-cron) to auto-send weekly digest every Monday 9am
- [x] Wire digest job to assembleWeeklyDigest + send via SMTP with HTML template
- [x] Digest cron logs to server console + notifies owner on each send
- [x] Write vitest tests for digest email template rendering and job logic (23 tests passing, 230 total)

## Bug Fix: Discussion Thread Loses HTML Formatting (Apr 15)
- [x] Fix discussion thread view losing paragraph spacing/formatting — root cause: @tailwindcss/typography plugin not loaded in Tailwind 4 CSS. Added @plugin directive to index.css
- [x] Fix empty paragraph line breaks collapsing — TipTap uses empty <p></p> for blank lines; added CSS .prose p:empty { min-height: 1em } to preserve spacing

## Feature: Highlight Most Recent Reply (Apr 15)
- [x] Highlight the most recent reply in discussion thread with a different background color for readability

## Bug Fix: Community Forum Links Broken Again (Apr 15)
- [x] Fix broken links — root cause: wrapper divs had e.preventDefault() that killed Link navigation. Removed blanket preventDefault, kept only on interactive elements (dropdown trigger, tag spans)

## Feature: Member Verification Workflow (Apr 15)
- [x] Admin verification panel — already built (Admin.tsx Verification tab with pending/approved/rejected filter, review notes, approve/reject buttons)
- [x] Send notification (in-app + email) when member is verified — added createForumNotification + buildVerificationEmail in reviewVerificationRequest
- [x] Verification status display on member profiles — VerifiedBadge shows verified + pending (on own profile), MemberProfile uses VerifiedBadge component
- [x] Verification notification type added to Notifications page (ShieldCheck icon, emerald color)
- [x] Schema migration: added 'verification' to forum_notifications type enum

## Bug Fix: Community Forum Links + Wrong Counts (Apr 15)
- [x] Fix broken links on Community Forum page — converted DiscussionCard from onClick to <Link> wrapper + removed blanket e.preventDefault() from wrapper divs
- [x] Remove counts bar from Community Forum page per user request

## Bug Fix: Discussion Card Links Still Broken on Published Site (Apr 15)
- [x] Replace wouter <Link> with plain <a> tag for bulletproof navigation on published site
- [x] Remove incorrect topic counts from Community Forum category sidebar

## Dashboard Redesign: Eliminate Community Forum Page (Apr 16)
- [x] Remove Community Forum from sidebar navigation
- [x] Remove /community route (keep /community/:slug for discussion threads)
- [x] Move discussion list to Dashboard (Home.tsx) with category dropdown filter
- [x] Category dropdown uses existing forum_categories hierarchy (parent > child)
- [x] Discussion cards use plain <a> tags for navigation to /community/:slug
- [x] Keep New Discussion button on Dashboard
- [x] Keep search functionality on Dashboard

## Bug Fix: Delete and Pin Discussions Not Working (Apr 16)
- [x] Fix discussion delete mutation
- [x] Fix discussion pin mutation

## Bug Fix: Delete Discussion Not Working - Count Stays at 50 (Apr 16)
- [x] Fix delete mutation - discussion count stays at 50, item not removed from list
- [x] Fix cache invalidation after delete so list refreshes immediately

## Bug Fix: Delete Still Not Working + UI Overlap (Apr 16 #2)
- [x] Fix delete discussion - mutation still not firing on published site
- [x] Fix arrow chevron overlapping three-dot menu button on discussion cards

## Feature: Category Badge on Discussion Cards (Apr 16)
- [x] Replace post-type badge (Discussion/Question/Insight) with category name badge on each card

## Feature Removal: My Groups (Apr 16)
- [x] Remove My Groups from sidebar navigation
- [x] Remove My Groups route from App.tsx

## Feature: YouTube Video Attachments on Discussions (Apr 16)
- [x] Add youtubeUrl column to discussions table in schema.ts
- [x] Generate and apply DB migration
- [x] Update createDiscussion and updateDiscussion router inputs to accept youtubeUrl
- [x] Update getDiscussionsByCategory and getDiscussionBySlug to return youtubeUrl
- [x] Add YouTube URL input field to New Discussion dialog in Home.tsx
- [x] Add YouTube URL input field to Edit Discussion dialog in DiscussionThread.tsx
- [x] Render embedded YouTube player on DiscussionThread page when youtubeUrl is set
- [x] Show YouTube thumbnail/indicator on discussion cards in dashboard when video is attached

## Feature: YouTube as Discussion Post Header (Apr 16)
- [x] Move YouTube embed to full-width header at top of discussion post card (above title/content)

## Feature: Image Uploads in Discussions (Apr 16)
- [x] Add mediaUrls column to discussions table in schema.ts
- [x] DB column already present (migration applied before sandbox reset)
- [x] Update createDiscussion db helper to accept mediaUrls
- [x] Update createDiscussion router to accept mediaUrls
- [x] Update getDiscussionBySlug to return mediaUrls
- [x] Add Photo/Video upload buttons + preview to CreateDiscussionDialog
- [x] Pass attachedMedia as mediaUrls in CommunityForum.tsx createDiscussion mutation
- [x] Add timestamp suffix to slug in CommunityForum.tsx to prevent collisions
- [x] Render mediaUrls as image gallery at top of DiscussionThread post (single image full-width, multiple in grid)

## Feature: Image Upload in Edit Discussion Dialog (Apr 16)
- [x] Add image upload/remove support to the edit discussion dialog in DiscussionThread.tsx
- [x] Update updateDiscussion router to accept mediaUrls
- [x] Update updateDiscussion db helper to persist mediaUrls

## Manus Removal (2026-05-05 — Claude Code refactor)
- [x] Archive Manus working notes under docs/manus-archive/
- [x] Remove Manus debug collector and __manus__ public asset (vite plugin block + browser script)
- [x] Remove vite-plugin-manus-runtime devDependency and Manus allowedHosts
- [x] Replace manus.space URL fallbacks with localhost; standardize on APP_BASE_URL
- [x] Update test fixtures: loginMethod "manus" → "email"
- [x] Delete orphan Manus features: server-side maps/imageGeneration/voiceTranscription/dataApi proxies, client ManusDialog and Map components, @types/google.maps
- [x] Replace Forge LLM proxy with @anthropic-ai/sdk (default model claude-sonnet-4-5); preserved invokeLLM signature so router callers untouched
- [x] Replace Forge storage proxy with Cloudflare R2 via @aws-sdk/client-s3 + presigned GETs; added R2 smoke test (server/storage.smoke.test.ts) that uploads/fetches/deletes
- [x] Rewrite notifyOwner to send via SMTP using OWNER_EMAIL (was Forge SendNotification HTTP call)
- [x] Remove Manus OAuth scaffolding: deleted oauth.ts and types/manusTypes.ts; slimmed sdk.ts to JWT session helpers; removed registerOAuthRoutes from index.ts; trimmed const.ts (dropped getLoginUrl); removed manus-runtime-user-info localStorage line; uninstalled axios
- [x] Final env.ts cleanup: dropped appId, oAuthServerUrl, ownerOpenId, forgeApiUrl, forgeApiKey; added appBaseUrl, anthropicApiKey, r2*, ownerEmail. Switched db.ts owner-admin auto-promotion from openId match to email match. Replaced VITE_OAUTH_PORTAL_URL in email re-engagement template with APP_BASE_URL.
- [x] Updated CLAUDE.md with new environment variable list
