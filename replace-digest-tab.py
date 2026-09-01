with open('client/src/pages/Admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'function DigestTab() {'
end_marker = '// \u2500\u2500\u2500 Forum Category Seed Panel'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

print(f"start: {start_idx}, end: {end_idx}")
print(repr(content[start_idx:start_idx+50]))
print(repr(content[end_idx-5:end_idx+50]))

new_digest_tab = '''function DigestTab() {
  const { data: preview, isLoading, refetch: refetchPreview } = trpc.digest.preview.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.digest.history.useQuery({ limit: 10 });
  const sendDigest = trpc.digest.send.useMutation({
    onSuccess: (data) => {
      toast.success(`Digest sent to ${data.subscriberCount} member(s)`);
      refetchPreview();
      refetchHistory();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Weekly Community Digest</CardTitle>
              <CardDescription>
                Send a weekly digest to all opted-in members via in-app notifications.
                {preview && ` Period: ${new Date(preview.period.from).toLocaleDateString()} \u2013 ${new Date(preview.period.to).toLocaleDateString()}`}
              </CardDescription>
            </div>
            <div className="text-right">
              {preview && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{preview.subscriberCount}</span> opted-in members
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : preview ? (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{preview.stats.users}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-blue-500">{preview.discussions.length}</p>
                  <p className="text-xs text-muted-foreground">New Discussions</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-emerald-500">{preview.blogPosts.length}</p>
                  <p className="text-xs text-muted-foreground">New Blog Posts</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-500">{preview.newMembers.length}</p>
                  <p className="text-xs text-muted-foreground">New Members</p>
                </div>
              </div>

              {/* Discussions */}
              {preview.discussions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    Top Discussions This Week
                  </h4>
                  <div className="space-y-1.5">
                    {preview.discussions.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{d.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{d.replyCount} replies</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blog Posts */}
              {preview.blogPosts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    New Blog Posts
                  </h4>
                  <div className="space-y-1.5">
                    {preview.blogPosts.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{p.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">by {p.authorName ?? "Unknown"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Events */}
              {preview.upcomingEvents.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    Upcoming Events
                  </h4>
                  <div className="space-y-1.5">
                    {preview.upcomingEvents.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{e.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{new Date(e.startDate).toLocaleDateString()}</span>
                        {e.isVirtual && <Badge variant="outline" className="text-xs shrink-0">Virtual</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Members */}
              {preview.newMembers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    New Members
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {preview.newMembers.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-1.5 text-sm bg-muted/30 rounded px-2 py-1">
                        <span className="font-medium">{m.name ?? "New Member"}</span>
                        {m.organization && <span className="text-xs text-muted-foreground">({m.organization})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.discussions.length === 0 && preview.blogPosts.length === 0 && preview.newMembers.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No new community activity this week.</p>
                </div>
              )}
            </>
          ) : null}

          <div className="pt-3 border-t flex items-center gap-3">
            <Button
              onClick={() => sendDigest.mutate()}
              disabled={sendDigest.isPending}
            >
              <Send className="w-4 h-4 mr-1.5" />
              {sendDigest.isPending ? "Sending..." : "Send Digest Now"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sends an in-app notification to all opted-in members ({preview?.subscriberCount ?? 0} recipients).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Send History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send History</CardTitle>
          <CardDescription>Recent digest sends and their reach.</CardDescription>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No digests sent yet.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{new Date(h.sentAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {h.newDiscussions} discussions \u00b7 {h.newBlogPosts} posts \u00b7 {h.upcomingEvents} events \u00b7 {h.newMembers} new members
                    </p>
                  </div>
                  <Badge variant="secondary">{h.recipientCount} sent</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
'''

new_content = content[:start_idx] + new_digest_tab + '\n' + content[end_idx:]
with open('client/src/pages/Admin.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print(f"Done! New file length: {len(new_content)} chars")
