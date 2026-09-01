import { Link, useLocation } from 'wouter';
import { useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { CLUB_NAME } from '@/lib/clubConfig';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  MessageSquare, Users, Plus, Search, Eye, Reply,
  Pin, Lock, Clock, Activity, ChevronRight, Flame, Award,
  Image, Video, X, Hash, Edit, Trash2, MoreVertical,
} from 'lucide-react';
import { TagInput, TagValue, resolveTagIds } from '@/components/TagInput';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import SectionHeroBanner from '@/components/SectionHeroBanner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

export default function CommunityForum() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newPostType, setNewPostType] = useState<string>('discussion');
  const [newTags, setNewTags] = useState<TagValue[]>([]);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const findOrCreateTag = trpc.tags.findOrCreate.useMutation();
  const addTagsToPost = trpc.tags.addToPostBulk.useMutation();
  const tagsListQuery = trpc.tags.list.useQuery();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const categoriesQuery = trpc.forum.getCategories.useQuery();
  const discussionsQuery = trpc.forum.getDiscussionsByCategory.useQuery({
    categoryId: selectedCategoryId || 0,
    limit: 30,
  });
  const groupsQuery = trpc.forum.getGroups.useQuery({ limit: 20 });
  const activityQuery = trpc.forum.getRecentActivity.useQuery({ limit: 10 });
  const trendingMembersQuery = trpc.directory.getTrendingMembers.useQuery({ limit: 5 });

  const uploadFileMutation = trpc.upload.file.useMutation();

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
      discussionsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create discussion'),
  });

  const handleCreateDiscussion = () => {
    if (!newTitle.trim() || !newContent.trim() || !newCategoryId) {
      toast.error('Please fill in all fields');
      return;
    }
    const slug = `${newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}-${Date.now()}`;
    const mediaUrls = attachedMedia.map((m) => m.url);
    createDiscussionMutation.mutate({
      title: newTitle,
      slug,
      content: newContent,
      categoryId: parseInt(newCategoryId),
      postType: newPostType as any,
      tags: newTags.map((t) => (typeof t === 'string' ? t : t.name || '')).filter(Boolean),
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });
  };

  const categories = categoriesQuery.data || [];
  const discussions = discussionsQuery.data || [];
  const groups = groupsQuery.data || [];
  const activity = activityQuery.data || [];
  const trendingMembers = trendingMembersQuery.data || [];

  const filteredDiscussions = discussions.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !activeTagFilter || (Array.isArray(d.tags) ? d.tags : (d.tags ? JSON.parse(d.tags) : [])).includes(activeTagFilter);
    return matchesSearch && matchesTag;
  });

  const popularTags = tagsListQuery.data?.slice(0, 8) || [];
  const rootCategories = categories.filter((c: any) => !c.parentId || c.parentId === 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Hero Banner */}
        <SectionHeroBanner sectionKey="community" />
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{CLUB_NAME} Forum</h1>
            <p className="text-muted-foreground mt-1">Connect, learn, and share with the O-PAS community</p>
          </div>
          {user && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  New Discussion
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
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
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
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
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



        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {rootCategories.map((cat: any) => {
                  const children = categories.filter((c: any) => c.parentId === cat.id);
                  return (
                    <div key={cat.id}>
                      <button
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${
                          selectedCategoryId === cat.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="shrink-0">{cat.icon || '📁'}</span>
                        <span className="truncate flex-1 text-left">{cat.name}</span>
                      </button>
                      {children.length > 0 &&
                        children.map((child: any) => (
                          <button
                            key={child.id}
                            onClick={() => setSelectedCategoryId(child.id)}
                            className={`w-full flex items-center gap-2 pl-5 pr-4 py-2 text-sm hover:bg-muted/50 transition-colors ${
                              selectedCategoryId === child.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span className="shrink-0 text-xs opacity-60">›</span>
                            <span className="truncate">{child.name}</span>
                          </button>
                        ))
                      }
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top Contributors */}
            {trendingMembers.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-3.5 h-3.5" />
                    Top Contributors
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-2">
                  {trendingMembers.map((member, i) => (
                    <Link key={member.id} href={`/members/${member.id}`}>
                      <div className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
                        <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{member.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{member.name || 'Member'}</p>
                          <p className="text-xs text-muted-foreground">{member.reputationScore} pts</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <div className="px-4 pt-2">
                    <Link href="/leaderboard">
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        View Leaderboard →
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Main Content Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tag Filter Chips */}
            {popularTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <button
                  onClick={() => setActiveTagFilter(null)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    !activeTagFilter
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
                  }`}
                >
                  All
                </button>
                {popularTags.map((tag: any) => (
                  <button
                    key={tag.slug}
                    onClick={() => setActiveTagFilter(activeTagFilter === tag.name ? null : tag.name)}
                    className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                      activeTagFilter === tag.name
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    {tag.name}
                    {tag.usageCount > 0 && <span className="ml-1 opacity-60">{tag.usageCount}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="discussions">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="discussions" className="gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Discussions
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Groups
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* Discussions Tab */}
              <TabsContent value="discussions" className="space-y-3 mt-4">
                {discussionsQuery.isLoading ? (
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
                  <Card className="p-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No discussions yet</h3>
                    <p className="text-muted-foreground mb-4">Be the first to start a conversation in this category.</p>
                    {user && (
                      <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Start Discussion
                      </Button>
                    )}
                  </Card>
                ) : (
                  filteredDiscussions.map((discussion) => (
                    <DiscussionCard key={discussion.id} discussion={discussion} onRefresh={() => discussionsQuery.refetch()} setLocation={setLocation} />
                  ))
                )}
              </TabsContent>

              {/* Groups Tab */}
              <TabsContent value="groups" className="mt-4">
                <GroupsGrid groups={groups} user={user} onJoin={() => {}} />
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-4">
                <RecentActivity activity={activity} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

const POST_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  question: { label: '❓ Question', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
  discussion: { label: '💬 Discussion', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  insight: { label: '💡 Insight', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  announcement: { label: '📢 Announcement', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
  case_study: { label: '📋 Case Study', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
};

function DiscussionCard({ discussion, onRefresh, setLocation }: { discussion: any; onRefresh?: () => void; setLocation: (path: string) => void }) {
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(discussion.title);
  const [editContent, setEditContent] = useState(discussion.content);

  const typeConfig = POST_TYPE_CONFIG[discussion.postType || 'discussion'];
  const tags: string[] = Array.isArray(discussion.tags) ? discussion.tags : (discussion.tags ? JSON.parse(discussion.tags) : []);
  const isAdmin = user?.role === 'admin';
  const isAuthor = user?.id === discussion.authorId;
  const canManage = isAdmin || isAuthor;

  const updateMutation = trpc.forum.updateDiscussion.useMutation({
    onSuccess: () => {
      toast.success('Discussion updated!');
      setEditOpen(false);
      onRefresh?.();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update'),
  });

  const deleteMutation = trpc.forum.deleteDiscussion.useMutation({
    onSuccess: () => {
      toast.success('Discussion deleted!');
      setDeleteOpen(false);
      onRefresh?.();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const pinMutation = trpc.forum.pinDiscussion.useMutation({
    onSuccess: () => {
      toast.success(discussion.isPinned ? 'Unpinned!' : 'Pinned!');
      onRefresh?.();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to pin'),
  });

  const handleUpdate = () => {
    if (!editTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    updateMutation.mutate({ id: discussion.id, title: editTitle, content: editContent, categoryId: discussion.categoryId });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: discussion.id });
  };

  const handlePin = () => {
    pinMutation.mutate({ id: discussion.id, isPinned: !discussion.isPinned });
  };

  return (
    <>
      <a href={`/community/${discussion.slug}`} className="block no-underline text-inherit" style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card
        className="p-4 hover:border-primary/40 transition-all cursor-pointer group"
      >
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {discussion.isPinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
              {discussion.isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              {typeConfig && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
              )}
              {discussion.acceptedPostId && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                  ✓ Solved
                </span>
              )}
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {discussion.title}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{discussion.content?.replace(/<[^>]*>/g, '')}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.location.href = `/tags/${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; }}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {discussion.authorName && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{discussion.authorName}</span>
                  <VerifiedBadge status={discussion.authorVerificationStatus} />
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(new Date(discussion.createdAt))}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handlePin()}>
                      <Pin className="w-4 h-4 mr-2" />
                      {discussion.isPinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </Card>
      </a>

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
          </div>
          <div className="flex gap-2 justify-end shrink-0 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GroupsGrid({ groups, user, onJoin }: { groups: any[]; user: any; onJoin: (id: number) => void }) {
  if (groups.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No groups yet</h3>
        <p className="text-muted-foreground">Groups will appear here once created.</p>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map((group) => (
        <Card key={group.id} className="p-4 hover:border-primary/40 transition-all cursor-pointer">
          <h3 className="font-semibold text-foreground mb-1">{group.name}</h3>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{group.description || 'No description'}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{group.memberCount || 0} members</span>
            {user && (
              <Button size="sm" onClick={() => onJoin(group.id)}>
                Join
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function RecentActivity({ activity }: { activity: any[] }) {
  if (activity.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No recent activity</h3>
        <p className="text-muted-foreground">Activity will appear here as members engage.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {activity.map((item, i) => (
        <Card key={i} className="p-3">
          <p className="text-sm text-foreground">{item.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
        </Card>
      ))}
    </div>
  );
}

const joinGroupMutation = { mutate: () => {} };
