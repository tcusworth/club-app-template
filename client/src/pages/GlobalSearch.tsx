import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, MessageSquare, BookOpen, Newspaper, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

const ROLE_LABELS: Record<string, string> = {
  owner_operator: "Owner/Operator", epc_integrator: "EPC/Integrator",
  automation_engineer: "Automation Engineer", executive: "Executive",
  vendor: "Vendor", analyst: "Analyst", admin: "Admin", user: "Member",
};

export default function GlobalSearch() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'replies' | 'views'>('recent');
  const [minReplies, setMinReplies] = useState<number | undefined>();
  const [minViews, setMinViews] = useState<number | undefined>();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  );

  const { data: advancedResults, isLoading: advancedLoading } = trpc.forum.searchDiscussions.useQuery(
    {
      query: debouncedQuery || undefined,
      sortBy,
      minReplies,
      minViews,
      limit: 50,
    },
    { enabled: showAdvanced && (debouncedQuery.length >= 2 || minReplies !== undefined || minViews !== undefined) }
  );

  const total = data ? (data.members.length + data.discussions.length + data.blog.length) : 0;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Search className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search</h1>
          <p className="text-sm text-muted-foreground">Find members, discussions, and blog posts</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {(isLoading || advancedLoading) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
          <Input
            autoFocus
            placeholder="Search the OPA community..."
            className="pl-9 pr-9 h-11 text-base"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {debouncedQuery.length >= 2 && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary hover:underline"
          >
            {showAdvanced ? "Hide" : "Show"} advanced filters
          </button>
        )}

        {showAdvanced && debouncedQuery.length >= 2 && (
          <div className="p-4 border border-border rounded-lg space-y-3 bg-accent/50">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="replies">Most Replies</option>
                  <option value="views">Most Views</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Min Replies</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minReplies ?? ""}
                  onChange={(e) => setMinReplies(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Min Views</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minViews ?? ""}
                  onChange={(e) => setMinViews(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {debouncedQuery.length < 2 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Type at least 2 characters to search</p>
        </div>
      )}

      {debouncedQuery.length >= 2 && !isLoading && data && (
        <>
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "No results found" : `${total} result${total !== 1 ? "s" : ""} for "${debouncedQuery}"`}
          </p>
          <Tabs defaultValue="all">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">All ({total})</TabsTrigger>
              <TabsTrigger value="members">Members ({data.members.length})</TabsTrigger>
              <TabsTrigger value="discussions">Discussions ({data.discussions.length})</TabsTrigger>

              <TabsTrigger value="blog">Blog ({data.blog.length})</TabsTrigger>
            </TabsList>

            {/* All results */}
            <TabsContent value="all" className="space-y-2 mt-4">
              {total === 0 ? <EmptyState query={debouncedQuery} /> : <>
                {data.members.slice(0, 3).map((m: any) => <MemberResult key={m.id} member={m} onNavigate={() => navigate(`/members/${m.id}`)} />)}
                {data.discussions.slice(0, 3).map((d: any) => <DiscussionResult key={d.id} item={d} onNavigate={() => navigate(`/community`)} />)}

                {data.blog.slice(0, 3).map((b: any) => <BlogResult key={b.id} item={b} onNavigate={() => navigate(`/blog/${b.slug}`)} />)}
              </>}
            </TabsContent>

            <TabsContent value="members" className="space-y-2 mt-4">
              {data.members.length === 0 ? <EmptyState query={debouncedQuery} /> :
                data.members.map((m: any) => <MemberResult key={m.id} member={m} onNavigate={() => navigate(`/members/${m.id}`)} />)}
            </TabsContent>

            <TabsContent value="discussions" className="space-y-2 mt-4">
              {showAdvanced && advancedResults && advancedResults.length > 0 ? (
                advancedResults.map((d: any) => <DiscussionResult key={d.id} item={d} onNavigate={() => navigate(`/community/${d.slug}`)} />)
              ) : data.discussions.length === 0 ? (
                <EmptyState query={debouncedQuery} />
              ) : (
                data.discussions.map((d: any) => <DiscussionResult key={d.id} item={d} onNavigate={() => navigate(`/community/${d.slug}`)} />)
              )}
            </TabsContent>



            <TabsContent value="blog" className="space-y-2 mt-4">
              {data.blog.length === 0 ? <EmptyState query={debouncedQuery} /> :
                data.blog.map((b: any) => <BlogResult key={b.id} item={b} onNavigate={() => navigate(`/blog/${b.slug}`)} />)}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
      <p>No results for "{query}"</p>
    </div>
  );
}

function MemberResult({ member, onNavigate }: { member: any; onNavigate: () => void }) {
  const initials = (member.name || member.email || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <button onClick={onNavigate} className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{member.name || member.email}</p>
        <Badge variant="outline" className="text-xs">{ROLE_LABELS[member.role] ?? member.role}</Badge>
      </div>
      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function DiscussionResult({ item, onNavigate }: { item: any; onNavigate: () => void }) {
  return (
    <button onClick={onNavigate} className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
        <MessageSquare className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">Discussion · {new Date(item.createdAt).toLocaleDateString()}</p>
      </div>
    </button>
  );
}

function KnowledgeResult({ item, onNavigate }: { item: any; onNavigate: () => void }) {
  return (
    <button onClick={onNavigate} className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
        <BookOpen className="h-4 w-4 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">Knowledge · {item.type}</p>
      </div>
    </button>
  );
}

function BlogResult({ item, onNavigate }: { item: any; onNavigate: () => void }) {
  return (
    <button onClick={onNavigate} className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
        <Newspaper className="h-4 w-4 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{item.excerpt || "Blog post"}</p>
      </div>
    </button>
  );
}
