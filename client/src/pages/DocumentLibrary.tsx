import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Folder, FolderOpen, FileText, Upload, Plus, Trash2, ArrowLeft, Download, File,
} from "lucide-react";

function formatSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentLibrary() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  // Club-wide library only for now — no group scoping in this UI yet.
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<{ id: number; name: string }[]>([]);

  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const foldersQuery = trpc.documents.listFolders.useQuery({ parentFolderId: currentFolderId });
  const documentsQuery = trpc.documents.list.useQuery({ folderId: currentFolderId });

  const createFolder = trpc.documents.createFolder.useMutation({
    onSuccess: () => {
      toast.success("Folder created");
      utils.documents.listFolders.invalidate();
      setNewFolderDialogOpen(false);
      setNewFolderName("");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadDocument = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded");
      utils.documents.list.invalidate();
      closeUploadDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteDocument = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      utils.documents.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const closeUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadTitle("");
    setUploadDescription("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = () => {
    if (!pendingFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDocument.mutate({
        title: uploadTitle || pendingFile.name,
        description: uploadDescription || undefined,
        folderId: currentFolderId,
        fileName: pendingFile.name,
        mimeType: pendingFile.type || "application/octet-stream",
        base64Data: base64,
      });
    };
    reader.readAsDataURL(pendingFile);
  };

  const openFolder = (folder: { id: number; name: string }) => {
    setFolderPath(prev => [...prev, folder]);
    setCurrentFolderId(folder.id);
  };

  const goToBreadcrumb = (index: number) => {
    if (index === -1) {
      setFolderPath([]);
      setCurrentFolderId(undefined);
    } else {
      setFolderPath(prev => prev.slice(0, index + 1));
      setCurrentFolderId(folderPath[index].id);
    }
  };

  const folders = foldersQuery.data ?? [];
  const documents = documentsQuery.data ?? [];
  const isLoading = foldersQuery.isLoading || documentsQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5" /> Document Library
            </h1>
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 mt-1.5 text-sm text-muted-foreground flex-wrap">
              <button onClick={() => goToBreadcrumb(-1)} className="hover:text-foreground transition-colors">
                Library
              </button>
              {folderPath.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <span>/</span>
                  <button onClick={() => goToBreadcrumb(i)} className="hover:text-foreground transition-colors">
                    {f.name}
                  </button>
                </span>
              ))}
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNewFolderDialogOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> New Folder
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-3.5 h-3.5" /> Upload
              </Button>
            </div>
          )}
        </div>

        {folderPath.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => goToBreadcrumb(folderPath.length - 2)}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : folders.length === 0 && documents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">This folder is empty.</p>
            {!isAdmin && <p className="text-xs mt-1">Only admins can add documents here.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((f: any) => (
              <Card key={f.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openFolder(f)}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <Folder className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{f.name}</span>
                </CardContent>
              </Card>
            ))}
            {documents.map((doc: any) => (
              <Card key={doc.id}>
                <CardContent className="p-3.5 flex items-center gap-3">
                  <File className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{doc.mimeType}</Badge>
                      {doc.sizeBytes && <span className="text-xs text-muted-foreground">{formatSize(doc.sizeBytes)}</span>}
                    </div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /></Button>
                  </a>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (confirm(`Delete "${doc.title}"?`)) deleteDocument.mutate({ documentId: doc.id }); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label>Folder name</Label>
            <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. Meeting Notes" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!newFolderName.trim() || createFolder.isPending}
              onClick={() => createFolder.mutate({ name: newFolderName.trim(), parentFolderId: currentFolderId })}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => { if (!open) closeUploadDialog(); else setUploadDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>File</Label>
              <Input ref={fileInputRef} type="file" onChange={handleFileSelected} />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Document title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeUploadDialog}>Cancel</Button>
            <Button disabled={!pendingFile || uploadDocument.isPending} onClick={handleUpload}>
              {uploadDocument.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
