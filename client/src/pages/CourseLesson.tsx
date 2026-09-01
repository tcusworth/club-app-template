import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Stream } from "@cloudflare/stream-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  BookOpen,
  PlayCircle,
  Award,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string | null;
};

type QuizData = {
  id: number;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
} | null;

type QuizSubmitResult = {
  score: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  results?: Array<{
    questionId: number;
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
    explanation: string | null;
  }>;
};

export default function CourseLesson() {
  const params = useParams<{ courseSlug: string; lessonSlug: string }>();
  const courseSlug = params.courseSlug;
  const lessonSlug = params.lessonSlug;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: detail, isLoading } = trpc.lessons.get.useQuery({ courseSlug, lessonSlug });
  const courseId = detail?.course.id;
  const lessonId = detail?.lesson.id;
  const { data: progress } = trpc.lessons.getProgress.useQuery(
    { courseId: courseId ?? 0 },
    { enabled: !!courseId && !!user },
  );
  const { data: quiz } = trpc.quiz.getByLesson.useQuery(
    { lessonId: lessonId ?? 0 },
    { enabled: !!lessonId },
  ) as { data: QuizData };

  const completedSet = useMemo(() => {
    const s = new Set<number>();
    (progress ?? []).forEach(p => {
      if (p.completedAt) s.add(p.lessonId);
    });
    return s;
  }, [progress]);

  // Quiz runtime state (local to this lesson visit)
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  // Video-watched gate: the "Take quiz" panel only appears once the user has
  // played the video to the end. Persist per (user, lesson) in localStorage
  // so a refresh or revisit doesn't force a re-watch.
  const watchedStorageKey = lessonId ? `ocos:lesson-watched:${lessonId}` : null;
  const [videoEnded, setVideoEnded] = useState(false);

  const resetQuiz = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setResult(null);
  };

  // When user switches to a new lesson, reset quiz state + reload watched flag.
  useEffect(() => {
    setQuizOpen(false);
    resetQuiz();
    if (watchedStorageKey && typeof window !== "undefined") {
      setVideoEnded(window.localStorage.getItem(watchedStorageKey) === "1");
    } else {
      setVideoEnded(false);
    }
  }, [lessonId, watchedStorageKey]);

  const markVideoEnded = () => {
    setVideoEnded(true);
    if (watchedStorageKey && typeof window !== "undefined") {
      window.localStorage.setItem(watchedStorageKey, "1");
    }
  };

  const submitQuizMutation = trpc.quiz.submit.useMutation({
    onSuccess: (r) => {
      setSubmitted(true);
      setResult(r);
      utils.lessons.getProgress.invalidate();
      utils.coursesLive.myEnrollments.invalidate();
      utils.courses.myEnrollments.invalidate();
      if (r.passed) {
        toast.success(`Passed! ${r.score}% — lesson complete.`);
      } else {
        toast.error(`Score: ${r.score}%. Need ${quiz?.passingScore ?? 70}% to pass.`);
      }
    },
    onError: e => toast.error(e.message),
  });

  const markCompleteMutation = trpc.lessons.markComplete.useMutation({
    onSuccess: () => {
      if (!detail) return;
      utils.lessons.getProgress.invalidate();
      utils.coursesLive.myEnrollments.invalidate();
      utils.courses.myEnrollments.invalidate();
      const idx = detail.siblings.findIndex(s => s.id === detail.lesson.id);
      const nextL = detail.siblings[idx + 1];
      if (nextL) {
        setLocation(`/training/${courseSlug}/lessons/${nextL.slug}`);
      } else {
        toast.success("Course complete!");
        setLocation(`/training`);
      }
    },
    onError: e => toast.error(e.message),
  });

  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in required</h2>
          <p className="text-muted-foreground mb-4">You need to be signed in to watch lessons.</p>
          <Button onClick={() => setLocation("/signin")}>Sign In</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-6 grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
          </div>
          <div className="space-y-3">
            <div className="h-8 w-2/3 bg-muted rounded animate-pulse" />
            <div className="aspect-video bg-muted rounded animate-pulse" />
            <div className="h-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!detail) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Lesson not found</h2>
          <p className="text-muted-foreground mb-4">This lesson doesn't exist or hasn't been published yet.</p>
          <Button variant="outline" onClick={() => setLocation("/training")}>Back to Training</Button>
        </div>
      </DashboardLayout>
    );
  }

  const { lesson, course, siblings } = detail;
  const idx = siblings.findIndex(s => s.id === lesson.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const isLast = next === null;
  const alreadyCompleted = completedSet.has(lesson.id);


  // Determine furthest-unlocked lesson index. A lesson is unlocked if every
  // earlier sibling is in completedSet.
  let furthestUnlocked = 0;
  for (let i = 0; i < siblings.length; i++) {
    if (i === 0 || completedSet.has(siblings[i - 1].id)) {
      furthestUnlocked = i;
    } else {
      break;
    }
  }
  // Current lesson access check: if user navigates to a locked lesson directly,
  // we still show it but with a "locked" overlay rather than gameplay.
  const isLocked = idx > furthestUnlocked;

  const hasQuiz = quiz && quiz.questions.length > 0;
  const questions = quiz?.questions ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/training" className="hover:text-foreground">Training</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{course.title}</span>
          <ChevronRight className="w-3 h-3" />
          <span>{lesson.title}</span>
        </div>

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <aside className="space-y-2">
            <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-2">
              Lessons ({siblings.length})
            </div>
            <ul className="space-y-1">
              {siblings.map((s, i) => {
                const done = completedSet.has(s.id);
                const isCurrent = s.id === lesson.id;
                const locked = i > furthestUnlocked;
                const iconCls = "w-4 h-4 flex-shrink-0";
                const inner = (
                  <span className={`flex items-start gap-2 px-2 py-2 rounded text-sm transition-colors ${
                    isCurrent ? "bg-muted font-medium"
                    : locked ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-muted/50"
                  }`}>
                    <span className="mt-0.5">
                      {done ? <CheckCircle2 className={`${iconCls} text-green-600`} />
                        : locked ? <Lock className={`${iconCls} text-muted-foreground`} />
                        : <Circle className={`${iconCls} text-muted-foreground`} />}
                    </span>
                    <span className="flex-1">
                      <span className="text-xs text-muted-foreground block">Lesson {i + 1}</span>
                      <span>{s.title}</span>
                    </span>
                  </span>
                );
                return (
                  <li key={s.id}>
                    {locked ? (
                      <div title="Complete the previous lesson's quiz to unlock">{inner}</div>
                    ) : (
                      <Link href={`/training/${courseSlug}/lessons/${s.slug}`}>{inner}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>

          <main className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold">{lesson.title}</h1>
                {alreadyCompleted && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                  </Badge>
                )}
                {isLocked && !alreadyCompleted && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="w-3 h-3 mr-1" /> Locked
                  </Badge>
                )}
              </div>
              {lesson.description && <p className="text-muted-foreground">{lesson.description}</p>}
            </div>

            {isLocked && !alreadyCompleted ? (
              <Card className="p-8 text-center border-amber-500/40 bg-amber-500/5">
                <Lock className="w-10 h-10 mx-auto text-amber-600 mb-3" />
                <p className="text-sm font-medium mb-1">This lesson is locked</p>
                <p className="text-sm text-muted-foreground">
                  Pass the previous lesson's quiz to unlock it.
                </p>
              </Card>
            ) : lesson.streamVideoId ? (
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                <Stream
                  controls
                  src={lesson.streamVideoId}
                  onEnded={markVideoEnded}
                  title={lesson.title}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <Card className="p-8 text-center">
                <PlayCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Video coming soon.</p>
              </Card>
            )}

            {!isLocked && !alreadyCompleted && lesson.streamVideoId && !videoEnded && (
              <p className="text-xs text-muted-foreground text-center -mt-2">
                {hasQuiz ? "Watch the video to unlock the quiz." : "Watch the video to unlock the complete button."}
              </p>
            )}

            {!isLocked && lesson.supplementMarkdown && (
              <Card className="p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {lesson.supplementMarkdown}
                  </ReactMarkdown>
                </div>
              </Card>
            )}

            {/* Quiz/completion panel only appears once the video has finished
                (or immediately if the lesson has no video). */}
            {!isLocked && !alreadyCompleted && (!lesson.streamVideoId || videoEnded) && (
              <Card className="p-6 border-primary/30">
                {!quizOpen ? (
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">
                      {hasQuiz ? "Lesson check" : "Mark this lesson complete"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {hasQuiz
                        ? `Pass the ${questions.length}-question quiz to complete the lesson and unlock the next one.`
                        : "No quiz authored for this lesson yet — mark it complete to continue."}
                    </p>
                    {hasQuiz ? (
                      <Button onClick={() => setQuizOpen(true)}>
                        Take quiz <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button onClick={() => markCompleteMutation.mutate({ lessonId: lesson.id })} disabled={markCompleteMutation.isPending}>
                        {markCompleteMutation.isPending ? "Saving…" : isLast ? "Mark complete & finish" : "Mark complete & continue"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                ) : submitted && result ? (
                  <QuizResult
                    result={result}
                    passingScore={quiz?.passingScore ?? 70}
                    questions={questions}
                    selectedAnswers={selectedAnswers}
                    isLast={isLast}
                    onRetry={resetQuiz}
                    onContinue={() => {
                      if (next) {
                        setLocation(`/training/${courseSlug}/lessons/${next.slug}`);
                      } else {
                        toast.success("Course complete!");
                        setLocation(`/training`);
                      }
                    }}
                  />
                ) : (
                  <QuizRunner
                    questions={questions}
                    passingScore={quiz?.passingScore ?? 70}
                    selectedAnswers={selectedAnswers}
                    setSelectedAnswers={setSelectedAnswers}
                    onSubmit={() => {
                      const answers = questions.map((_, i) => selectedAnswers[i] ?? -1);
                      submitQuizMutation.mutate({ quizId: quiz!.id, answers });
                    }}
                    isPending={submitQuizMutation.isPending}
                  />
                )}
              </Card>
            )}

            {alreadyCompleted && (
              <Card className="p-6 border-green-500/30 bg-green-500/5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium">You've completed this lesson.</span>
                  </div>
                  <Button onClick={() => {
                    if (next) setLocation(`/training/${courseSlug}/lessons/${next.slug}`);
                    else setLocation("/training");
                  }}>
                    {next ? "Next lesson" : "Back to training"}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
              <Button
                variant="outline"
                disabled={!prev}
                onClick={() => prev && setLocation(`/training/${courseSlug}/lessons/${prev.slug}`)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                disabled={!next || (next && idx + 1 > furthestUnlocked)}
                onClick={() => next && setLocation(`/training/${courseSlug}/lessons/${next.slug}`)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}

function QuizRunner({
  questions,
  passingScore,
  selectedAnswers,
  setSelectedAnswers,
  onSubmit,
  isPending,
}: {
  questions: NonNullable<QuizData>["questions"];
  passingScore: number;
  selectedAnswers: Record<number, number>;
  setSelectedAnswers: (s: Record<number, number>) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-lg">Lesson quiz</h3>
        <div className="text-xs text-muted-foreground">
          {answeredCount}/{questions.length} answered · pass at {passingScore}%
        </div>
      </div>

      <ol className="space-y-5">
        {questions.map((q, qi) => (
          <li key={q.id} className="space-y-2">
            <div className="font-medium">
              <span className="text-muted-foreground mr-2">{qi + 1}.</span>
              {q.question}
            </div>
            <ul className="space-y-1">
              {q.options.map((opt, oi) => (
                <li key={oi}>
                  <label className={`flex items-start gap-2 p-2 rounded cursor-pointer ${
                    selectedAnswers[qi] === oi ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                  }`}>
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={selectedAnswers[qi] === oi}
                      onChange={() => setSelectedAnswers({ ...selectedAnswers, [qi]: oi })}
                      className="mt-1"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="flex justify-end pt-2 border-t">
        <Button onClick={onSubmit} disabled={!allAnswered || isPending}>
          {isPending ? "Submitting…" : "Submit answers"}
        </Button>
      </div>
    </div>
  );
}

function QuizResult({
  result,
  passingScore,
  questions,
  selectedAnswers,
  isLast,
  onRetry,
  onContinue,
}: {
  result: QuizSubmitResult;
  passingScore: number;
  questions: NonNullable<QuizData>["questions"];
  selectedAnswers: Record<number, number>;
  isLast: boolean;
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        {result.passed
          ? <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
          : <XCircle className="w-12 h-12 mx-auto text-destructive mb-2" />}
        <h3 className="text-xl font-bold mb-1">{result.passed ? "Passed" : "Not yet"}</h3>
        <p className="text-sm text-muted-foreground">
          You scored {result.score}% ({result.correctCount}/{result.totalCount}) · pass at {passingScore}%
        </p>
      </div>

      <ol className="space-y-3 text-sm">
        {questions.map((q, qi) => {
          const review = result.results?.find(r => r.questionId === q.id);
          const picked = selectedAnswers[qi];
          const correctIndex = review?.correctIndex ?? q.correctIndex;
          const correct = review?.isCorrect ?? (correctIndex === picked);
          const explanation = review?.explanation ?? q.explanation;
          return (
            <li key={q.id} className={`p-3 rounded border ${correct ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
              <div className="flex items-start gap-2 mb-1">
                {correct ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />}
                <span className="font-medium">{q.question}</span>
              </div>
              <div className="ml-6 text-xs text-muted-foreground">
                Your answer: <span className={correct ? "text-green-700 dark:text-green-400" : "text-destructive"}>{q.options[picked] ?? "(unanswered)"}</span>
                {!correct && correctIndex != null && (
                  <>
                    {" · "}Correct: <span className="text-green-700 dark:text-green-400">{q.options[correctIndex]}</span>
                  </>
                )}
              </div>
              {explanation && (
                <p className="ml-6 text-xs text-muted-foreground italic mt-1">{explanation}</p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex justify-end gap-2 pt-2 border-t">
        {!result.passed ? (
          <Button onClick={onRetry}>
            <RotateCcw className="w-4 h-4 mr-1" /> Try again
          </Button>
        ) : (
          <Button onClick={onContinue}>
            {isLast ? <><Award className="w-4 h-4 mr-1" /> Finish course</> : <>Next lesson <ChevronRight className="w-4 h-4 ml-1" /></>}
          </Button>
        )}
      </div>
    </div>
  );
}
