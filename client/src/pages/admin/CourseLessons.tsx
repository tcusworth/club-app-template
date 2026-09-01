import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Shield,
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Upload,
  Check,
  Loader2,
  ClipboardList,
  ExternalLink,
  FileSpreadsheet,
  AlertTriangle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

type LessonRow = {
  id: number;
  courseId: number;
  title: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  isPublished: boolean;
  streamVideoId: string | null;
  videoDurationSeconds: number | null;
  thumbnailUrl: string | null;
  supplementMarkdown: string | null;
};

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

export default function CourseLessons() {
  const params = useParams<{ courseSlug: string }>();
  const courseSlug = params.courseSlug;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const courseQuery = trpc.courses.getBySlug.useQuery({ slug: courseSlug }, { enabled: !!user && user.role === "admin" });
  const course = courseQuery.data;
  const lessonsQuery = trpc.lessonsAdmin.list.useQuery(
    { courseId: course?.id ?? 0 },
    { enabled: !!course?.id },
  );
  const lessons = (lessonsQuery.data ?? []) as LessonRow[];
  const quizMapQuery = trpc.quiz.lessonQuizMap.useQuery(
    { courseId: course?.id ?? 0 },
    { enabled: !!course?.id },
  );
  const quizByLesson = new Map((quizMapQuery.data ?? []).map(q => [q.lessonId, q]));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LessonRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LessonRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const createMutation = trpc.lessonsAdmin.create.useMutation();
  const updateMutation = trpc.lessonsAdmin.update.useMutation();
  const deleteMutation = trpc.lessonsAdmin.delete.useMutation();
  const reorderMutation = trpc.lessonsAdmin.reorder.useMutation();

  if (!user) {
    return null;
  }
  if (user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (courseQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <p className="text-muted-foreground mb-4">No course with slug "{courseSlug}".</p>
          <Button variant="outline" onClick={() => setLocation("/training")}>Back to Training</Button>
        </div>
      </DashboardLayout>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (lesson: LessonRow) => {
    setEditing(lesson);
    setDialogOpen(true);
  };

  const moveLesson = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= lessons.length) return;
    const newOrder = [...lessons];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    try {
      await reorderMutation.mutateAsync({ courseId: course.id, lessonIds: newOrder.map(l => l.id) });
      utils.lessonsAdmin.list.invalidate({ courseId: course.id });
    } catch (e: any) {
      toast.error(e.message ?? "Reorder failed");
    }
  };

const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync({ lessonId: confirmDelete.id });
      toast.success("Lesson deleted");
      utils.lessonsAdmin.list.invalidate({ courseId: course.id });
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              <Link href="/admin" className="hover:text-foreground">Admin</Link>
              {" / "}
              <span>Lessons</span>
            </div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-sm text-muted-foreground">/{course.slug}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Import quiz CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Add lesson
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {lessonsQuery.isLoading ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                Loading lessons…
              </div>
            ) : lessons.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-3">No lessons yet.</p>
                <Button variant="outline" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-2" /> Add the first one
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {lessons.map((lesson, i) => (
                  <li key={lesson.id} className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === 0 || reorderMutation.isPending}
                        onClick={() => moveLesson(i, -1)}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === lessons.length - 1 || reorderMutation.isPending}
                        onClick={() => moveLesson(i, 1)}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{lesson.title}</span>
                        <Badge variant="outline" className="text-xs">#{lesson.displayOrder}</Badge>
                        {lesson.streamVideoId ? (
                          <Badge variant="secondary" className="text-xs">
                            {lesson.videoDurationSeconds
                              ? `${Math.round(lesson.videoDurationSeconds / 60)} min`
                              : "video"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">no video</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">/{lesson.slug}</div>
                    </div>
                    <Link
                      href={`/admin/courses/${course.slug}/lessons/${lesson.slug}/quiz`}
                      className="inline-flex items-center gap-1.5 text-xs px-2 py-1.5 border rounded-md hover:bg-muted whitespace-nowrap"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Quiz {quizByLesson.get(lesson.id) ? `(${quizByLesson.get(lesson.id)!.questionCount})` : ""}
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(lesson)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(lesson)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <LessonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        courseId={course.id}
        courseSlug={course.slug}
        editing={editing}
        onEditingChange={setEditing}
      />

      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        courseId={course.id}
        availableLessonSlugs={lessons.map(l => l.slug)}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes "{confirmDelete?.title}" along with all user progress on it.
              {confirmDelete?.streamVideoId && " The video on Cloudflare Stream will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// ─── Add/Edit Dialog ────────────────────────────────────────────────────────

function LessonDialog({
  open,
  onOpenChange,
  courseId,
  courseSlug,
  editing,
  onEditingChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  courseSlug: string;
  editing: LessonRow | null;
  onEditingChange: (l: LessonRow | null) => void;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editing;
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [supplementMarkdown, setSupplementMarkdown] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);

  const createMutation = trpc.lessonsAdmin.create.useMutation();
  const updateMutation = trpc.lessonsAdmin.update.useMutation();
  const requestUpload = trpc.lessonsAdmin.requestVideoUpload.useMutation();
  const confirmReady = trpc.lessonsAdmin.confirmVideoReady.useMutation();

  // Reset form when dialog opens or editing target changes
  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setSlug(editing?.slug ?? "");
      setSlugTouched(!!editing);
      setDescription(editing?.description ?? "");
      setSupplementMarkdown(editing?.supplementMarkdown ?? "");
      setPollAttempts(0);
    }
  }, [open, editing]);

  const computedSlug = useMemo(() => (slugTouched ? slug : slugify(title)), [slug, slugTouched, title]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const finalSlug = computedSlug;
    setBusy(true);
    try {
      if (isEdit && editing) {
        await updateMutation.mutateAsync({
          lessonId: editing.id,
          title,
          slug: finalSlug,
          description: description || undefined,
          supplementMarkdown: supplementMarkdown || undefined,
        });
        toast.success("Lesson updated");
      } else {
        const result = await createMutation.mutateAsync({
          courseId,
          title,
          slug: finalSlug,
          description: description || undefined,
        });
        // Re-fetch fresh row, then transition into edit mode so video upload becomes available
        const fresh = await utils.lessonsAdmin.list.fetch({ courseId });
        const created = (fresh as LessonRow[]).find(l => l.id === result.id) ?? null;
        if (created) onEditingChange(created);
        toast.success("Lesson created — you can now upload a video");
      }
      utils.lessonsAdmin.list.invalidate({ courseId });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      // Cap at file duration approximation: 1.5x video length is overkill but safe.
      // Cloudflare uses maxDurationSeconds to size the upload; pad to 4 hours for safety.
      const { uploadURL } = await requestUpload.mutateAsync({
        lessonId: editing.id,
        maxDurationSeconds: 14400,
      });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(uploadURL, { method: "POST", body: formData });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${text}`);
      }
      toast.success("Upload complete — Cloudflare is processing the video");
      // Begin polling for ready state
      setPollAttempts(1);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Poll for readiness while polling is active
  useEffect(() => {
    if (!editing || pollAttempts === 0 || pollAttempts > 60) return;
    const id = setTimeout(async () => {
      try {
        const result = await confirmReady.mutateAsync({ lessonId: editing.id });
        if (result.ready) {
          toast.success("Video is ready");
          utils.lessonsAdmin.list.invalidate({ courseId });
          // Refresh local "editing" with the new metadata
          const fresh = await utils.lessonsAdmin.list.fetch({ courseId });
          const updated = (fresh as LessonRow[]).find(l => l.id === editing.id) ?? null;
          if (updated) onEditingChange(updated);
          setPollAttempts(0);
        } else {
          setPollAttempts(n => n + 1);
        }
      } catch (e: any) {
        toast.error(e.message ?? "Failed to check video status");
        setPollAttempts(0);
      }
    }, 5000);
    return () => clearTimeout(id);
  }, [editing, pollAttempts, confirmReady, courseId, onEditingChange, utils]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVideoUpload(file);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lesson" : "Add lesson"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Introduction to O-PAS"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lesson-slug">Slug</Label>
            <Input
              id="lesson-slug"
              value={computedSlug}
              onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="introduction-to-opas"
            />
            <p className="text-xs text-muted-foreground">
              URL: /training/{courseSlug}/lessons/{computedSlug || "<slug>"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lesson-description">Description (optional)</Label>
            <Textarea
              id="lesson-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Video</Label>
            {!isEdit ? (
              <p className="text-sm text-muted-foreground">Save the lesson first, then upload a video.</p>
            ) : editing.streamVideoId && editing.videoDurationSeconds ? (
              <div className="flex items-center gap-3 p-3 border rounded">
                {editing.thumbnailUrl ? (
                  <img src={editing.thumbnailUrl} alt="" className="w-32 aspect-video object-cover rounded" />
                ) : (
                  <div className="w-32 aspect-video bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    no thumb
                  </div>
                )}
                <div className="flex-1 text-sm">
                  <div className="font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-600" /> Ready
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(editing.videoDurationSeconds / 60)} min · uid {editing.streamVideoId.slice(0, 8)}…
                  </div>
                </div>
                <label>
                  <Button asChild variant="outline" size="sm">
                    <span><Upload className="w-4 h-4 mr-1" /> Replace</span>
                  </Button>
                  <input type="file" accept="video/*" className="hidden" onChange={onFileChange} disabled={uploading} />
                </label>
              </div>
            ) : editing.streamVideoId ? (
              <div className="p-3 border rounded text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cloudflare is processing — checking again in a few seconds…
                </div>
                <p className="text-xs text-muted-foreground">
                  Polling attempt {pollAttempts}/60. Usually takes &lt;2x the video length.
                </p>
              </div>
            ) : uploading ? (
              <div className="p-3 border rounded text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading to Cloudflare Stream…
              </div>
            ) : (
              <label className="block">
                <Button asChild variant="outline">
                  <span><Upload className="w-4 h-4 mr-2" /> Upload video</span>
                </Button>
                <input type="file" accept="video/*" className="hidden" onChange={onFileChange} />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lesson-supplement">Supplement markdown (optional)</Label>
            <Textarea
              id="lesson-supplement"
              value={supplementMarkdown}
              onChange={e => setSupplementMarkdown(e.target.value)}
              rows={6}
              className="font-mono text-sm"
              placeholder="## Further reading&#10;&#10;- Link to book section&#10;- Reference doc"
            />
            <p className="text-xs text-muted-foreground">
              Rendered with react-markdown + remark-gfm in the player. <a className="underline" href="https://github.github.com/gfm/" target="_blank" rel="noreferrer">GFM syntax <ExternalLink className="inline w-3 h-3" /></a>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {isEdit ? "Done" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import CSV Dialog ──────────────────────────────────────────────────────

const CSV_SAMPLE = `lesson_slug,question,option_1,option_2,option_3,option_4,correct,explanation
welcome-context,What is the primary goal of Open Process Automation?,Vendor lock-in,Open interoperability,Cost reduction,Faster commissioning,2,Vendor-neutral interoperability is the core goal.
welcome-context,Which industry consortium maintains the O-PAS standard?,ISA,The Open Group (OPAF),NIST,IEC,2,OPAF (Open Process Automation Forum) is part of The Open Group.
welcome-context,Roughly when did the OPA initiative begin?,Mid-1980s,Mid-2010s,Mid-1990s,Mid-2020s,2,ExxonMobil convened the first OPAF meetings in 2016.
o-pas-fundamentals,What does O-PAS stand for?,Open Process Automation Standard,Operational Process Architecture System,Open Plant Automation Software,Optimized Process Application Suite,1,O-PAS is the Open Process Automation Standard.
o-pas-fundamentals,Which protocol underpins the O-PAS Connectivity Framework?,Modbus TCP,OPC UA,HART,Profinet,2,OPC UA is the open vendor-neutral information model used by OCF.
o-pas-fundamentals,Which of these is NOT a core O-PAS goal?,Vendor-neutral interoperability,Modular replaceable components,Vendor lock-in,Open security alignment,3,Vendor lock-in is the opposite of what O-PAS aims for.`;

type ParsedRow = {
  lessonSlug: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

type ParseResult = {
  rows: ParsedRow[];
  errors: { rowNumber: number; message: string }[];
  byLesson: Record<string, number>;
  unknownLessons: string[];
};

function parseCsv(csv: string, availableLessonSlugs: string[]): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  });
  const rows: ParsedRow[] = [];
  const errors: ParseResult["errors"] = [];
  const byLesson: Record<string, number> = {};
  const unknownLessons = new Set<string>();
  const validSlugs = new Set(availableLessonSlugs);

  if (parsed.errors.length > 0) {
    parsed.errors.forEach(e => errors.push({ rowNumber: (e.row ?? 0) + 2, message: e.message }));
  }

  parsed.data.forEach((raw, idx) => {
    const rowNumber = idx + 2; // +1 for header, +1 for 1-indexed
    const lessonSlug = (raw["lesson_slug"] ?? "").trim();
    const question = (raw["question"] ?? "").trim();
    const explanation = (raw["explanation"] ?? "").trim() || undefined;
    const options = [
      (raw["option_1"] ?? "").trim(),
      (raw["option_2"] ?? "").trim(),
      (raw["option_3"] ?? "").trim(),
      (raw["option_4"] ?? "").trim(),
    ].filter(o => o.length > 0);
    const correctRaw = (raw["correct"] ?? "").trim();
    const correctOne = parseInt(correctRaw, 10);

    if (!lessonSlug) {
      errors.push({ rowNumber, message: "lesson_slug is empty" });
      return;
    }
    if (!validSlugs.has(lessonSlug)) {
      errors.push({ rowNumber, message: `lesson_slug "${lessonSlug}" does not exist in this course` });
      unknownLessons.add(lessonSlug);
      return;
    }
    if (!question) {
      errors.push({ rowNumber, message: "question is empty" });
      return;
    }
    if (options.length < 2) {
      errors.push({ rowNumber, message: "at least 2 options required" });
      return;
    }
    if (!Number.isFinite(correctOne) || correctOne < 1 || correctOne > options.length) {
      errors.push({ rowNumber, message: `correct must be 1–${options.length} (got "${correctRaw}")` });
      return;
    }
    rows.push({
      lessonSlug,
      question,
      options,
      correctIndex: correctOne - 1,
      explanation,
    });
    byLesson[lessonSlug] = (byLesson[lessonSlug] ?? 0) + 1;
  });

  return { rows, errors, byLesson, unknownLessons: Array.from(unknownLessons) };
}

function ImportCsvDialog({
  open,
  onOpenChange,
  courseId,
  availableLessonSlugs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  availableLessonSlugs: string[];
}) {
  const utils = trpc.useUtils();
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const importMutation = trpc.quizAdmin.importQuestions.useMutation();

  useEffect(() => {
    if (!open) {
      setCsvText("");
      setPreview(null);
    }
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setPreview(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doPreview = () => {
    if (!csvText.trim()) {
      toast.error("Paste CSV text or choose a file first.");
      return;
    }
    setPreview(parseCsv(csvText, availableLessonSlugs));
  };

  const doImport = async () => {
    if (!preview || preview.errors.length > 0 || preview.rows.length === 0) return;
    try {
      const result = await importMutation.mutateAsync({ courseId, rows: preview.rows });
      toast.success(`Imported ${result.imported} questions across ${Object.keys(result.byLesson).length} lessons` + (result.quizzesCreated > 0 ? ` (${result.quizzesCreated} new quiz${result.quizzesCreated > 1 ? "zes" : ""})` : ""));
      utils.quiz.lessonQuizMap.invalidate({ courseId });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  };

  const downloadSample = () => {
    const blob = new Blob([CSV_SAMPLE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocos-quiz-import-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const canImport = preview && preview.errors.length === 0 && preview.rows.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import quiz questions from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Format help</summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                One row per question. Required columns: <code>lesson_slug</code>, <code>question</code>, <code>option_1</code>–<code>option_4</code>, <code>correct</code> (1–4, 1-indexed).
                <code>explanation</code> is optional. Available lesson slugs in this course:{" "}
                {availableLessonSlugs.length === 0 ? <em>none yet — add lessons first</em> : availableLessonSlugs.map(s => <code key={s} className="mr-1">{s}</code>)}
              </p>
              <Button variant="outline" size="sm" onClick={downloadSample}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download sample CSV
              </Button>
              <pre className="text-[10px] bg-muted/50 p-2 rounded overflow-x-auto">{CSV_SAMPLE.split("\n").slice(0, 3).join("\n")}{"\n..."}</pre>
            </div>
          </details>

          <div className="space-y-1.5">
            <Label className="text-sm">CSV input</Label>
            <Textarea
              value={csvText}
              onChange={e => { setCsvText(e.target.value); setPreview(null); }}
              placeholder={"lesson_slug,question,option_1,option_2,option_3,option_4,correct,explanation\n…"}
              className="font-mono text-xs"
              rows={8}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <label className="cursor-pointer hover:text-foreground">
                <FileSpreadsheet className="inline w-3.5 h-3.5 mr-1" />
                or upload a .csv file
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              </label>
              <Button variant="outline" size="sm" onClick={doPreview} disabled={!csvText.trim()}>Preview</Button>
            </div>
          </div>

          {preview && (
            <div className={`border rounded p-3 ${preview.errors.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-green-500/40 bg-green-500/5"}`}>
              {preview.errors.length === 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">{preview.rows.length} valid question{preview.rows.length === 1 ? "" : "s"}</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {Object.entries(preview.byLesson).map(([slug, n]) => (
                      <li key={slug}><code>{slug}</code>: +{n} question{n === 1 ? "" : "s"}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium">{preview.errors.length} error{preview.errors.length === 1 ? "" : "s"} — fix the CSV before importing</span>
                  </div>
                  <ul className="text-xs space-y-0.5 max-h-40 overflow-y-auto">
                    {preview.errors.map((e, i) => (
                      <li key={i}><span className="font-mono text-muted-foreground">Row {e.rowNumber}:</span> {e.message}</li>
                    ))}
                  </ul>
                  {preview.rows.length > 0 && (
                    <p className="text-xs text-muted-foreground">{preview.rows.length} other row{preview.rows.length === 1 ? "" : "s"} would import if the errors are fixed.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importMutation.isPending}>Cancel</Button>
          <Button onClick={doImport} disabled={!canImport || importMutation.isPending}>
            {importMutation.isPending ? "Importing…" : preview ? `Import ${preview.rows.length} question${preview.rows.length === 1 ? "" : "s"}` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
