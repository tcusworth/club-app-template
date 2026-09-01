import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import RichTextEditor from '@/components/RichTextEditor';
import { TagInput, TagValue, resolveTagIds } from '@/components/TagInput';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { StatStrip } from '@/components/dashboard/StatStrip';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { CategoryPill } from '@/components/dashboard/ListCard';
import { hueFor, CATEGORY_COLORS, CATEGORY_HUES } from '@/lib/categoryColors';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  MessageSquare, Users, BookOpen, Trophy, ArrowRight,
  TrendingUp, Clock, Eye, Bell, Flame, Plus,
  Search, Calendar, Award, BarChart3, Pin, Lock,
  ChevronRight, Edit, Trash2, MoreVertical, Image, Video, X,
  Filter,
} from 'lucide-react';

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}


// ─── Category hierarchy matching the user's screenshot ─────────────────────
const CATEGORY_GROUPS = [
  {
    icon: '🏗️',
    label: 'Architecture & Modernization',
    children: [
      'System Architecture',
      'Migration & Modernizations',
      'Control Software & Portability',
      'Cybersecurity',
      'O-PAS Profiles',
    ],
  },
  {
    icon: '🔧',
    label: 'Technical Guides',
    children: [
      'Troubleshooting',
      'Implementation Guides',
      'Best Practices',
      'How-Tos',
      'Architecture Diagrams',
    ],
  },
  {
    icon: '📊',
    label: 'Business & Strategy',
    children: [
      'Economics & ROI',
      'Modernization Strategy',
      'Vendor Landscape (neutral)',
      'Executive Guides',
    ],
  },
  {
    icon: '💬',
    label: 'Community Discussions',
    children: [
      'General Q&A',
      'News',
      'Events & Webinars',
    ],
  },
  {
    icon: '📖',
    label: 'Reference',
    children: [
      'Glossary',
      'Beginner FAQ',
      'Starter Kit',
    ],
  },
];

