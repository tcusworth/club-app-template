import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CLUB_NAME } from "@/lib/clubConfig";
import SectionHeroBanner from '@/components/SectionHeroBanner';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/RichTextEditor";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Newspaper, PenLine, Clock, User, Image, Video, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { ListCard } from "@/components/dashboard/ListCard";
import { hueFor } from "@/lib/categoryColors";

function timeAgo(ts: string | Date | null) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type AttachedMedia = { url: string; type: "image" | "video"; name: string };

export default function Blog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const isAdmin = (user as { role?: string } | null)?.role === "admin";
  const [form, setForm] = useState({
    title: "", content: "", excerpt: "", coverImageUrl: "", status: "draft" as "draft" | "published",
  });
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"cover" | "inline" | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: posts, refetch } = trpc.blog.listPosts.useQuery({ status: "published" });
  const uploadFileMutation = trpc.upload.file.useMutation();

  const handleFileUpload = async (file: File, target: "cover" | "image" | "video") => {
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10MB."); return; }
    setIsUploading(true);
    setUploadTarget(target === "cover" ? "cover" : "inline");
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadFileMutation.mutateAsync({ fileName: file.name, mimeType: file.type, base64Data });
      if (target === "cover") {
        setForm((prev) => ({ ...prev, coverImageUrl: result.url }));
        toast.success("Cover image uploaded!");
      } else {
        setAttachedMedia((prev) => [...prev, { url: result.url, type: target, name: file.name }]);
        toast.success(`${target === "image" ? "Photo" : "Video"} attached!`);
      }
    } catch { toast.error("Upload failed. Please try again."); }
    finally { setIsUploading(false); setUploadTarget(null); }
  };

  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.status === "published" ? "Blog post published!" : "Draft saved. An admin must publish it.");
      setShowCreate(false);
      setForm({ title: "", content: "", excerpt: "", coverImageUrl: "", status: "draft" });
      setAttachedMedia([]);
      refetch();
    },
    onError: (e) => toast.error(e.message || "Failed to save post"),
  });

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.content.trim() && attachedMedia.length === 0) { toast.error("Content or media is required."); return; }
    const mediaMarkdown = attachedMedia.map((m) =>
      m.type === "image" ? `\n\n![${m.name}](${m.url})` : `\n\n[Video: ${m.name}](${m.url})`
    ).join("");
    const fullContent = (form.content.trim() || "") + mediaMarkdown;
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
    createPost.mutate({
      ...form,
      content: fullContent,
      slug,
      status: isAdmin ? form.status : "draft",
    });
  };

  const isAuthor = !!user;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <SectionHeroBanner sectionKey="blog" />
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-[34px] font-semibold leading-tight">{CLUB_NAME} Blog</h1>
          <p className="text-[15.5px] text-muted-foreground mt-1.5">Insights, updates, and stories from the community</p>
        </div>
        {isAuthor && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <PenLine className="h-4 w-4" />
            Write a Post
          </Button>
        )}
      </div>

      {/* Post list */}
      {posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <ListCard
              key={post.id}
              hue={hueFor(post.id)}
              onClick={() => setLocation(`/blog/${post.slug}`)}
            >
              <h4 className="text-[18px] font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 mb-1.5">
                {post.title}
              </h4>
              {post.excerpt && (
                <p className="text-[14.5px] text-muted-foreground line-clamp-2 mb-2 leading-normal">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center gap-4 text-[13px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <User className="h-3 w-3" />
                  {post.authorName || "Community Member"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(post.publishedAt || post.createdAt)}
                </span>
              </div>
            </ListCard>
          ))}
        </div>
      ) : (
        <Card className="border-border shadow-sm">
          <CardContent className="p-12 text-center">
            <Newspaper className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">No posts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first to share an insight with the {CLUB_NAME}.
            </p>
            {isAuthor && (
              <Button onClick={() => setShowCreate(true)}>
                <PenLine className="h-4 w-4 mr-2" />
                Write the First Post
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "cover"); e.target.value = ""; }} />
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "image"); e.target.value = ""; }} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "video"); e.target.value = ""; }} />

      {/* Create Post Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Write a Blog Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="Enter a compelling title..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Cover image */}
            <div className="space-y-1.5">
              <Label>Cover Image</Label>
              {form.coverImageUrl ? (
                <div className="relative group rounded-lg overflow-hidden border border-border">
                  <img src={form.coverImageUrl} alt="Cover" className="w-full h-40 object-cover" />
                  <button
                    className="absolute top-2 right-2 h-7 w-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setForm((prev) => ({ ...prev, coverImageUrl: "" }))}
                  ><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <button
                  className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  disabled={isUploading}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">{uploadTarget === "cover" && isUploading ? "Uploading..." : "Click to upload cover image"}</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Excerpt</Label>
              <Textarea
                placeholder="A short summary shown in the blog listing (optional)..."
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="min-h-[60px] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Content *</Label>
              <RichTextEditor
                placeholder="Write your post content here..."
                value={form.content}
                onChange={(html) => setForm({ ...form, content: html })}
                minHeight="200px"
              />
            </div>

            {/* Inline media attachments */}
            {attachedMedia.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Attached Media (will be appended to content)</Label>
                <div className="flex flex-wrap gap-2">
                  {attachedMedia.map((m, i) => (
                    <div key={i} className="relative group">
                      {m.type === "image" ? (
                        <img src={m.url} alt={m.name} className="h-20 w-20 object-cover rounded-lg border border-border" />
                      ) : (
                        <div className="h-20 w-32 bg-muted rounded-lg border border-border flex items-center justify-center gap-1.5">
                          <Video className="h-5 w-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate max-w-[80px]">{m.name}</span>
                        </div>
                      )}
                      <button
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setAttachedMedia((prev) => prev.filter((_, j) => j !== i))}
                      ><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media upload buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
              <span className="text-xs text-muted-foreground mr-1">Add media:</span>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary"
                disabled={isUploading} onClick={() => photoInputRef.current?.click()}>
                <Image className="h-4 w-4 mr-1" />
                <span className="text-xs">{uploadTarget === "inline" && isUploading ? "Uploading..." : "Photo"}</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary"
                disabled={isUploading} onClick={() => videoInputRef.current?.click()}>
                <Video className="h-4 w-4 mr-1" />
                <span className="text-xs">{uploadTarget === "inline" && isUploading ? "Uploading..." : "Video"}</span>
              </Button>
            </div>

            {isAdmin && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as "draft" | "published" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft (only visible to you)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createPost.isPending || isUploading}>
              {createPost.isPending ? "Saving..." : isAdmin && form.status === "published" ? "Publish Post" : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
