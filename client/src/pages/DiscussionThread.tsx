import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  MessageCircle,
  Eye,
  Clock,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ThumbsUp,
  Pin,
  Lock,
  Tag,
  Paperclip,
  X,
  Film,
  MoreVertical,
  Edit,
  Trash2,
  Image,
  Video,
  Flag,
  EyeOff,
} from "lucide-react";
import { useLocation } from "wouter";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { SanitizedHtml } from "@/components/SanitizedHtml";

interface DiscussionThreadProps {
  slug: string;
}

const POST_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  question: {
    label: "❓ Question",
    color:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  discussion: {
    label: "💬 Discussion",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  insight: {
    label: "💡 Insight",
    color:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  announcement: {
    label: "📢 Announcement",
    color:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  case_study: {
    label: "📋 Case Study",
    color:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
};

export default function DiscussionThread({ slug }: DiscussionThreadProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [replyContent, setReplyContent] = useState("");
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoteTitle, setPromoteTitle] = useState("");
  const [mediaFiles, setMediaFiles] = useState<
    Array<{ name: string; url: string; mimeType: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMediaUrls, setEditMediaUrls] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([]);
  const [editIsUploading, setEditIsUploading] = useState(false);
  const editPhotoRef = useRef<HTMLInputElement>(null);
  const editVideoRef = useRef<HTMLInputElement>(null);
  const [reportDialogTarget, setReportDialogTarget] = useState<{ type: "discussion" | "post"; id: number } | null>(null);
  const [reportReason, setReportReason] = useState("");

  const discussionQuery = trpc.forum.getDiscussionBySlug.useQuery({ slug });
  const postsQuery = trpc.forum.getPostsByDiscussion.useQuery(
    { discussionId: discussionQuery.data?.id || 0 },
    { enabled: !!discussionQuery.data?.id }
  );

  const uploadFileMutation = trpc.upload.file.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const MAX_SIZE = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`${file.name} is not an image or video`);
        continue;
      }
      setIsUploading(true);
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const result = await uploadFileMutation.mutateAsync({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
        });
        setMediaFiles(prev => [
          ...prev,
          { name: file.name, url: result.url, mimeType: file.type },
        ]);
        toast.success(`${file.name} uploaded`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setIsUploading(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createPost = trpc.forum.createPost.useMutation({
    onSuccess: () => {
      toast.success("Reply posted");
      setReplyContent("");
      setMediaFiles([]);
      postsQuery.refetch();
    },
    onError: e => toast.error(e.message),
  });

  const markAcceptedMutation = trpc.discussionEngine.markAccepted.useMutation({
    onSuccess: () => {
      toast.success("Answer marked as accepted!");
      discussionQuery.refetch();
      postsQuery.refetch();
    },
    onError: e => toast.error(e.message),
  });

  const generateSummaryMutation =
    trpc.discussionEngine.generateSummary.useMutation({
      onSuccess: _data => {
        toast.success("AI summary generated!");
        discussionQuery.refetch();
      },
      onError: e => toast.error(e.message),
    });

  const promoteToArticleMutation =
    trpc.discussionEngine.promoteToArticle.useMutation({
      onSuccess: (data: any) => {
        toast.success("Thread promoted to knowledge article!");
        setShowPromoteDialog(false);
        if (data?.slug) setLocation(`/knowledge/${data.slug}`);
      },
      onError: e => toast.error(e.message),
    });

  // Edit/Delete/Pin mutations
  const updateMutation = trpc.forum.updateDiscussion.useMutation({
    onSuccess: () => {
      toast.success("Discussion updated!");
      setEditOpen(false);
      discussionQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update"),
  });

  const deleteMutation = trpc.forum.deleteDiscussion.useMutation({
    onSuccess: () => {
      toast.success("Discussion deleted!");
      setDeleteOpen(false);
      setLocation("/dashboard");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  });

  const pinMutation = trpc.forum.pinDiscussion.useMutation({
    onSuccess: () => {
      toast.success(discussion?.isPinned ? "Unpinned!" : "Pinned!");
      discussionQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || "Failed to pin"),
  });

  const reportMutation = trpc.moderation.report.useMutation({
    onSuccess: () => {
      toast.success("Thanks — an admin will review this.");
      setReportDialogTarget(null);
      setReportReason("");
    },
    onError: (err: any) => toast.error(err.message || "Couldn't submit that report."),
  });

  const setHiddenMutation = trpc.moderation.setHidden.useMutation({
    onSuccess: () => {
      toast.success("Updated.");
      discussionQuery.refetch();
      postsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || "Couldn't update visibility."),
  });

  const discussion = discussionQuery.data;
  const posts = postsQuery.data || [];
  const isAdmin = user?.role === "admin";
  const isAuthor = user && discussion && user.id === discussion.authorId;
  const canMarkAccepted =
    (isAuthor || isAdmin) && discussion?.postType === "question";
  const canManage = isAdmin || isAuthor;

  const tags: string[] = (() => {
    try {
      if (!discussion?.tags) return [];
      if (Array.isArray(discussion.tags)) return discussion.tags as string[];
      return JSON.parse(discussion.tags as string);
    } catch {
      return [];
    }
  })();

  const handleEditMediaUpload = async (file: File, mediaType: 'image' | 'video') => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large. Max 10MB.'); return; }
    setEditIsUploading(true);
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadFileMutation.mutateAsync({ fileName: file.name, mimeType: file.type, base64Data });
      setEditMediaUrls(prev => [...prev, { url: result.url, type: mediaType, name: file.name }]);
      toast.success(`${mediaType === 'image' ? 'Photo' : 'Video'} attached!`);
    } catch { toast.error('Upload failed.'); } finally { setEditIsUploading(false); }
  };

  const handleUpdate = () => {
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!discussion) return;
    const mediaUrls = editMediaUrls.map(m => m.url);
    updateMutation.mutate({
      id: discussion.id,
      title: editTitle,
      content: editContent,
      categoryId: discussion.categoryId,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });
  };

  const handleDelete = () => {
    if (!discussion) return;
    deleteMutation.mutate({ id: discussion.id });
  };

  const handlePin = () => {
    if (!discussion) return;
    pinMutation.mutate({ id: discussion.id, isPinned: !discussion.isPinned });
  };

  const openEditDialog = () => {
    if (discussion) {
      setEditTitle(discussion.title);
      setEditContent(discussion.content);
      // Pre-populate existing images
      const existing = (discussion as any).mediaUrls;
      if (Array.isArray(existing) && existing.length > 0) {
        setEditMediaUrls(existing.map((url: string) => ({
          url,
          type: /\.(mp4|webm|mov|avi)$/i.test(url) ? 'video' : 'image',
          name: url.split('/').pop() || 'image',
        })));
      } else {
        setEditMediaUrls([]);
      }
      setEditOpen(true);
    }
  };

  if (discussionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading discussion...</p>
        </div>
      </div>
    );
  }

  if (discussionQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-foreground mb-2">Unable to load discussion</p>
          <p className="text-sm text-muted-foreground mb-4">There was a problem fetching this discussion. Please try again.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => discussionQuery.refetch()}>Retry</Button>
            <Button onClick={() => setLocation("/dashboard")}>Back to Forum</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-foreground mb-4">
            Discussion not found
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            Back to Forum
          </Button>
        </Card>
      </div>
    );
  }

  const typeConfig = POST_TYPE_CONFIG[discussion.postType || "discussion"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Forum
        </Button>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                generateSummaryMutation.mutate({ discussionId: discussion.id })
              }
              disabled={generateSummaryMutation.isPending}
              className="gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generateSummaryMutation.isPending
                ? "Generating..."
                : "AI Summary"}
            </Button>
          )}
          {user && !isAuthor && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setReportDialogTarget({ type: "discussion", id: discussion.id })}
            >
              <Flag className="w-3.5 h-3.5" /> Report
            </Button>
          )}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && (
                  <DropdownMenuItem onClick={handlePin}>
                    <Pin className="w-4 h-4 mr-2" />
                    {discussion.isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => setHiddenMutation.mutate({ targetType: "discussion", targetId: discussion.id, isHidden: !(discussion as any).isHidden })}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    {(discussion as any).isHidden ? "Unhide" : "Hide"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={openEditDialog}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* AI Summary Banner */}
      {(discussion as any).aiSummary && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary mb-1">
                AI Summary
              </p>
              <p className="text-sm text-foreground">
                {(discussion as any).aiSummary}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Discussion Header */}
      <Card className="overflow-hidden">
        {(discussion as any).youtubeUrl &&
          (() => {
            const url = (discussion as any).youtubeUrl as string;
            const videoId = url.match(
              /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
            )?.[1];
            if (!videoId) return null;
            return (
              <div className="w-full aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            );
          })()}
        <div className="p-6">
          <div className="flex items-start gap-3 mb-3 flex-wrap">
            {discussion.isPinned && (
              <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            )}
            {discussion.isLocked && (
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            {typeConfig && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeConfig.color}`}
              >
                {typeConfig.label}
              </span>
            )}
            {(discussion as any).acceptedPostId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Solved
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {discussion.title}
          </h1>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              <Tag className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
              {tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4 flex-wrap">
            {discussion.authorName && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">
                  {discussion.authorName}
                </span>
                <VerifiedBadge status={discussion.authorVerificationStatus} />
              </div>
            )}
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{discussion.viewCount} views</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{discussion.replyCount} replies</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {/* Media images at top of post */}
          {(discussion as any).mediaUrls && (discussion as any).mediaUrls.length > 0 && (
            <div className="mb-4">
              {(discussion as any).mediaUrls.length === 1 ? (
                <img
                  src={(discussion as any).mediaUrls[0]}
                  alt="Post image"
                  className="w-full max-h-[480px] object-contain rounded-lg border border-border bg-muted"
                />
              ) : (
                <div className={`grid gap-2 ${
                  (discussion as any).mediaUrls.length === 2 ? 'grid-cols-2' :
                  (discussion as any).mediaUrls.length === 3 ? 'grid-cols-3' :
                  'grid-cols-2'
                }`}>
                  {(discussion as any).mediaUrls.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Post image ${i + 1}`}
                      className="w-full h-48 object-cover rounded-lg border border-border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <SanitizedHtml html={discussion.content} />
          </div>
        </div>
      </Card>

      {/* Posts/Replies */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Replies ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No replies yet. Be the first to reply!
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post, index) => {
              const isAccepted = (discussion as any).acceptedPostId === post.id;
              const postMediaUrls: string[] = Array.isArray(
                (post as any).mediaUrls
              )
                ? (post as any).mediaUrls
                : [];
              const isLatestReply =
                index === posts.length - 1 && posts.length > 1;
              return (
                <Card
                  key={post.id}
                  className={`p-4 ${isAccepted ? "border-green-500/40 bg-green-500/5" : isLatestReply ? "border-primary/30 bg-primary/5 ring-1 ring-primary/10" : ""}`}
                >
                  {isLatestReply && !isAccepted && (
                    <div className="flex items-center gap-1.5 mb-3 text-primary">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-semibold">
                        Latest Reply
                      </span>
                    </div>
                  )}
                  {isAccepted && (
                    <div className="flex items-center gap-1.5 mb-3 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-semibold">
                        Accepted Answer
                      </span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs">
                        {(post.authorName || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground text-sm">
                            {post.authorName || `User #${post.authorId}`}
                          </p>
                          <VerifiedBadge
                            status={post.authorVerificationStatus}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleString()}
                          </span>
                          {canMarkAccepted && !isAccepted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-green-600 dark:hover:text-green-400 gap-1"
                              onClick={() =>
                                markAcceptedMutation.mutate({
                                  discussionId: discussion.id,
                                  postId: post.id,
                                })
                              }
                              disabled={markAcceptedMutation.isPending}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Accepted
                            </Button>
                          )}
                          {user && post.authorId !== user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground gap-1"
                              onClick={() => setReportDialogTarget({ type: "post", id: post.id })}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground gap-1"
                              onClick={() => setHiddenMutation.mutate({ targetType: "post", targetId: post.id, isHidden: !(post as any).isHidden })}
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              {(post as any).isHidden ? "Unhide" : "Hide"}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <SanitizedHtml html={post.content} />
                      </div>
                      {/* Inline media attachments */}
                      {postMediaUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {postMediaUrls.map((url, i) => {
                            const isVideo = /\.(mp4|webm|mov|avi)$/i.test(url);
                            return isVideo ? (
                              <video
                                key={i}
                                src={url}
                                controls
                                className="max-w-full rounded-lg max-h-64 border border-border"
                              />
                            ) : (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={url}
                                  alt={`attachment ${i + 1}`}
                                  className="max-h-48 rounded-lg border border-border object-cover hover:opacity-90 transition-opacity"
                                />
                              </a>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{post.likeCount || 0}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Form */}
      {user ? (
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Post a Reply</h3>
          {discussion.isLocked ? (
            <p className="text-muted-foreground text-sm">
              This discussion is locked. No new replies can be posted.
            </p>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                rows={4}
              />
              {/* Media previews */}
              {mediaFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mediaFiles.map((f, i) => (
                    <div key={i} className="relative group">
                      {f.mimeType.startsWith("video/") ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                          <Film className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground max-w-32 truncate">
                            {f.name}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={f.url}
                          alt={f.name}
                          className="h-20 w-20 object-cover rounded-lg border border-border"
                        />
                      )}
                      <button
                        onClick={() =>
                          setMediaFiles(prev => prev.filter((_, j) => j !== i))
                        }
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-1.5"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {isUploading ? "Uploading..." : "Attach Media"}
                </Button>
                <Button
                  onClick={() => {
                    if (!replyContent.trim() && mediaFiles.length === 0) {
                      toast.error("Reply cannot be empty");
                      return;
                    }
                    createPost.mutate({
                      discussionId: discussion.id,
                      content: replyContent,
                      mediaUrls: mediaFiles.map(f => f.url),
                    });
                  }}
                  disabled={createPost.isPending || isUploading}
                >
                  {createPost.isPending ? "Posting..." : "Post Reply"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign in to post a reply</p>
          <Button onClick={() => setLocation("/signin")}>Sign In</Button>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <div>
              <Label>Title</Label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <Label>Content</Label>
              <RichTextEditor
                value={editContent}
                onChange={setEditContent}
                minHeight="200px"
                className="mt-1"
              />
            </div>
            {/* Image/Video upload */}
            <div>
              <Label>Images / Videos</Label>
              <div className="mt-2 space-y-2">
                {editMediaUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editMediaUrls.map((m, i) => (
                      <div key={i} className="relative group">
                        {m.type === 'video' ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm border border-border">
                            <Film className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground max-w-32 truncate">{m.name}</span>
                          </div>
                        ) : (
                          <img src={m.url} alt={m.name} className="h-20 w-20 object-cover rounded-lg border border-border" />
                        )}
                        <button
                          type="button"
                          onClick={() => setEditMediaUrls(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={editPhotoRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { Array.from(e.target.files || []).forEach(f => handleEditMediaUpload(f, 'image')); if (editPhotoRef.current) editPhotoRef.current.value = ''; }} />
                  <input ref={editVideoRef} type="file" accept="video/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleEditMediaUpload(f, 'video'); if (editVideoRef.current) editVideoRef.current.value = ''; }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => editPhotoRef.current?.click()} disabled={editIsUploading} className="gap-1.5">
                    <Image className="w-3.5 h-3.5" />
                    {editIsUploading ? 'Uploading...' : 'Add Photo'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => editVideoRef.current?.click()} disabled={editIsUploading} className="gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    Add Video
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!reportDialogTarget} onOpenChange={(open) => { if (!open) { setReportDialogTarget(null); setReportReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {reportDialogTarget?.type === "discussion" ? "discussion" : "reply"}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label>What's wrong with this {reportDialogTarget?.type === "discussion" ? "discussion" : "reply"}?</Label>
            <Textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Tell us what's wrong..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReportDialogTarget(null); setReportReason(""); }}>Cancel</Button>
            <Button
              disabled={!reportReason.trim() || reportMutation.isPending}
              onClick={() => reportDialogTarget && reportMutation.mutate({ targetType: reportDialogTarget.type, targetId: reportDialogTarget.id, reason: reportReason.trim() })}
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discussion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the discussion and all its replies.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