export default function Home() {
  const { user } = useAuth();

  // ─── State ────────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newPostType, setNewPostType] = useState<string>('discussion');
  const [newTags, setNewTags] = useState<TagValue[]>([]);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ─── Queries ──────────────────────────────────────────────────────────
  const { data: discussions, isLoading: loadingDiscussions, refetch: refetchDiscussions } = trpc.forum.getDiscussionsByCategory.useQuery({
    categoryId: selectedCategoryId,
    limit: 500,
  });
  const { data: categories } = trpc.forum.getCategories.useQuery();
  const { data: notifications } = trpc.notifications.list.useQuery({ unreadOnly: true });
  const { data: leaderboard } = trpc.gamification.getLeaderboard.useQuery({ limit: 5 });

  // ─── Mutations ────────────────────────────────────────────────────────
  const findOrCreateTag = trpc.tags.findOrCreate.useMutation();
  const addTagsToPost = trpc.tags.addToPostBulk.useMutation();
  const uploadFileMutation = trpc.upload.file.useMutation();

  const createDiscussionMutation = trpc.forum.createDiscussion.useMutation({
    onSuccess: async (result: any) => {
      if (newTags.length > 0) {
        try {
          const insertId = (result as any)?.insertId ?? (result as any)?.[0]?.insertId;
          if (insertId) {
            const tagIds = await resolveTagIds(newTags, findOrCreateTag.mutateAsync);
            if (tagIds.length > 0) {
              await addTagsToPost.mutateAsync({ tagIds, targetType: 'discussion', targetId: insertId });
            }
          }
        } catch { /* non-fatal */ }
      }
      toast.success('Discussion created!');
      setCreateOpen(false);
      setNewTitle('');
      setNewContent('');
      setAttachedMedia([]);
      setNewPostType('discussion');
      setNewTags([]);
      setNewYoutubeUrl('');
      refetchDiscussions();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create discussion'),
  });

  const handleCreateDiscussion = () => {
    if (!newTitle.trim() || !newContent.trim() || !newCategoryId) {
      toast.error('Please fill in all fields');
      return;
    }
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100) + '-' + Date.now();
    const mediaUrls = attachedMedia.map((m) => m.url);
    createDiscussionMutation.mutate({
      title: newTitle,
      slug,
      content: newContent,
      categoryId: parseInt(newCategoryId),
      postType: newPostType as any,
      tags: newTags.map((t) => (typeof t === 'string' ? t : t.name || '')).filter(Boolean),
      youtubeUrl: newYoutubeUrl.trim() || undefined,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });
  };

  const handleMediaUpload = async (file: File, mediaType: 'image' | 'video') => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large. Max 10MB.'); return; }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadFileMutation.mutateAsync({ fileName: file.name, mimeType: file.type, base64Data });
      setAttachedMedia((prev) => [...prev, { url: result.url, type: mediaType, name: file.name }]);
      toast.success(`${mediaType === 'image' ? 'Photo' : 'Video'} attached!`);
    } catch { toast.error('Upload failed.'); } finally { setIsUploading(false); }
  };

  // ─── Build category lookup ────────────────────────────────────────────
  const categoryMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (categories) {
      for (const c of categories) {
        map[c.name.toLowerCase()] = c.id;
      }
    }
    return map;
  }, [categories]);

  // Build grouped options for the category dropdown
  const categoryOptions = useMemo(() => {
    const options: { value: string; label: string; isGroup?: boolean }[] = [
      { value: '0', label: 'All Discussions' },
    ];
    for (const group of CATEGORY_GROUPS) {
      // Check if parent exists in DB
      const parentId = categoryMap[group.label.toLowerCase()];
      if (parentId) {
        options.push({ value: String(parentId), label: `${group.icon} ${group.label}`, isGroup: true });
      }
      for (const child of group.children) {
        const childId = categoryMap[child.toLowerCase()];
        if (childId) {
          options.push({ value: String(childId), label: `    › ${child}` });
        }
      }
    }
    return options;
  }, [categoryMap]);

  // ─── Filter discussions by search ─────────────────────────────────────
  const filteredDiscussions = useMemo(() => {
    if (!discussions) return [];
    if (!searchQuery.trim()) return discussions;
    const q = searchQuery.toLowerCase();
    return discussions.filter((d: any) => d.title.toLowerCase().includes(q));
  }, [discussions, searchQuery]);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategoryId === 0) return 'All Discussions';
    const opt = categoryOptions.find(o => o.value === String(selectedCategoryId));
    return opt?.label?.replace(/^\s*›\s*/, '').trim() || 'All Discussions';
  }, [selectedCategoryId, categoryOptions]);

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'U';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-[34px] font-semibold leading-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Member'}
          </h1>
          <p className="text-[15.5px] text-muted-foreground mt-1.5">
            Here's what's happening in the OPA Community
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" /> New Discussion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Start a New Discussion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input placeholder="What's on your mind?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Post Type</Label>
                      <Select value={newPostType} onValueChange={setNewPostType}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discussion">💬 Discussion</SelectItem>
                          <SelectItem value="question">❓ Question</SelectItem>
                          <SelectItem value="insight">💡 Insight</SelectItem>
                          <SelectItem value="announcement">📢 Announcement</SelectItem>
                          <SelectItem value="case_study">📋 Case Study</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select a category" /></SelectTrigger>
                        <SelectContent>
                          {(categories || []).map((cat: any) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Tags</Label>
                    <div className="mt-1">
                      <TagInput value={newTags} onChange={setNewTags} placeholder="Add tags (e.g. O-PAS, migration)" />
                    </div>
                  </div>
                  <div>
                    <Label>YouTube Video URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newYoutubeUrl}
                      onChange={(e) => setNewYoutubeUrl(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Content</Label>
                    <RichTextEditor
                      placeholder="Share your thoughts, questions, or insights..."
                      value={newContent}
                      onChange={(html) => setNewContent(html)}
                      minHeight="120px"
                      className="mt-1"
                    />
                  </div>
                  {attachedMedia.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachedMedia.map((m, i) => (
                        <div key={i} className="relative group">
                          {m.type === 'image' ? (
                            <img src={m.url} alt={m.name} className="h-16 w-16 object-cover rounded-lg border" />
                          ) : (
                            <div className="h-16 w-28 bg-muted rounded-lg border flex items-center justify-center gap-1">
                              <Video className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate max-w-[70px]">{m.name}</span>
                            </div>
                          )}
                          <button
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setAttachedMedia((prev) => prev.filter((_, j) => j !== i))}
                          ><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'image'); e.target.value = ''; }} />
                  <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'video'); e.target.value = ''; }} />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary"
                        disabled={isUploading} onClick={() => photoInputRef.current?.click()}>
                        <Image className="h-4 w-4 mr-1" />
                        <span className="text-xs">{isUploading ? 'Uploading...' : 'Photo'}</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary"
                        disabled={isUploading} onClick={() => videoInputRef.current?.click()}>
                        <Video className="h-4 w-4 mr-1" />
                        <span className="text-xs">{isUploading ? 'Uploading...' : 'Video'}</span>
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateDiscussion} disabled={createDiscussionMutation.isPending || isUploading}>
                        {createDiscussionMutation.isPending ? 'Posting...' : 'Post Discussion'}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <StatStrip
        items={[
          { icon: MessageSquare, value: filteredDiscussions?.length ?? 0, label: 'Discussions', hue: 'blue' },
          { icon: Bell, value: notifications?.length ?? 0, label: 'Unread', hue: 'coral' },
          { icon: BookOpen, value: categories?.length ?? 0, label: 'Topics', hue: 'teal' },
          { icon: Trophy, value: (user as any)?.reputation ?? 0, label: 'Your Reputation', hue: 'violet' },
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Discussion Column */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-card border-border/70"
                />
              </div>
            </div>
            <Select
              value={String(selectedCategoryId)}
              onValueChange={(val) => setSelectedCategoryId(parseInt(val))}
            >
              <SelectTrigger className="w-[280px] h-10 bg-card border-border/70">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="All Discussions" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                <SelectItem value="0">All Discussions</SelectItem>
                {categoryOptions.filter(o => o.value !== '0').map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className={opt.isGroup ? 'font-semibold' : ''}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Discussion List */}
          <div className="space-y-3">
            {loadingDiscussions ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No discussions found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try a different search term.' : 'Be the first to start a conversation.'}
                  </p>
                  {user && !searchQuery && (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Start Discussion
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredDiscussions.map((discussion: any) => (
                <DiscussionCard key={discussion.id} discussion={discussion} onRefresh={refetchDiscussions} />
              ))
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="w-full lg:w-[300px] lg:shrink-0 flex flex-col gap-4">
          {/* Quick Actions */}
          <SectionCard title="Quick Actions">
            <div className="grid gap-0.5">
              {[
                { href: '/members', icon: Users, label: 'Member Directory', hue: 'blue' as const },
                { href: '/training', icon: BookOpen, label: 'Training Center', hue: 'teal' as const },
                { href: '/events', icon: Calendar, label: 'Events', hue: 'violet' as const },
                { href: '/leaderboard', icon: BarChart3, label: 'Leaderboard', hue: 'amber' as const },
              ].map((item) => {
                const colors = CATEGORY_COLORS[item.hue];
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-[14.5px] text-foreground hover:bg-accent transition-colors no-underline"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                    </span>
                    {item.label}
                  </a>
                );
              })}
            </div>
          </SectionCard>

          {/* Top Contributors */}
          <SectionCard title="Top Contributors">
            <div className="flex flex-col gap-2 px-1 py-1">
              {leaderboard?.slice(0, 5).map((member: any, i: number) => {
                const memberInitials = member.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?';
                const solid = CATEGORY_COLORS[CATEGORY_HUES[i % CATEGORY_HUES.length]].solid;
                return (
                  <a
                    key={i}
                    href={`/members/${member.userId}`}
                    className="flex items-center gap-2 hover:bg-accent rounded-md p-1 -mx-1 transition-colors no-underline text-inherit"
                  >
                    <span className="text-[12.5px] font-bold text-muted-foreground w-[18px]">
                      {i + 1}
                    </span>
                    <Avatar className="w-[26px] h-[26px]">
                      <AvatarFallback className="font-heading font-semibold text-[11px] text-white" style={{ background: solid }}>
                        {memberInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14.5px] font-medium truncate">{member.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[11.5px] font-semibold rounded-full">
                      {member.reputation || 0}
                    </Badge>
                  </a>
                );
              })}
              {(!leaderboard || leaderboard.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No contributors yet
                </p>
              )}
              <a href="/leaderboard" className="block text-center text-[13.5px] mt-0.5 no-underline hover:underline">
                View full leaderboard →
              </a>
            </div>
          </SectionCard>

          {/* Notifications */}
          <SectionCard title="Notifications">
            <div className="flex flex-col gap-3 px-1 py-1">
              {notifications?.slice(0, 5).map((n: any) => (
                <div key={n.id} className="flex gap-2 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">{n.title || n.content}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(new Date(n.createdAt))}</p>
                  </div>
                </div>
              ))}
              {(!notifications || notifications.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  You're all caught up
                </p>
              )}
              <a href="/notifications" className="block text-center text-[13.5px] mt-0.5 no-underline hover:underline">
                View all notifications →
              </a>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ─── Discussion Card ────────────────────────────────────────────────────────
function DiscussionCard({ discussion, onRefresh }: { discussion: any; onRefresh?: () => void }) {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(discussion.title);
  const [editContent, setEditContent] = useState(discussion.content);
  const [editYoutubeUrl, setEditYoutubeUrl] = useState(discussion.youtubeUrl || '');

  const tags: string[] = Array.isArray(discussion.tags) ? discussion.tags : (discussion.tags ? JSON.parse(discussion.tags) : []);
  const isAdmin = user?.role === 'admin';
  const isAuthor = user?.id === discussion.authorId;
  const canManage = isAdmin || isAuthor;

  const updateMutation = trpc.forum.updateDiscussion.useMutation({
    onSuccess: () => { toast.success('Discussion updated!'); setEditOpen(false); onRefresh?.(); },
    onError: (err: any) => toast.error(err.message || 'Failed to update'),
  });

  const deleteMutation = trpc.forum.deleteDiscussion.useMutation({
    onSuccess: () => { toast.success('Discussion deleted!'); setDeleteOpen(false); onRefresh?.(); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const pinMutation = trpc.forum.pinDiscussion.useMutation({
    onSuccess: () => { toast.success(discussion.isPinned ? 'Unpinned!' : 'Pinned!'); onRefresh?.(); },
    onError: (err: any) => toast.error(err.message || 'Failed to pin'),
  });

  const hue = hueFor(discussion.categoryName || discussion.categoryId || discussion.id);
  const stripeColor = CATEGORY_COLORS[hue].solid;

  return (
    <>
      <div className="opa-card flex items-stretch rounded-lg border bg-card hover:border-[var(--accent-400)] transition-colors">
        <div className="w-[5px] shrink-0 rounded-l-lg" style={{ background: stripeColor }} />
        {/* Clickable card body - uses div+onClick, NO anchor tag */}
        <div
          className="flex-1 min-w-0 p-4 cursor-pointer"
          onClick={() => { window.location.href = `/community/${discussion.slug}`; }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {discussion.isPinned && <Pin className="w-3 h-3 text-[var(--accent-700)] shrink-0" />}
              {discussion.isLocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
              {discussion.categoryName && (
                <CategoryPill hue={hue}>{discussion.categoryName}</CategoryPill>
              )}
              {discussion.acceptedPostId && (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{ background: CATEGORY_COLORS.teal.bg, color: CATEGORY_COLORS.teal.text }}
                >
                  Solved
                </span>
              )}
              {discussion.youtubeUrl && (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{ background: CATEGORY_COLORS.coral.bg, color: CATEGORY_COLORS.coral.text }}
                >
                  Video
                </span>
              )}
              <h4 className="text-[18px] font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                {discussion.title}
              </h4>
            </div>
            <p className="text-[14.5px] text-muted-foreground line-clamp-2 mb-2 leading-normal">{discussion.content?.replace(/<[^>]*>/g, '').slice(0, 150)}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.slice(0, 4).map((tag: string) => (
                  <span
                    key={tag}
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/tags/${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; }}
                    className="text-xs text-[var(--accent-700)] hover:underline cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 text-[13px] text-muted-foreground flex-wrap">
              {discussion.authorName && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">{discussion.authorName}</span>
                  <VerifiedBadge status={discussion.authorVerificationStatus} />
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {discussion.viewCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {discussion.replyCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {timeAgo(new Date(discussion.createdAt))}
              </span>
            </div>
          </div>
        </div>
        {/* Menu button - completely separate from the clickable area */}
        {canManage && (
          <div
            className="flex items-start p-2 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAdmin && (
                  <DropdownMenuItem onClick={() => pinMutation.mutate({ id: discussion.id, isPinned: !discussion.isPinned })}>
                    <Pin className="w-4 h-4 mr-2" />
                    {discussion.isPinned ? 'Unpin' : 'Pin'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Content</Label>
              <RichTextEditor value={editContent} onChange={setEditContent} minHeight="200px" className="mt-1" />
            </div>
            <div>
              <Label>YouTube Video URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={editYoutubeUrl}
                onChange={(e) => setEditYoutubeUrl(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end shrink-0 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ id: discussion.id, title: editTitle, content: editContent, categoryId: discussion.categoryId, youtubeUrl: editYoutubeUrl.trim() || undefined })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discussion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the discussion and all its replies. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteMutation.mutate({ id: discussion.id });
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
