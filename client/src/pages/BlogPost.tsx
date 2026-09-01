import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { SanitizedHtml, sanitizeClientHtml } from "@/components/SanitizedHtml";

function formatDate(ts: string | Date | null) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Markdown-to-HTML renderer. HTML is escaped first so raw tags cannot execute.
function renderMarkdown(text: string) {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(text);
  if (looksLikeHtml) return sanitizeClientHtml(text);
  const escaped = escapeHtml(text);
  return sanitizeClientHtml(
    escaped
      .replace(/^### (.+)$/gm, "<h3 class=\"text-lg font-semibold mt-6 mb-2\">$1</h3>")
      .replace(/^## (.+)$/gm, "<h2 class=\"text-xl font-semibold mt-8 mb-3\">$1</h2>")
      .replace(/^# (.+)$/gm, "<h1 class=\"text-2xl font-bold mt-8 mb-4\">$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code class=\"bg-muted px-1 py-0.5 rounded text-sm font-mono\">$1</code>")
      .replace(/^- (.+)$/gm, "<li class=\"ml-4 list-disc\">$1</li>")
      .replace(/\n\n/g, "</p><p class=\"mb-4\">")
  );
}

export default function BlogPost({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: post, isLoading } = trpc.blog.getPostBySlug.useQuery({ slug });
  const deletePost = trpc.blog.deletePost.useMutation({
    onSuccess: () => {
      toast.success("Post deleted.");
      setLocation("/blog");
    },
    onError: () => toast.error("Failed to delete post"),
  });

  const isAuthor = user && post && (user as any).id === post.authorId;
  const isAdmin = (user as any)?.role === "admin";

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-2">Post not found</h2>
        <p className="text-sm text-muted-foreground mb-4">This post may have been removed or doesn't exist.</p>
        <Button variant="outline" onClick={() => setLocation("/blog")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => setLocation("/blog")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Button>

      {/* Cover image */}
      {post.coverImageUrl && (
        <div className="rounded-xl overflow-hidden h-64 md:h-80">
          <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Post header */}
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {post.authorName?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{post.authorName || "Community Member"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(post.publishedAt || post.createdAt)}
              </p>
            </div>
          </div>

          {(isAuthor || isAdmin) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive gap-2"
              onClick={() => {
                if (confirm("Delete this post?")) deletePost.mutate({ id: post.id });
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>

        {post.excerpt && (
          <p className="text-base text-muted-foreground leading-relaxed border-l-4 border-primary/30 pl-4 italic">
            {post.excerpt}
          </p>
        )}
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Post content */}
      <SanitizedHtml
        className="prose prose-sm max-w-none text-foreground leading-relaxed space-y-4"
        html={`<p class="mb-4">${renderMarkdown(post.content)}</p>`}
      />

      {/* Footer */}
      <div className="pt-6 border-t border-border flex items-center justify-between">
        <Button variant="outline" onClick={() => setLocation("/blog")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          All Posts
        </Button>
        <p className="text-xs text-muted-foreground">
          Published {formatDate(post.publishedAt || post.createdAt)}
        </p>
      </div>
    </div>
  );
}
