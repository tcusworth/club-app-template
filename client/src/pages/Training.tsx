import React, { useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import SectionHeroBanner from '@/components/SectionHeroBanner';
import {
  BookMarked, Search, Clock, Users, Star, Lock, Play,
  ChevronRight, Award, TrendingUp, BookOpen, Layers, Cpu,
  Network, Shield, BarChart3, Zap, CheckCircle2, GraduationCap,
  ArrowRight, MessageSquare, ExternalLink, Hash,
} from "lucide-react";

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  advanced: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Foundations: BookOpen,
  Architecture: Cpu,
  Integration: Network,
  Security: Shield,
  Business: BarChart3,
  Practicum: Layers,
  'Advanced Topics': Zap,
  Migration: TrendingUp,
};

const LEARNING_PATHS = [
  {
    title: "OPA Practitioner",
    description: "Go from zero to deployment-ready in OPA architecture and integration.",
    slugs: ['opas-fundamentals', 'dcsa-acp', 'connectivity-framework', 'opa-migration-planning'],
    level: "Beginner → Advanced",
    totalDuration: "15h",
    color: "from-blue-500 to-purple-600",
  },
  {
    title: "Executive Decision Maker",
    description: "Understand OPA well enough to drive procurement decisions and capital justification.",
    slugs: ['opas-fundamentals', 'opa-business-case'],
    level: "Beginner",
    totalDuration: "6h",
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Security Specialist",
    description: "Master cybersecurity for open automation environments.",
    slugs: ['opas-fundamentals', 'opa-security'],
    level: "Intermediate → Advanced",
    totalDuration: "8h",
    color: "from-red-500 to-rose-600",
  },
];

const CATEGORIES = ["All", "Foundations", "Architecture", "Integration", "Security", "Business", "Practicum", "Advanced Topics", "Migration"];
const LEVELS = ["All Levels", "Beginner", "Intermediate", "Advanced"];

