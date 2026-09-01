import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, X, Edit2, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SectionHeroBannerProps {
  sectionKey: string;
  fallbackGradient?: string; // CSS gradient for when no hero image is set
}

export default function SectionHeroBanner({ sectionKey, fallbackGradient }: SectionHeroBannerProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [editOpen, setEditOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const heroQuery = trpc.sectionHeroes.get.useQuery({ sectionKey });
  const hero = heroQuery.data;

  const upsertMutation = trpc.sectionHeroes.upsert.useMutation({
    onSuccess: () => {
      toast.success('Hero image updated!');
      setEditOpen(false);
      heroQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.sectionHeroes.remove.useMutation({
    onSuccess: () => {
      toast.success('Hero image removed');
      heroQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadFile = trpc.upload.file.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await uploadFile.mutateAsync({
          fileName: file.name,
          mimeType: file.type,
          base64Data: base64,
        });
        setImageUrl(result.url);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Upload failed');
      setIsUploading(false);
    }
  };

  const openEditDialog = () => {
    setImageUrl(hero?.heroImageUrl || '');
    setTitle(hero?.title || '');
    setSubtitle(hero?.subtitle || '');
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!imageUrl.trim()) {
      toast.error('Please upload or paste an image URL');
      return;
    }
    upsertMutation.mutate({
      sectionKey,
      heroImageUrl: imageUrl,
      title: title || undefined,
      subtitle: subtitle || undefined,
    });
  };

  const handleRemove = () => {
    if (confirm('Remove the hero image for this section?')) {
      removeMutation.mutate({ sectionKey });
    }
  };

  // No hero image and not admin — render nothing
  if (!hero && !isAdmin) return null;

  // No hero image but admin — show add button
  if (!hero && isAdmin) {
    return (
      <>
        <div className="relative mb-6">
          <button
            onClick={openEditDialog}
            className="w-full h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <Camera className="h-5 w-5" />
            <span className="text-sm font-medium">Add Hero Image</span>
          </button>
        </div>
        {renderEditDialog()}
      </>
    );
  }

  // Hero image exists
  return (
    <>
      <div className="relative mb-6 rounded-xl overflow-hidden group">
        <div className="w-full h-48 sm:h-56 md:h-64 relative">
          <img
            src={hero!.heroImageUrl}
            alt={hero!.title || `${sectionKey} hero`}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {/* Title/Subtitle overlay */}
          {(hero!.title || hero!.subtitle) && (
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              {hero!.title && (
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                  {hero!.title}
                </h2>
              )}
              {hero!.subtitle && (
                <p className="text-sm sm:text-base text-white/90 mt-1 drop-shadow-md max-w-2xl">
                  {hero!.subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        {/* Admin controls overlay */}
        {isAdmin && (
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1 bg-white/90 hover:bg-white text-gray-800 shadow-md"
              onClick={openEditDialog}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1 bg-white/90 hover:bg-red-50 text-red-600 shadow-md"
              onClick={handleRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      {renderEditDialog()}
    </>
  );

  function renderEditDialog() {
    return (
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Section Hero Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Image preview / upload */}
            <div>
              <Label>Image</Label>
              {imageUrl ? (
                <div className="relative mt-1 rounded-lg overflow-hidden">
                  <img src={imageUrl} alt="Hero preview" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 w-full h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Camera className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload image</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="mt-2">
                <Input
                  placeholder="Or paste image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            {/* Title */}
            <div>
              <Label>Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Community Forum"
                className="mt-1"
              />
            </div>
            {/* Subtitle */}
            <div>
              <Label>Subtitle (optional)</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Connect, learn, and share with the OPA community"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending || !imageUrl.trim()}>
              {upsertMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
