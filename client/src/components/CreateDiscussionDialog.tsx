import React, { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Image, Video, X } from 'lucide-react';
import { TagInput, TagValue, resolveTagIds } from '@/components/TagInput';
import RichTextEditor from '@/components/RichTextEditor';

interface CreateDiscussionDialogProps {
  onSuccess?: () => void;
}

export function CreateDiscussionDialog({ onSuccess }: CreateDiscussionDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [tags, setTags] = useState<TagValue[]>([]);
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const categoriesQuery = trpc.forum.getCategories.useQuery();
  const groupsQuery = trpc.forum.getGroups.useQuery({ limit: 100, offset: 0 });
  const uploadFileMutation = trpc.upload.file.useMutation();

  const createDiscussion = trpc.forum.createDiscussion.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const findOrCreate = trpc.tags.findOrCreate.useMutation();
  const addTagsBulk = trpc.tags.addToPostBulk.useMutation();

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

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!content.trim()) { toast.error('Content is required'); return; }
    if (!categoryId) { toast.error('Category is required'); return; }

    setIsSubmitting(true);
    try {
      const slug = `${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)}-${Date.now()}`;

      const mediaUrls = attachedMedia.map((m) => m.url);

      const result = await createDiscussion.mutateAsync({
        title,
        slug,
        content,
        categoryId: parseInt(categoryId),
        groupId: groupId ? parseInt(groupId) : undefined,
        postType: postType as any,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      });

      // Attach tags to the new discussion via post_tags
      if (tags.length > 0) {
        const discussionId = (result as any)?.insertId ?? (result as any)?.[0]?.insertId;
        if (discussionId) {
          const tagIds = await resolveTagIds(tags, (vars) => findOrCreate.mutateAsync(vars));
          if (tagIds.length > 0) {
            await addTagsBulk.mutateAsync({ tagIds, targetType: 'discussion', targetId: discussionId });
          }
        }
      }

      toast.success('Discussion created');
      setTitle('');
      setContent('');
      setCategoryId('');
      setGroupId('');
      setPostType('discussion');
      setTags([]);
      setAttachedMedia([]);
      setOpen(false);
      onSuccess?.();
    } catch {
      // errors already surfaced by individual mutations
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Start New Discussion
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Discussion</DialogTitle>
          <DialogDescription>
            Start a conversation with the OPA community
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Best practices for DCN design"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="post-type" className="text-sm">Post Type</Label>
              <Select value={postType} onValueChange={setPostType}>
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
              <Label htmlFor="category" className="text-sm">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesQuery.data?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="group" className="text-sm">Group (Optional)</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group or leave blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No group</SelectItem>
                {groupsQuery.data?.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags (e.g. O-PAS, DCN, migration)…"
              maxTags={8}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="content" className="text-sm">Content</Label>
            <RichTextEditor
              placeholder="Share your thoughts, question, or experience..."
              value={content}
              onChange={(html) => setContent(html)}
              minHeight="120px"
              className="mt-1"
            />
          </div>
          {/* Attached media preview */}
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
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Upload buttons */}
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { Array.from(e.target.files || []).forEach(f => handleMediaUpload(f, 'image')); e.target.value = ''; }} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'video'); e.target.value = ''; }} />
          <div className="flex gap-2">
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
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
