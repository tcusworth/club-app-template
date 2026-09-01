import { useAuth } from "@/_core/hooks/useAuth";
import SectionHeroBanner from '@/components/SectionHeroBanner';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { BookOpen, Plus, Search, FileText, Image, BarChart3, MessageSquare, BookMarked, ArrowRight, Network, X, Tag, FolderOpen, Hash, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { TagInput, TagValue, resolveTagIds } from "@/components/TagInput";

const typeIcons: Record<string, any> = {
  article: FileText,
  diagram: Image,
  case_study: BarChart3,
  post: MessageSquare,
  guide: BookMarked,
};

const typeColors: Record<string, string> = {
  article: "bg-blue-500/10 text-blue-400",
  diagram: "bg-purple-500/10 text-purple-400",
  case_study: "bg-amber-500/10 text-amber-400",
  post: "bg-green-500/10 text-green-400",
  guide: "bg-cyan-500/10 text-cyan-400",
};

export default function Knowledge() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<string>("article");
  const [newBody, setNewBody] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newTags, setNewTags] = useState<TagValue[]>([]);
  const [linkedCaps, setLinkedCaps] = useState<number[]>([]);
  const [newCategoryId, setNewCategoryId] = useState<number | undefined>();
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | undefined>();

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: allGlobalTags } = trpc.tags.list.useQuery();
  const popularTags = (allGlobalTags || []).slice(0, 12);
  const { data: content, refetch } = trpc.content.list.useQuery(
    typeFilter !== "all" ? { type: typeFilter as any, status: "published" } : { status: "published" }
  );
  const { data: contentByCategory } = trpc.categories.getContentByCategory.useQuery(
    selectedCategory ? { categoryId: selectedCategory } : { categoryId: 0 },
    { enabled: !!selectedCategory }
  );
  const { data: capabilities } = trpc.capabilities.list.useQuery();

  const findOrCreate = trpc.tags.findOrCreate.useMutation();
  const addTagsBulk = trpc.tags.addToPostBulk.useMutation();

  const createContent = trpc.content.create.useMutation({
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const updateContent = trpc.content.update.useMutation({
    onSuccess: () => {
      toast.success("Content updated");
      setEditDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const deleteContent = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success("Content deleted");
      refetch();
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  const handleEditOpen = (item: any) => {
    setEditId(item.id);
    setEditTitle(item.title);
    setEditBody(item.body || "");
    setEditSummary(item.summary || "");
    setEditCategoryId(item.categoryId || undefined);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editId || !editTitle.trim()) return;
    await updateContent.mutateAsync({
      id: editId,
      title: editTitle,
      body: editBody,
      summary: editSummary,
      categoryId: editCategoryId,
    });
  };

  const submitForReview = trpc.content.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("Content submitted for review");
      refetch();
    },
  });

  const displayContent = selectedCategory ? contentByCategory : content;
  const filtered = useMemo(() => {
    if (!displayContent) return [];
    return displayContent.filter((item) => {
      const matchesSearch = !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.summary?.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !activeTagFilter || (
        Array.isArray(item.tags) &&
        item.tags.some((t: string) => t.toLowerCase() === activeTagFilter.toLowerCase())
      );
      return matchesSearch && matchesTag;
    });
  }, [displayContent, search, activeTagFilter]);

  const handleCreateContent = async () => {
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error("Title and body are required");
      return;
    }
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    try {
      const data = await createContent.mutateAsync({
        title: newTitle,
        slug,
        type: newType as any,
        body: newBody,
        summary: newSummary,
        tags: newTags.map(t => t.name),
        linkedCapabilities: linkedCaps,
        categoryId: newCategoryId,
      });

      // Attach global tags to the new content node via post_tags
      if (newTags.length > 0 && data?.id) {
        const tagIds = await resolveTagIds(newTags, (vars) => findOrCreate.mutateAsync(vars));
        if (tagIds.length > 0) {
          await addTagsBulk.mutateAsync({ tagIds, targetType: 'content_node', targetId: data.id });
        }
      }

      if (user?.role === "admin") {
        toast.success("Content published");
      } else if (data?.id) {
        submitForReview.mutate({ id: data.id });
      }
      setNewTitle("");
      setNewBody("");
      setNewSummary("");
      setNewTags([]);
      setLinkedCaps([]);
      setNewCategoryId(undefined);
      setDialogOpen(false);
      refetch();
    } catch {
      // errors already surfaced by individual mutations
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="container max-w-6xl mx-auto px-4 pt-6">
        <SectionHeroBanner sectionKey="knowledge" />
      </div>
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
            </div>
            {user && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    New Content
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Create Knowledge Content</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                    <div>
                      <Label>Title</Label>
                      <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Content title" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select value={newType} onValueChange={setNewType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="article">Article</SelectItem>
                            <SelectItem value="guide">Guide</SelectItem>
                            <SelectItem value="diagram">Diagram</SelectItem>
                            <SelectItem value="case_study">Case Study</SelectItem>
                            <SelectItem value="post">Post</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select value={newCategoryId?.toString()} onValueChange={(v) => setNewCategoryId(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Standalone top-level categories */}
                            {categories?.filter(cat => !cat.parentId && !categories.some(c => c.parentId === cat.id)).map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                            {/* Children grouped under parent labels */}
                            {categories?.filter(cat => !cat.parentId && categories.some(c => c.parentId === cat.id)).flatMap((parent) => [
                              <div key={`label-${parent.id}`} className="px-2 py-1 text-xs font-bold uppercase text-muted-foreground bg-muted/50 pointer-events-none">
                                {parent.name}
                              </div>,
                              ...categories.filter(child => child.parentId === parent.id).map((child) => (
                                <SelectItem key={child.id} value={child.id.toString()} className="pl-6">
                                  {child.icon} {child.name}
                                </SelectItem>
                              ))
                            ])}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Summary</Label>
                      <Input value={newSummary} onChange={(e) => setNewSummary(e.target.value)} placeholder="Brief summary" />
                    </div>
                    <div>
                      <Label>Body</Label>
                      <RichTextEditor value={newBody} onChange={setNewBody} placeholder="Write your content..." minHeight="200px" />
                    </div>
                    <div>
                      <Label>Tags</Label>
                      <TagInput
                        value={newTags}
                        onChange={setNewTags}
                        placeholder="Add tags (e.g. O-PAS, architecture, DCN)…"
                        maxTags={10}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Link Capabilities</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {capabilities?.map((cap) => (
                          <div key={cap.id} className="flex items-center gap-2">
                            <Checkbox checked={linkedCaps.includes(cap.id)} onCheckedChange={(checked) => {
                              if (checked) setLinkedCaps([...linkedCaps, cap.id]);
                              else setLinkedCaps(linkedCaps.filter((id) => id !== cap.id));
                            }} />
                            <span className="text-sm">{cap.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateContent} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" disabled={createContent.isPending}>
                      {createContent.isPending ? "Creating..." : "Create Content"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search content..." className="pl-10" />
              </div>
              {/* Tag Filter Chips */}
              {popularTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center mt-2">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => setActiveTagFilter(null)}
                    className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                      !activeTagFilter
                        ? 'bg-cyan-600 text-white border-cyan-600'
                        : 'bg-muted text-muted-foreground border-border hover:border-cyan-500/40'
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
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-muted text-muted-foreground border-border hover:border-cyan-500/40'
                      }`}
                    >
                      {tag.name}
                      {tag.usageCount > 0 && <span className="ml-1 opacity-60">{tag.usageCount}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="guide">Guides</SelectItem>
                <SelectItem value="diagram">Diagrams</SelectItem>
                <SelectItem value="case_study">Case Studies</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar: Categories */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-cyan-400" />
                Categories
              </h3>
              <ScrollArea className="h-[600px]">
                <div className="space-y-1 pr-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "ghost"}
                    className="w-full justify-start text-left text-sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All Content
                  </Button>
                  {/* Top-level standalone categories (no parent, no children) */}
                  {categories?.filter(cat => !cat.parentId && !categories.some(c => c.parentId === cat.id)).map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "ghost"}
                      className="w-full justify-start text-left text-sm"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.icon && <span className="mr-2 text-base">{cat.icon}</span>}
                      {cat.name}
                    </Button>
                  ))}
                  {/* Parent categories with their children */}
                  {categories?.filter(cat => !cat.parentId && categories.some(c => c.parentId === cat.id)).map((parent) => (
                    <div key={parent.id}>
                      <div className="px-2 pt-4 pb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {parent.name}
                        </span>
                      </div>
                      {categories.filter(child => child.parentId === parent.id).map((child) => (
                        <Button
                          key={child.id}
                          variant={selectedCategory === child.id ? "default" : "ghost"}
                          className="w-full justify-start text-left text-sm pl-3"
                          onClick={() => setSelectedCategory(child.id)}
                        >
                          {child.icon && <span className="mr-2 text-base">{child.icon}</span>}
                          {child.name}
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Main: Content Grid */}
          <div className="lg:col-span-3">
            {filtered && filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((item) => {
                  const Icon = typeIcons[item.type] || FileText;
                  return (
                    <Card
                      key={item.id}
                      className="bg-card border-border hover:border-cyan-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                      onClick={() => setLocation(`/content/${item.id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <Icon className={`w-5 h-5 ${typeColors[item.type]}`} />
                          <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                        </div>
                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.summary}</p>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-3" onClick={(e) => e.stopPropagation()}>
                            {item.tags.slice(0, 2).map((tag: string) => (
                              <Link
                                key={tag}
                                href={`/tags/${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                              >
                                #{tag}
                              </Link>
                            ))}
                            {item.tags.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border">
                                +{item.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <span>Read more</span>
                            <ArrowRight className="w-3 h-3 ml-2" />
                          </div>
                          {user?.role === 'admin' && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditOpen(item)} title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{item.title}"?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this content and all its attachments. This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteContent.mutate({ id: item.id })}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No content found in this category</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Content Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Content title" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editCategoryId?.toString()} onValueChange={(v) => setEditCategoryId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.filter(cat => !cat.parentId && !categories.some(c => c.parentId === cat.id)).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                  {categories?.filter(cat => !cat.parentId && categories.some(c => c.parentId === cat.id)).flatMap((parent) => [
                    <div key={`label-${parent.id}`} className="px-2 py-1 text-xs font-bold uppercase text-muted-foreground bg-muted/50 pointer-events-none">
                      {parent.name}
                    </div>,
                    ...categories.filter(child => child.parentId === parent.id).map((child) => (
                      <SelectItem key={child.id} value={child.id.toString()} className="pl-6">
                        {child.icon} {child.name}
                      </SelectItem>
                    ))
                  ])}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Summary</Label>
              <Input value={editSummary} onChange={(e) => setEditSummary(e.target.value)} placeholder="Brief summary" />
            </div>
            <div>
              <Label>Body</Label>
              <RichTextEditor key={editId} value={editBody} onChange={setEditBody} placeholder="Write your content..." minHeight="250px" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0 pt-4">
            <Button onClick={handleEditSave} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white" disabled={updateContent.isPending}>
              {updateContent.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