export default function Training() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All Levels");

  // No status filter: catalog shows published + coming_soon (and draft for admins).
  // The CourseCard handles coming_soon with a disabled "Coming Soon" CTA.
  const coursesQuery = trpc.coursesLive.list.useQuery({});
  const enrollmentsQuery = trpc.coursesLive.myEnrollments.useQuery(undefined, { enabled: !!user });

  const continueLearning = async (courseId: number, courseSlug: string) => {
    try {
      const result = await utils.lessons.getNextIncomplete.fetch({ courseId });
      if (result.nextLesson) {
        navigate(`/training/${courseSlug}/lessons/${result.nextLesson.slug}`);
      } else if (result.totalLessons > 0) {
        // All lessons complete → course complete. Surface the certificate.
        navigate(`/certificates`);
      } else {
        toast.info("This course doesn't have any lessons yet.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to find the next lesson");
    }
  };

  const courses = coursesQuery.data || [];
  const enrollments = enrollmentsQuery.data || [];
  const enrollmentMap = new Map(enrollments.map((e: any) => [e.courseId, e]));

  const filtered = courses.filter((c: any) => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "All" || c.category === selectedCategory;
    const matchLevel = selectedLevel === "All Levels" || c.level?.toLowerCase() === selectedLevel.toLowerCase();
    return matchSearch && matchCat && matchLevel;
  });

  const inProgress = enrollments.filter((e: any) => e.progress > 0 && e.progress < 100);
  const completed = enrollments.filter((e: any) => e.progress >= 100);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Banner */}
        <SectionHeroBanner sectionKey="training" />
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookMarked className="w-6 h-6 text-primary" />
              OPA Training Center
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Structured courses and learning paths for Open Process Automation professionals.
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>{courses.length} courses</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{courses.reduce((sum: number, c: any) => sum + (c.enrollmentCount || 0), 0)} enrolled</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="catalog">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="catalog" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Catalog
            </TabsTrigger>
            <TabsTrigger value="paths" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Learning Paths
            </TabsTrigger>
            {user && (
              <TabsTrigger value="my" className="gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                My Courses
              </TabsTrigger>
            )}
          </TabsList>

          {/* Course Catalog */}
          <TabsContent value="catalog" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {coursesQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-5 animate-pulse">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No courses found</h3>
                <p className="text-muted-foreground">Try adjusting your filters.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((course: any) => {
                  const enrollment = enrollmentMap.get(course.id);
                  const CategoryIcon = CATEGORY_ICONS[course.category] || BookOpen;
                  return (
                    <CourseCard
                      key={course.id}
                      course={course}
                      enrollment={enrollment}
                      user={user}
                      CategoryIcon={CategoryIcon}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Learning Paths */}
          <TabsContent value="paths" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LEARNING_PATHS.map((path) => {
                const pathCourses = courses.filter((c: any) => path.slugs.includes(c.slug));
                const enrolledCount = pathCourses.filter((c: any) => enrollmentMap.has(c.id)).length;
                const completedCount = pathCourses.filter((c: any) => {
                  const e = enrollmentMap.get(c.id);
                  return e && e.progress >= 100;
                }).length;
                return (
                  <Card key={path.title} className="overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${path.color}`} />
                    <CardContent className="p-5">
                      <h3 className="font-bold text-foreground text-lg mb-1">{path.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{path.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{path.totalDuration}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{path.slugs.length} courses</span>
                        <Badge variant="outline" className="text-[10px]">{path.level}</Badge>
                      </div>
                      {user && pathCourses.length > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{completedCount}/{pathCourses.length} completed</span>
                          </div>
                          <Progress value={(completedCount / pathCourses.length) * 100} className="h-1.5" />
                        </div>
                      )}
                      <div className="space-y-2">
                        {pathCourses.map((c: any, i: number) => {
                          const e = enrollmentMap.get(c.id);
                          return (
                            <div key={c.id} className="flex items-center gap-2 text-sm">
                              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                              {e?.progress >= 100 ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              ) : e ? (
                                <Play className="w-3.5 h-3.5 text-primary shrink-0" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />
                              )}
                              <span className={`truncate ${e?.progress >= 100 ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {c.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* My Courses */}
          {user && (
            <TabsContent value="my" className="space-y-6 mt-4">
              {enrollments.length === 0 ? (
                <Card className="p-12 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">Enroll in a course to start tracking your progress.</p>
                  <Button onClick={() => document.querySelector<HTMLButtonElement>('[value="catalog"]')?.click()}>
                    Browse Catalog
                  </Button>
                </Card>
              ) : (
                <>
                  {inProgress.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Play className="w-4 h-4 text-primary" />
                        In Progress ({inProgress.length})
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inProgress.map((enrollment: any) => {
                          const course = courses.find((c: any) => c.id === enrollment.courseId);
                          if (!course) return null;
                          return (
                            <Card key={enrollment.id} className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-foreground text-sm truncate">{course.title}</h3>
                                  <p className="text-xs text-muted-foreground">{course.category}</p>
                                </div>
                                <Badge variant="outline" className={`text-[10px] ml-2 shrink-0 ${LEVEL_COLORS[course.level]}`}>
                                  {course.level}
                                </Badge>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Progress</span>
                                  <span>{enrollment.progress}%</span>
                                </div>
                                <Progress value={enrollment.progress} className="h-2" />
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1.5"
                                  onClick={() => continueLearning(course.id, course.slug)}
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  Continue
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {completed.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-500" />
                        Completed ({completed.length})
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {completed.map((enrollment: any) => {
                          const course = courses.find((c: any) => c.id === enrollment.courseId);
                          if (!course) return null;
                          return (
                            <Card key={enrollment.id} className="p-4 border-green-500/20 bg-green-500/5">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-foreground text-sm truncate">{course.title}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    Completed {enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : ''}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function CourseCard({ course, enrollment, user, CategoryIcon }: {
  course: any;
  enrollment: any;
  user: any;
  CategoryIcon: React.ElementType;
}) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const linkedDiscussion = trpc.courseDiscussion.getLinked.useQuery(
    { courseId: course.id },
    { enabled: !!enrollment }
  );

  const isPublished = course.status === 'published';
  const isCompleted = !!enrollment?.completedAt; // all per-lesson quizzes passed

  const firstLessonsQuery = trpc.lessons.listByCourse.useQuery(
    { courseId: course.id },
    { enabled: isPublished && !enrollment },
  );
  const firstLesson = firstLessonsQuery.data?.[0];

  const nextIncompleteQuery = trpc.lessons.getNextIncomplete.useQuery(
    { courseId: course.id },
    { enabled: !!enrollment && !isCompleted && !!user },
  );
  const nextLesson = nextIncompleteQuery.data?.nextLesson;
  const totalLessons = nextIncompleteQuery.data?.totalLessons ?? 0;

  const enrollMutation = trpc.coursesLive.enroll.useMutation({
    onSuccess: async () => {
      utils.coursesLive.myEnrollments.invalidate();
      utils.coursesLive.list.invalidate();
      // After enrolling, navigate to the first published lesson if there is one
      const lessons = firstLessonsQuery.data ?? await utils.lessons.listByCourse.fetch({ courseId: course.id });
      if (lessons[0]) {
        navigate(`/training/${course.slug}/lessons/${lessons[0].slug}`);
      } else {
        toast.success("Enrolled — lessons will appear here once they're published.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="flex flex-col hover:border-primary/40 transition-all">
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CategoryIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            {course.status === 'coming_soon' && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Coming Soon</Badge>
            )}
            {course.isFree && course.status !== 'coming_soon' && (
              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Free</Badge>
            )}
            {!course.isFree && course.status !== 'coming_soon' && (
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <Badge variant="outline" className={`text-[10px] ${LEVEL_COLORS[course.level] || ''}`}>
              {course.level}
            </Badge>
          </div>
        </div>

        <h3 className="font-semibold text-foreground text-sm mb-1.5 line-clamp-2">{course.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">{course.description}</p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration || '—'}</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{course.lessonCount} lessons</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrollmentCount}</span>
        </div>

        {enrollment && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{enrollment.progress}%</span>
            </div>
            <Progress value={enrollment.progress} className="h-1.5" />
          </div>
        )}

        {course.status === 'coming_soon' ? (
          <Button size="sm" variant="outline" className="w-full gap-1.5" disabled>
            <Clock className="w-3.5 h-3.5" />
            Coming Soon
          </Button>
        ) : !user ? (
          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => navigate('/signin')}>
            <ArrowRight className="w-3.5 h-3.5" />
            Sign in to Enroll
          </Button>
        ) : !enrollment ? (
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={() => enrollMutation.mutate({ courseId: course.id })}
            disabled={enrollMutation.isPending}
          >
            <Play className="w-3.5 h-3.5" />
            {enrollMutation.isPending ? 'Starting...' : 'Start course'}
          </Button>
        ) : isCompleted ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 border-green-500/30 text-green-700 dark:text-green-400"
            onClick={() => navigate('/certificates')}
          >
            <Award className="w-3.5 h-3.5" />
            View certificate
          </Button>
        ) : nextLesson ? (
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={() => navigate(`/training/${course.slug}/lessons/${nextLesson.slug}`)}
          >
            <Play className="w-3.5 h-3.5" />
            <span className="truncate">Continue: {nextLesson.title}</span>
          </Button>
        ) : totalLessons === 0 ? (
          <Button size="sm" variant="outline" className="w-full gap-1.5" disabled>
            <Clock className="w-3.5 h-3.5" />
            No lessons yet
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full gap-1.5" disabled>
            <Play className="w-3.5 h-3.5" />
            Loading…
          </Button>
        )}

        {/* Linked Discussion Thread */}
        {enrollment && linkedDiscussion.data && (
          <a
            href={`/community/discussion/${linkedDiscussion.data.slug}`}
            className="mt-3 flex items-center gap-2 text-xs text-primary hover:underline border border-primary/20 rounded-md px-3 py-2 bg-primary/5"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Course Discussion: {linkedDiscussion.data.title}</span>
            <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
          </a>
        )}

        {/* Admin-only authoring shortcut */}
        {user?.role === "admin" && (
          <div className="mt-3">
            <a
              href={`/admin/courses/${course.slug}/lessons`}
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1.5"
            >
              Manage lessons & per-lesson quizzes
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
