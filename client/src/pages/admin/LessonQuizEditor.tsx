import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle2,
  ListChecks,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type QuestionRow = {
  id: number;
  quizId: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  displayOrder: number;
};

// Per the OCOS convention: 3 questions per lesson, 4 choices each.
const TARGET_QUESTIONS_PER_LESSON = 3;
const DEFAULT_OPTION_COUNT = 4;

export default function LessonQuizEditor() {
  const params = useParams<{ courseSlug: string; lessonSlug: string }>();
  const courseSlug = params.courseSlug;
  const lessonSlug = params.lessonSlug;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const detailQuery = trpc.lessons.get.useQuery(
    { courseSlug, lessonSlug },
    { enabled: !!user && user.role === "admin" },
  );
  const detail = detailQuery.data;
  const lesson = detail?.lesson;
  const course = detail?.course;
  // For admin nav we want the full lesson list (including drafts), not just
  // published siblings.
  const allLessonsQuery = trpc.lessonsAdmin.list.useQuery(
    { courseId: course?.id ?? 0 },
    { enabled: !!course?.id },
  );
  const allLessons = (allLessonsQuery.data ?? []) as { id: number; title: string; slug: string }[];
  const navIdx = allLessons.findIndex(l => l.slug === lessonSlug);
  const navPrev = navIdx > 0 ? allLessons[navIdx - 1] : null;
  const navNext = navIdx >= 0 && navIdx < allLessons.length - 1 ? allLessons[navIdx + 1] : null;

  const quizQuery = trpc.quizAdmin.getByLesson.useQuery(
    { lessonId: lesson?.id ?? 0 },
    { enabled: !!lesson?.id },
  );
  const quiz = quizQuery.data as null | { id: number; title: string; passingScore: number; questions: QuestionRow[] };

  const upsertQuiz = trpc.quizAdmin.upsertLessonQuiz.useMutation();
  const reorderMutation = trpc.quizAdmin.reorderQuestions.useMutation();
  const deleteMutation = trpc.quizAdmin.deleteQuestion.useMutation();

  const [passingScore, setPassingScore] = useState<number>(70);
  useEffect(() => {
    if (quiz?.passingScore !== undefined) setPassingScore(quiz.passingScore);
  }, [quiz?.passingScore]);

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QuestionRow | null>(null);

  if (!user) return null;
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

  if (detailQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!detail || !lesson || !course) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Lesson not found</h2>
          <p className="text-muted-foreground mb-4">No lesson "{lessonSlug}" in course "{courseSlug}".</p>
          <Button variant="outline" onClick={() => setLocation(`/admin/courses/${courseSlug}/lessons`)}>Back to lessons</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSaveQuizSettings = async () => {
    try {
      await upsertQuiz.mutateAsync({ lessonId: lesson.id, passingScore });
      toast.success("Quiz settings saved");
      utils.quizAdmin.getByLesson.invalidate({ lessonId: lesson.id });
      utils.quiz.lessonQuizMap.invalidate({ courseId: course.id });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  const moveQuestion = async (idx: number, dir: -1 | 1) => {
    if (!quiz) return;
    const target = idx + dir;
    if (target < 0 || target >= quiz.questions.length) return;
    const newOrder = [...quiz.questions];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    try {
      await reorderMutation.mutateAsync({ quizId: quiz.id, questionIds: newOrder.map(q => q.id) });
      utils.quizAdmin.getByLesson.invalidate({ lessonId: lesson.id });
    } catch (e: any) {
      toast.error(e.message ?? "Reorder failed");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync({ questionId: confirmDelete.id });
      toast.success("Question deleted");
      utils.quizAdmin.getByLesson.invalidate({ lessonId: lesson.id });
      utils.quiz.lessonQuizMap.invalidate({ courseId: course.id });
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  };

  const openCreate = () => {
    setEditingQuestion(null);
    setQuestionDialogOpen(true);
  };
  const openEdit = (q: QuestionRow) => {
    setEditingQuestion(q);
    setQuestionDialogOpen(true);
  };

  const questions = quiz?.questions ?? [];
  const targetMet = questions.length >= TARGET_QUESTIONS_PER_LESSON;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            <Link href="/admin" className="hover:text-foreground">Admin</Link>
            {" / "}
            <Link href={`/admin/courses/${course.slug}/lessons`} className="hover:text-foreground">{course.title}</Link>
            {" / "}
            <span>{lesson.title}</span>
            {" / Quiz"}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Quiz: {lesson.title}</h1>
              <p className="text-sm text-muted-foreground">
                Target: {TARGET_QUESTIONS_PER_LESSON} questions, {DEFAULT_OPTION_COUNT} choices each.
                {navIdx >= 0 && allLessons.length > 1 && <> · Lesson {navIdx + 1} of {allLessons.length}</>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!navPrev}
                onClick={() => navPrev && setLocation(`/admin/courses/${course.slug}/lessons/${navPrev.slug}/quiz`)}
                title={navPrev ? `Previous: ${navPrev.title}` : "First lesson"}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Link
                href={`/admin/courses/${course.slug}/lessons`}
                className="text-xs px-2.5 py-1.5 border rounded-md hover:bg-muted"
              >
                All lessons
              </Link>
              <Button
                variant="outline"
                size="sm"
                disabled={!navNext}
                onClick={() => navNext && setLocation(`/admin/courses/${course.slug}/lessons/${navNext.slug}/quiz`)}
                title={navNext ? `Next: ${navNext.title}` : "Last lesson"}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quiz settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="space-y-1.5 flex-1 max-w-xs">
                <Label htmlFor="passing-score">Passing score (%)</Label>
                <Input
                  id="passing-score"
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={e => setPassingScore(parseInt(e.target.value) || 0)}
                />
              </div>
              <Button onClick={handleSaveQuizSettings} disabled={upsertQuiz.isPending}>
                {upsertQuiz.isPending ? "Saving…" : "Save settings"}
              </Button>
            </div>
            {!quiz && (
              <p className="text-xs text-muted-foreground">
                No quiz exists for this lesson yet. Saving settings will create one.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Questions {quiz ? `(${questions.length}/${TARGET_QUESTIONS_PER_LESSON})` : ""}
              {quiz && targetMet && <CheckCircle2 className="inline-block w-4 h-4 ml-2 text-green-600" />}
            </CardTitle>
            <Button onClick={openCreate} disabled={!quiz}>
              <Plus className="w-4 h-4 mr-2" /> Add question
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!quiz ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Create the quiz first (save settings above) before adding questions.
              </div>
            ) : quizQuery.isLoading ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                Loading questions…
              </div>
            ) : questions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-3">No questions yet. Add {TARGET_QUESTIONS_PER_LESSON} to gate this lesson.</p>
                <Button variant="outline" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-2" /> Add the first one
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {questions.map((q, i) => (
                  <li key={q.id} className="p-4 flex flex-wrap items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        disabled={i === 0 || reorderMutation.isPending}
                        onClick={() => moveQuestion(i, -1)}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        disabled={i === questions.length - 1 || reorderMutation.isPending}
                        onClick={() => moveQuestion(i, 1)}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">Q{i + 1}</Badge>
                        <span className="font-medium">{q.question}</span>
                      </div>
                      <ul className="space-y-1 text-sm">
                        {q.options.map((opt, oi) => (
                          <li key={oi} className="flex items-start gap-2">
                            {oi === q.correctIndex ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <span className="w-4 h-4 mt-0.5 inline-block flex-shrink-0 border rounded-full" />
                            )}
                            <span className={oi === q.correctIndex ? "font-medium" : "text-muted-foreground"}>{opt}</span>
                          </li>
                        ))}
                      </ul>
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground mt-2 italic">Explanation: {q.explanation}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(q)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(q)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {quiz && (
        <LessonQuestionDialog
          open={questionDialogOpen}
          onOpenChange={setQuestionDialogOpen}
          quizId={quiz.id}
          lessonId={lesson.id}
          courseId={course.id}
          editing={editingQuestion}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.question}" will be removed permanently. Existing user attempts are not affected.
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

function LessonQuestionDialog({
  open,
  onOpenChange,
  quizId,
  lessonId,
  courseId,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: number;
  lessonId: number;
  courseId: number;
  editing: QuestionRow | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editing;
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>(Array(DEFAULT_OPTION_COUNT).fill(""));
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);

  const addMutation = trpc.quizAdmin.addQuestion.useMutation();
  const updateMutation = trpc.quizAdmin.updateQuestion.useMutation();

  useEffect(() => {
    if (open) {
      setQuestionText(editing?.question ?? "");
      setOptions(editing?.options ?? Array(DEFAULT_OPTION_COUNT).fill(""));
      setCorrectIndex(editing?.correctIndex ?? 0);
      setExplanation(editing?.explanation ?? "");
    }
  }, [open, editing]);

  const updateOption = (idx: number, value: string) => {
    setOptions(opts => opts.map((o, i) => (i === idx ? value : o)));
  };

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions(opts => [...opts, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(opts => opts.filter((_, i) => i !== idx));
    if (correctIndex >= idx && correctIndex > 0) setCorrectIndex(correctIndex - 1);
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      toast.error("Question text is required");
      return;
    }
    const cleanOptions = options.map(o => o.trim());
    if (cleanOptions.some(o => !o)) {
      toast.error("All options must have text");
      return;
    }
    if (correctIndex < 0 || correctIndex >= cleanOptions.length) {
      toast.error("Pick a correct answer");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && editing) {
        await updateMutation.mutateAsync({
          questionId: editing.id,
          question: questionText,
          options: cleanOptions,
          correctIndex,
          explanation: explanation || null,
        });
        toast.success("Question updated");
      } else {
        await addMutation.mutateAsync({
          quizId,
          question: questionText,
          options: cleanOptions,
          correctIndex,
          explanation: explanation || undefined,
        });
        toast.success("Question added");
      }
      utils.quizAdmin.getByLesson.invalidate({ lessonId });
      utils.quiz.lessonQuizMap.invalidate({ courseId });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit question" : "Add question"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="question-text">Question</Label>
            <Textarea
              id="question-text"
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={3}
              placeholder="What does O-PAS stand for?"
            />
          </div>

          <div className="space-y-2">
            <Label>Options (pick the correct answer)</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <button
                  type="button"
                  className={`mt-2 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    correctIndex === idx
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30 hover:border-muted-foreground"
                  }`}
                  onClick={() => setCorrectIndex(idx)}
                  aria-label={`Mark option ${idx + 1} as correct`}
                >
                  {correctIndex === idx && (
                    <span className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </button>
                <Input
                  value={opt}
                  onChange={e => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removeOption(idx)} aria-label="Remove option">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="w-4 h-4 mr-2" /> Add option
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="explanation">Explanation (optional)</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={2}
              placeholder="Shown to the user after they answer."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Add question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
