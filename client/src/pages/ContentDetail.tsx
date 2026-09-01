import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Upload, FileText, Image, Film, Network, ArrowRight, Users, MessageSquare, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { SanitizedHtml } from "@/components/SanitizedHtml";
import { useLocation, Link } from "wouter";

import { useAuth } from "@/_core/hooks/useAuth";
import { useRef, useState, useMemo } from "react";
import { toast } from "sonner";

export default function ContentDetail({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: node, isLoading } = trpc.content.getBySlug.useQuery({ slug });
  const { data: media, refetch: refetchMedia } = trpc.content.media.useQuery(
    { contentNodeId: node?.id ?? 0 },
    { enabled: !!node?.id }
  );
  const { data: allCapabilities } = trpc.capabilities.list.useQuery();
  // Enrichment queries
  const nodeTags = useMemo(() => (node?.tags as string[] | null) ?? [], [node?.tags]);
  const { data: contributors } = trpc.contentEnrich.getContributors.useQuery(
    { nodeId: node?.id ?? 0 },
    { enabled: !!node?.id }
  );
  const { data: relatedArticles } = trpc.contentEnrich.getRelated.useQuery(
    { nodeId: node?.id ?? 0, tags: nodeTags },
    { enabled: !!node?.id }
  );
  const { data: relatedDiscussions } = trpc.contentEnrich.getRelatedDiscussions.useQuery(
    { nodeId: node?.id ?? 0, tags: nodeTags },
    { enabled: !!node?.id }
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSummary, setEditSummary] = useState("");

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      toast.success("Content updated");
      setEditOpen(false);
    },
    onError: (err: any) => toast.error(`Update failed: ${err.message}`),
  });

  const deleteContent = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success("Content deleted");
      setLocation("/knowledge");
    },
    onError: (err: any) => toast.error(`Delete failed: ${err.message}`),
  });

  const handleEditOpen = () => {
    if (!node) return;
    setEditTitle(node.title);
    setEditBody(node.body || "");
    setEditSummary(node.summary || "");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!node || !editTitle.trim()) return;
    await updateContent.mutateAsync({
      id: node.id,
      title: editTitle,
      body: editBody,
      summary: editSummary,
    });
  };

  const uploadFile = trpc.upload.file.useMutation({
    onSuccess: () => {
      toast.success("File uploaded");
      refetchMedia();
      setUploading(false);
    },
    onError: () => {
      toast.error("Upload failed");
      setUploading(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !node) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFile.mutate({
        fileName: file.name,
        mimeType: file.type,
        base64Data: base64,
        contentNodeId: node.id,
      });
    };
    reader.readAsDataURL(file);
  };

  // Resolve linked capabilities
  const linkedCaps = useMemo(() => {
    if (!node || !allCapabilities) return [];
    const linked = (node.linkedCapabilities as number[] | null) || [];
    return allCapabilities.filter(c => linked.includes(c.id));
  }, [node, allCapabilities]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground text-sm">Loading...</div></div>;
  }

  if (!node) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Content not found</p>
        <Button variant="ghost" onClick={() => setLocation("/knowledge")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Knowledge
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => setLocation("/knowledge")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Knowledge Base
      </button>

      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">{node.type.replace("_", " ")}</Badge>
            <Badge variant="outline" className="text-xs">v{node.version}</Badge>
          </div>
          {user?.role === 'admin' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleEditOpen}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{node.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this content and all its attachments. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteContent.mutate({ id: node.id })}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{node.title}</h1>
        {node.summary && <p className="text-muted-foreground mt-1">{node.summary}</p>}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(node.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Tags */}
      {(node.tags as string[] | null)?.length ? (
        <div className="flex gap-1.5 flex-wrap">
          {(node.tags as string[]).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      ) : null}

      {/* Linked Capabilities — Cross-linking UI */}
      {linkedCaps.length > 0 && (
        <Card className="border-border/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Related O-PAS Capabilities</h3>
            </div>
            <div className="grid gap-2">
              {linkedCaps.map(cap => (
                <button
                  key={cap.id}
                  onClick={() => setLocation(`/capabilities/${cap.slug}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="p-1.5 rounded bg-primary/10 shrink-0">
                    <Network className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cap.name}</p>
                    {cap.opasLayer && <p className="text-[10px] text-muted-foreground">{cap.opasLayer} Layer</p>}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Body */}
      {node.body && (
        <Card className="border-border/30">
          <CardContent className="p-6 prose prose-invert prose-sm max-w-none">
            <SanitizedHtml html={node.body} />
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Summary</Label>
              <Input value={editSummary} onChange={(e) => setEditSummary(e.target.value)} />
            </div>
            <div>
              <Label>Body</Label>
              <RichTextEditor key={node.id} value={editBody} onChange={setEditBody} placeholder="Write your content..." minHeight="300px" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0 pt-4">
            <Button onClick={handleEditSave} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white" disabled={updateContent.isPending}>
              {updateContent.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contributors */}
      {contributors && (contributors as any[]).length > 0 && (
        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Contributors</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {(contributors as any[]).map((c: any) => (
                <Link key={c.id} href={`/members/${c.id}`}>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5 hover:bg-muted transition-colors cursor-pointer">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] font-semibold">{c.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{c.name || 'Anonymous'}</span>
                    {c.verificationStatus === 'verified' && (
                      <CheckCircle className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Discussions */}
      {relatedDiscussions && (relatedDiscussions as any[]).length > 0 && (
        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Related Discussions</h3>
            </div>
            <div className="space-y-2">
              {(relatedDiscussions as any[]).map((d: any) => (
                <Link key={d.id} href={`/community/${d.slug}`}>
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{d.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.replyCount ?? 0} replies</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Articles */}
      {relatedArticles && (relatedArticles as any[]).length > 0 && (
        <Card className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Related Articles</h3>
            </div>
            <div className="space-y-2">
              {(relatedArticles as any[]).map((a: any) => (
                <Link key={a.id} href={`/knowledge/${a.slug}`}>
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{a.title}</p>
                      {a.summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.summary}</p>}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Attachments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">Attachments</h2>
          {user && (
            <>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx" />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> {uploading ? "Uploading..." : "Upload"}
              </Button>
            </>
          )}
        </div>
        {media && media.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {media.map(m => (
              <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="block">
                <Card className="card-glow border-border/30 overflow-hidden">
                  {m.mimeType.startsWith("image/") ? (
                    <img src={m.url} alt={m.fileName} className="w-full h-32 object-cover" />
                  ) : m.mimeType.startsWith("video/") ? (
                    <div className="w-full h-32 bg-muted flex items-center justify-center">
                      <Film className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <CardContent className="p-2">
                    <p className="text-xs truncate text-muted-foreground">{m.fileName}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60">No attachments yet</p>
        )}
      </div>
    </div>
  );
}
