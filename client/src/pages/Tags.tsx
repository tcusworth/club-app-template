import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { hueFor, CATEGORY_COLORS } from "@/lib/categoryColors";
import { Tag, Search, FileText, MessageSquare, BookOpen, Hash } from "lucide-react";

// Clamp a tag's pill font-size between 12px and 20px based on popularity.
function tagFontSize(count: number | null | undefined): number {
  return Math.min(20, Math.max(12, 12 + (count ?? 0) / 12));
}

// ─── Tags Index ──────────────────────────────────────────────────────────────
export function TagsIndex() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { data: tags, isLoading } = trpc.tags.list.useQuery();

  const filtered = (tags || []).filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const trending = [...filtered]
    .sort((a: any, b: any) => (b.postCount ?? 0) - (a.postCount ?? 0))
    .slice(0, 6);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-[34px] font-semibold leading-tight">Tags</h1>
            <p className="text-[15.5px] text-muted-foreground mt-1.5">
              Browse discussions by topic.
            </p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 bg-card border-border/70"
            />
          </div>
        </div>

        {!isLoading && trending.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--accent-700)] mr-2">
              Trending this week
            </span>
            {trending.map((tag: any) => {
              const colors = CATEGORY_COLORS[hueFor(tag.id ?? tag.name)];
              return (
                <span
                  key={tag.id}
                  onClick={() => setLocation(`/tags/${tag.slug}`)}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  #{tag.name}
                  {tag.postCount != null && <span className="opacity-70">↑{tag.postCount}</span>}
                </span>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="opa-card rounded-lg border bg-card p-5 flex flex-wrap gap-2.5">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="h-8 w-24 bg-muted rounded-full animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tags found</h3>
            <p className="text-muted-foreground text-sm">
              {search ? "Try a different search term." : "No tags have been created yet."}
            </p>
          </Card>
        ) : (
          <div className="opa-card rounded-lg border bg-card p-5 flex flex-wrap content-start gap-2.5">
            {filtered.map((tag: any) => {
              const colors = CATEGORY_COLORS[hueFor(tag.id ?? tag.name)];
              return (
                <button
                  key={tag.id}
                  onClick={() => setLocation(`/tags/${tag.slug}`)}
                  className="inline-flex items-center gap-1.5 rounded-full font-semibold transition-opacity hover:opacity-80"
                  style={{ background: colors.bg, color: colors.text, fontSize: tagFontSize(tag.postCount), padding: "6px 12px" }}
                >
                  #{tag.name}
                  {tag.postCount != null && <span className="opacity-60 font-normal">{tag.postCount}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Tag Detail Page ─────────────────────────────────────────────────────────
export default function TagDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, setLocation] = useLocation();

  const { data: tag, isLoading: tagLoading } = trpc.tags.getBySlug.useQuery({ slug });
  const { data: posts, isLoading: postsLoading } = trpc.tags.getPostsByTag.useQuery(
    { tagId: tag?.id ?? 0 },
    { enabled: !!tag?.id }
  );

  if (tagLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!tag) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Tag not found</h2>
          <button onClick={() => setLocation("/tags")} className="text-primary hover:underline text-sm">
            ← Back to all tags
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const postsData = posts as any;
  const discussions = postsData?.discussions || [];
  const articles = postsData?.contentNodes || [];
  const blogPosts: any[] = [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => setLocation("/tags")} className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1">
            ← All Tags
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Hash className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tag.name}</h1>
              {tag.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{tag.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" />{discussions.length} discussions</span>

            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{blogPosts.length} blog posts</span>
          </div>
        </div>

        {/* Content tabs */}
        <Tabs defaultValue="discussions">
          <TabsList>
            <TabsTrigger value="discussions" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Discussions ({discussions.length})
            </TabsTrigger>

            <TabsTrigger value="blog" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Blog ({blogPosts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions" className="mt-4 space-y-3">
            {postsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : discussions.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No discussions tagged with #{tag.name} yet.</p>
              </Card>
            ) : (
              discussions.map((p: any) => (
                <Card key={p.id} className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/community/${p.slug || p.targetId}`)}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{p.title || `Discussion #${p.targetId}`}</p>
                      {p.createdAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>



          <TabsContent value="blog" className="mt-4 space-y-3">
            {postsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : blogPosts.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No blog posts tagged with #{tag.name} yet.</p>
              </Card>
            ) : (
              blogPosts.map((p: any) => (
                <Card key={p.id} className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/blog/${p.slug || p.targetId}`)}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{p.title || `Post #${p.targetId}`}</p>
                      {p.createdAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
