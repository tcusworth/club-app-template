import sys

with open('server/routers.ts', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File length: {len(content)} chars")

# Find the digest section
start_marker = 'digest: router({'
end_marker = '   }),\n\n  // \u2500\u2500\u2500 Knowledge Categories'

start_idx = content.find(start_marker)
# Go back to include the comment line before it
comment_start = content.rfind('\n  //', 0, start_idx)
start_idx = comment_start + 1  # skip the leading newline

end_idx = content.find(end_marker, start_idx)
end_idx_after = end_idx + len('   }),')  # include the closing }),

print(f"start: {start_idx}, end: {end_idx_after}")
print("Old section preview:")
print(repr(content[start_idx:start_idx+80]))
print(repr(content[end_idx_after-20:end_idx_after+20]))

new_section = '''  // \u2500\u2500\u2500 Digest Preferences & Weekly Digest \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
        ? recentDiscussions.map((d: any) => `- ${d.title} (${d.replyCount} replies)`).join("\\n")
        : "No new discussions this week.";
      const blogSection = recentBlogPosts.length > 0
        ? recentBlogPosts.map((p: any) => `- ${p.title} by ${p.authorName ?? "Community Member"}`).join("\\n")
        : "No new blog posts this week.";
      const eventsSection = upcomingEvents.length > 0
        ? upcomingEvents.map((e: any) => `- ${e.title} (${new Date(e.startDate).toLocaleDateString()})`).join("\\n")
        : "No upcoming events.";
      const membersSection = newMembers.length > 0
        ? newMembers.map((m: any) => `- ${m.name ?? "New Member"}${m.organization ? " (" + m.organization + ")" : ""}`).join("\\n")
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
      ].join("\\n");
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
        content: `Digest delivered to ${sentCount} opted-in members.\\n\\n${digestContent}`,
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
  }),'''

new_content = content[:start_idx] + new_section + content[end_idx_after:]
with open('server/routers.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)
print(f"Done! New file length: {len(new_content)} chars")
