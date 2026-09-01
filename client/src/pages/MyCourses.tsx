import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Users, Play, CheckCircle, Search, GraduationCap, Lock, Award } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

export default function MyCourses() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const coursesQuery = trpc.coursesLive.list.useQuery({});
  const enrollmentsQuery = trpc.coursesLive.myEnrollments.useQuery(undefined, { enabled: !!user });

  const enrollMutation = trpc.coursesLive.enroll.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success("Enrolled successfully!");
      enrollmentsQuery.refetch();
      const course = (coursesQuery.data ?? []).find((c: any) => c.id === variables.courseId);
      if (course) await continueLearning(course.id, course.slug);
    },
    onError: (e) => toast.error(e.message),
  });

  const continueLearning = async (courseId: number, courseSlug: string) => {
    try {
      const result = await utils.lessons.getNextIncomplete.fetch({ courseId });
      if (result.nextLesson) {
        navigate(`/training/${courseSlug}/lessons/${result.nextLesson.slug}`);
      } else if (result.totalLessons > 0) {
        navigate(`/certificates`);
      } else {
        toast.info("This course doesn't have any lessons yet.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to find the next lesson");
    }
  };

  const courses = (coursesQuery.data ?? []) as any[];
  const enrollments = (enrollmentsQuery.data ?? []) as any[];
  const enrolledIds = new Set(enrollments.map(e => e.courseId));

  const filteredCourses = courses.filter(c => {
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || c.level === levelFilter;
    const matchCat = categoryFilter === "all" || c.category === categoryFilter;
    return matchSearch && matchLevel && matchCat;
  });

  const myCourses = courses.filter(c => enrolledIds.has(c.id));
  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean)));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
          <p className="text-sm text-muted-foreground">OPA/O-PAS training and certification paths</p>
        </div>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Course Catalog</TabsTrigger>
          <TabsTrigger value="enrolled">My Enrollments {myCourses.length > 0 && `(${myCourses.length})`}</TabsTrigger>
        </TabsList>

        {/* ── Catalog Tab ── */}
        <TabsContent value="catalog" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search courses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat as string} value={cat as string}>{cat as string}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map(course => {
              const isEnrolled = enrolledIds.has(course.id);
              return (
                <Card key={course.id} className="flex flex-col hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-primary/40" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{course.title}</CardTitle>
                      {!course.isFree && <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{course.excerpt ?? course.description}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {course.level && <Badge variant="outline" className={`text-xs ${LEVEL_COLORS[course.level] ?? ""}`}>{course.level}</Badge>}
                      {course.category && <Badge variant="outline" className="text-xs">{course.category}</Badge>}
                      {course.isFree && <Badge className="text-xs bg-green-600 text-white">Free</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {course.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.duration}</span>}
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.lessonCount ?? 0} lessons</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{(course.enrollmentCount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="mt-auto">
                      {isEnrolled ? (
                        <Button size="sm" className="w-full" onClick={() => continueLearning(course.id, course.slug)}>
                          <Play className="h-3 w-3 mr-1" /> Continue
                        </Button>
                      ) : course.isFree ? (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => user ? enrollMutation.mutate({ courseId: course.id }) : navigate("/signin")}
                          disabled={enrollMutation.isPending}
                        >
                          {enrollMutation.isPending ? "Starting..." : "Start course"}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => toast.info("Pro enrollment coming soon!")}>
                          <Lock className="h-3 w-3 mr-1" /> Enroll — Pro
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredCourses.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No courses match your filters.</p>
            </div>
          )}
        </TabsContent>

        {/* ── My Enrollments Tab ── */}
        <TabsContent value="enrolled" className="space-y-4 mt-4">
          {myCourses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No courses yet</p>
              <p className="text-sm mt-1">Enroll in a course from the catalog to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCourses.map(course => {
                const enrollment = enrollments.find(e => e.courseId === course.id);
                const progress = enrollment?.progress ?? 0;
                const isCompleted = !!enrollment?.completedAt;
                return (
                  <Card key={course.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{course.title}</CardTitle>
                        {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
                      </div>
                      {course.level && (
                        <Badge variant="outline" className={`text-xs w-fit ${LEVEL_COLORS[course.level] ?? ""}`}>
                          {course.level}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span><span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {course.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.duration}</span>}
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.lessonCount ?? 0} lessons</span>
                      </div>
                      {isCompleted ? (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/certificates")}>
                          <Award className="h-3 w-3 mr-1" /> View certificate
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full" onClick={() => continueLearning(course.id, course.slug)}>
                          <Play className="h-3 w-3 mr-1" /> {progress > 0 ? "Continue" : "Start"} course
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
