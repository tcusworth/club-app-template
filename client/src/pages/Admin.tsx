import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CLUB_NAME } from "@/lib/clubConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import Papa from "papaparse";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatStrip, type StatStripItem } from "@/components/dashboard/StatStrip";
import { CATEGORY_HUES, CATEGORY_COLORS } from "@/lib/categoryColors";
import {
  Shield, Users, FileText, Layers, Building2, FolderKanban,
  AlertCircle, CheckCircle2, XCircle, Clock, Eye, ChevronRight,
  Plus, Trash2, Edit, Send, BarChart3, Mail, Upload, ArrowRight, Zap, UserCog,
  UserCheck, Linkedin, ScrollText, TrendingUp, RefreshCw,
  GraduationCap, BookOpen, ClipboardList, ArrowUp, ArrowDown, Pencil,
  FileSpreadsheet, AlertTriangle, Download, Check,
} from "lucide-react";
import { Streamdown } from "streamdown";

const PLATFORM_ROLES = [
  { value: "owner_operator", label: "Owner/Operator" },
  { value: "epc_integrator", label: "EPC/Integrator" },
  { value: "automation_engineer", label: "Automation Engineer" },
  { value: "executive", label: "Executive" },
  { value: "vendor", label: "Vendor" },
  { value: "analyst", label: "Analyst" },
  { value: "instructor", label: "Instructor" },
];

// ─── Admin navigation structure ─────────────────────────────────────
// Function declarations below are hoisted, so referencing the tab
// components here (before they're defined) is safe.
type AdminNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  component: React.ComponentType;
};
type AdminNavGroup = { label: string | null; items: AdminNavItem[] };

const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    items: [
      { id: "overview", label: "Overview", icon: BarChart3, description: "Platform stats at a glance.", component: OverviewTab },
    ],
  },
  {
    label: "Members",
    items: [
      { id: "users", label: "Users", icon: Users, description: "Manage member accounts, roles, and platform roles.", component: UsersTab },
      { id: "verification", label: "Verification", icon: UserCheck, description: "Review expert verification requests.", component: ExpertVerificationTab },
      { id: "promotions", label: "Promotions", icon: TrendingUp, description: "Review member role promotion requests.", component: PendingPromotionsTab },
      { id: "moderation", label: "Moderation", icon: Eye, description: "Review reported content and members.", component: ModerationTab },
    ],
  },
  {
    label: "Learning",
    items: [
    ],
  },
  {
    label: "Communications",
    items: [
      { id: "email-blast", label: "Email Blast", icon: Mail, description: "Compose and send an email to all members.", component: EmailBlastTab },
      { id: "digest", label: "Digest", icon: Mail, description: "Configure and preview the weekly email digest.", component: DigestTab },
      { id: "reengagement", label: "Re-engagement", icon: RefreshCw, description: "Re-engage members who have gone inactive.", component: ReEngagementTab },
    ],
  },
  {
    label: "Data & Imports",
    items: [
      { id: "seed", label: "Seed Data", icon: Layers, description: "Seed capabilities, vendors, architecture components, and reference data.", component: SeedDataTab },
      { id: "fca-import", label: "FCA Import", icon: Upload, description: "Import FCA member data.", component: FcaImportTab },
      { id: "linkedin-import", label: "LinkedIn Import", icon: Linkedin, description: "Import members from LinkedIn exports.", component: LinkedInImportTab },
    ],
  },
  {
    label: "System",
    items: [
      { id: "workflows", label: "Workflows", icon: Zap, description: "Toggle automated platform workflows.", component: WorkflowsTab },
      { id: "profile-fields", label: "Profile Fields", icon: UserCog, description: "Manage custom fields members fill in on their profile.", component: ProfileFieldsTab },
      { id: "audit-logs", label: "Audit Logs", icon: ScrollText, description: "Review the platform audit trail.", component: AuditLogsTab },
    ],
  },
];

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="opa-card max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="font-heading text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allItems = ADMIN_NAV.flatMap(g => g.items);
  const active = allItems.find(i => i.id === activeTab) ?? allItems[0];
  const ActiveComponent = active.component;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[34px] font-semibold leading-tight">Platform Administration</h1>
        <p className="text-[15.5px] text-muted-foreground mt-1.5">Manage members, learning, communications, and platform settings.</p>
      </div>

      <div className="grid md:grid-cols-[230px_1fr] gap-6 items-start">
        {/* ── Left sub-navigation rail ── */}
        <aside className="space-y-4">
          {ADMIN_NAV.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = item.id === activeTab;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-foreground/70 hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {gi < ADMIN_NAV.length - 1 && <div className="border-t border-border mt-4" />}
            </div>
          ))}
        </aside>

        {/* ── Content area ── */}
        <div className="space-y-4 min-w-0">
          <div className="opa-card rounded-lg border bg-card px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">{active.label}</h2>
            <p className="text-sm text-muted-foreground">{active.description}</p>
          </div>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────
function OverviewTab() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  const statItems: StatStripItem[] = [
    { label: "Total Users", value: isLoading ? "…" : stats?.users ?? 0, icon: Users, hue: CATEGORY_HUES[0] },
    { label: "Content Nodes", value: isLoading ? "…" : stats?.content ?? 0, icon: FileText, hue: CATEGORY_HUES[1] },
    { label: "Capabilities", value: isLoading ? "…" : stats?.capabilities ?? 0, icon: Layers, hue: CATEGORY_HUES[2] },
    { label: "Vendors", value: isLoading ? "…" : stats?.vendors ?? 0, icon: Building2, hue: CATEGORY_HUES[3] },
    { label: "Projects", value: isLoading ? "…" : stats?.projects ?? 0, icon: FolderKanban, hue: CATEGORY_HUES[4] },
    { label: "Pending Review", value: isLoading ? "…" : stats?.pendingReview ?? 0, icon: Clock, hue: CATEGORY_HUES[3] },
  ];

  return <StatStrip items={statItems} />;
}

// ─── Users Tab ──────────────────────────────────────────────────────
function UsersTab() {
  const { data: users, isLoading, refetch } = trpc.admin.users.list.useQuery();
  const updateRole = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => { toast.success("Role updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updatePlatformRole = trpc.admin.users.updatePlatformRole.useMutation({
    onSuccess: () => { toast.success("Platform role updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading users...</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-heading text-[19px] font-semibold">All Users ({users?.length ?? 0})</h3>
      <div className="opa-card rounded-lg border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>System Role</TableHead>
              <TableHead className="hidden md:table-cell">Platform Role</TableHead>
              <TableHead className="hidden lg:table-cell">Reputation</TableHead>
              <TableHead className="hidden lg:table-cell">Last Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="whitespace-normal">
                  <div className="font-medium">{u.name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{u.email || "No email"}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{u.email || "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-xs">{u.platformRole || "Not set"}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{u.reputationScore ?? 0}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                  {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Select
                      value={u.role}
                      onValueChange={(val) => updateRole.mutate({ userId: u.id, role: val as "user" | "admin" })}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={u.platformRole || "none"}
                      onValueChange={(val) => {
                        if (val !== "none") updatePlatformRole.mutate({ userId: u.id, platformRole: val as any });
                      }}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs hidden md:flex">
                        <SelectValue placeholder="Set role" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Moderation Tab ─────────────────────────────────────────────────
function ModerationTab() {
  const { data: pending, isLoading, refetch } = trpc.admin.moderation.pending.useQuery();
  const approve = trpc.admin.moderation.approve.useMutation({
    onSuccess: () => { toast.success("Content approved and published"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const reject = trpc.admin.moderation.reject.useMutation({
    onSuccess: () => { toast.success("Content rejected"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading moderation queue...</div>;

  if (!pending || pending.length === 0) {
    return (
      <Card className="opa-card">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: CATEGORY_COLORS.teal.solid }} />
          <h3 className="font-heading text-lg font-semibold mb-1">Queue Clear</h3>
          <p className="text-muted-foreground">No content pending review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5" style={{ color: CATEGORY_COLORS.amber.solid }} />
        <h3 className="font-heading text-[19px] font-semibold">{pending.length} item{pending.length !== 1 ? "s" : ""} pending review</h3>
      </div>
      {pending.map((item: any) => (
        <Card key={item.id} className="opa-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>
                  {item.type} &middot; by user #{item.authorId} &middot; {new Date(item.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                style={{ background: CATEGORY_COLORS.amber.bg, color: CATEGORY_COLORS.amber.text }}
              >
                Pending Review
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {item.summary && <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>}
            {item.body && (
              <div className="bg-muted/30 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto text-sm">
                <Streamdown>{item.body}</Streamdown>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => approve.mutate({ id: item.id })}
                disabled={approve.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />Approve & Publish
              </Button>
              <Dialog open={rejectId === item.id} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRejectId(item.id)}>
                    <XCircle className="w-4 h-4 mr-1.5" />Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Content</DialogTitle>
                    <DialogDescription>Provide a reason for rejecting "{item.title}".</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Label>Reason</Label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain why this content is being rejected..."
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (rejectReason.trim()) {
                          reject.mutate({ id: item.id, reason: rejectReason });
                          setRejectId(null);
                          setRejectReason("");
                        }
                      }}
                      disabled={!rejectReason.trim() || reject.isPending}
                    >
                      Reject
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Courses Tab ────────────────────────────────────────────────────
function CoursesTab() {
  const utils = trpc.useUtils();
  const coursesQuery = trpc.coursesLive.list.useQuery({});
  const courses = (coursesQuery.data ?? []) as any[];
  const [editing, setEditing] = useState<any | null>(null);

  const reorderMutation = trpc.coursesAdmin.reorder.useMutation({
    onSuccess: () => {
      utils.coursesLive.list.invalidate();
      utils.courses.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const moveCourse = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= courses.length) return;
    const newOrder = [...courses];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    await reorderMutation.mutateAsync({ courseIds: newOrder.map(c => c.id) });
  };

  const statusBadge = (status: string) => {
    if (status === "published") return <Badge className="text-xs bg-green-600 text-white">Published</Badge>;
    if (status === "coming_soon") return <Badge className="text-xs bg-amber-500/20 text-amber-700 border border-amber-500/30">Coming Soon</Badge>;
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };
  const levelBadge = (level: string | null) => {
    if (!level) return null;
    const tone = level === "beginner" ? "bg-green-500/10 text-green-700 border-green-500/30" :
      level === "advanced" ? "bg-red-500/10 text-red-700 border-red-500/30" :
      "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
    return <Badge variant="outline" className={`text-xs ${tone}`}>{level}</Badge>;
  };

  if (coursesQuery.isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading courses…</div>;
  }
  if (courses.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">No courses yet.</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Reorder with the arrows. Edit a course (pencil) to change status, level, category, etc. Lesson and quiz authoring live behind the buttons on the right.
      </p>
      <div className="grid gap-3">
        {courses.map((course, i) => (
          <Card key={course.id} className="opa-card">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  disabled={i === 0 || reorderMutation.isPending}
                  onClick={() => moveCourse(i, -1)}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  disabled={i === courses.length - 1 || reorderMutation.isPending}
                  onClick={() => moveCourse(i, 1)}>
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold">{course.title}</span>
                  {statusBadge(course.status)}
                  {levelBadge(course.level)}
                  {course.category && <Badge variant="outline" className="text-xs">{course.category}</Badge>}
                  {course.isFree && <Badge className="text-xs bg-emerald-600/15 text-emerald-700 border border-emerald-600/30">Free</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">/{course.slug} · {course.duration ?? "—"} · {course.lessonCount ?? 0} lessons</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(course)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Link href={`/admin/courses/${course.slug}/lessons`}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-md hover:bg-muted">
                <BookOpen className="w-4 h-4" /> Lessons &amp; quizzes
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && <CourseEditDialog course={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CourseEditDialog({ course, onClose }: { course: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(course.title ?? "");
  const [slug, setSlug] = useState(course.slug ?? "");
  const [description, setDescription] = useState(course.description ?? "");
  const [excerpt, setExcerpt] = useState(course.excerpt ?? "");
  const [level, setLevel] = useState<string>(course.level ?? "beginner");
  const [category, setCategory] = useState(course.category ?? "");
  const [status, setStatus] = useState<string>(course.status ?? "draft");
  const [isFree, setIsFree] = useState<boolean>(!!course.isFree);
  const [duration, setDuration] = useState(course.duration ?? "");
  const [lessonCount, setLessonCount] = useState<number>(course.lessonCount ?? 0);
  const [busy, setBusy] = useState(false);

  const updateMutation = trpc.coursesAdmin.update.useMutation();

  const save = async () => {
    setBusy(true);
    try {
      await updateMutation.mutateAsync({
        courseId: course.id,
        title, slug, description, excerpt,
        level: level as any, status: status as any,
        category: category || null,
        isFree, duration: duration || null,
        lessonCount,
      });
      toast.success("Course updated");
      utils.coursesLive.list.invalidate();
      utils.courses.list.invalidate();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit course: {course.title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ce-title">Title</Label>
              <Input id="ce-title" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-slug">Slug</Label>
              <Input id="ce-slug" value={slug} onChange={e => setSlug(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ce-excerpt">Excerpt (catalog teaser)</Label>
            <Textarea id="ce-excerpt" value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ce-desc">Description</Label>
            <Textarea id="ce-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ce-cat">Category</Label>
              <Input id="ce-cat" value={category} onChange={e => setCategory(e.target.value)} placeholder="Foundations, Architecture, …" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-dur">Duration</Label>
              <Input id="ce-dur" value={duration} onChange={e => setDuration(e.target.value)} placeholder="3h 20m" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-lc">Lesson count</Label>
              <Input id="ce-lc" type="number" min={0} value={lessonCount} onChange={e => setLessonCount(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="ce-free" type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} />
            <Label htmlFor="ce-free" className="cursor-pointer">Free course (no Pro gate)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Import Tab ────────────────────────────────────────────────
// Per-course CSV import for lessons (shells, no video) and quiz questions.
// The quiz import is also available inline from /admin/courses/<slug>/lessons.

const LESSON_CSV_SAMPLE = `title,slug,description,supplement_markdown,is_published,display_order
Welcome & Context,welcome-context,Why Open Process Automation exists and the industry pain it addresses.,"## Further reading\\n- Book Ch. 1",false,0
O-PAS Fundamentals,o-pas-fundamentals,The O-PAS standard at a glance: OPAF, OCF, DCN, ACP.,"",false,1
Architecture Foundations,architecture-foundations,DCN + ACP architecture and the OPC UA backbone.,"",false,2
OPA in Practice,opa-in-practice,Vendor selection, migration phasing, IEC 62443 alignment.,"",false,3
Business Value & Next Steps,business-value-next-steps,ROI framing and what to do after this course.,"",false,4`;

const QUIZ_CSV_SAMPLE = `lesson_slug,question,option_1,option_2,option_3,option_4,correct,explanation
welcome-context,What is the primary goal of Open Process Automation?,Vendor lock-in,Open interoperability,Cost reduction,Faster commissioning,2,Vendor-neutral interoperability is the core goal.
o-pas-fundamentals,What does O-PAS stand for?,Open Process Automation Standard,Operational Process Architecture System,Open Plant Automation Software,Optimized Process Application Suite,1,O-PAS is the Open Process Automation Standard.`;

type LessonParsedRow = {
  title: string;
  slug: string;
  description?: string;
  supplementMarkdown?: string;
  isPublished?: boolean;
  displayOrder?: number;
};

type QuizParsedRow = {
  lessonSlug: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

type ImportPreview<T> = {
  rows: T[];
  errors: { rowNumber: number; message: string }[];
};

function parseLessonCsv(csv: string): ImportPreview<LessonParsedRow> {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true, skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  });
  const rows: LessonParsedRow[] = [];
  const errors: ImportPreview<LessonParsedRow>["errors"] = [];
  const slugsSeen = new Set<string>();
  parsed.errors.forEach(e => errors.push({ rowNumber: (e.row ?? 0) + 2, message: e.message }));
  parsed.data.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const title = (raw["title"] ?? "").trim();
    const slug = (raw["slug"] ?? "").trim();
    const description = (raw["description"] ?? "").trim() || undefined;
    const supplementMarkdown = (raw["supplement_markdown"] ?? "").trim() || undefined;
    const isPublishedRaw = (raw["is_published"] ?? "").trim().toLowerCase();
    const displayOrderRaw = (raw["display_order"] ?? "").trim();
    if (!title) { errors.push({ rowNumber, message: "title is empty" }); return; }
    if (!slug) { errors.push({ rowNumber, message: "slug is empty" }); return; }
    if (slugsSeen.has(slug)) { errors.push({ rowNumber, message: `slug "${slug}" appears twice in this CSV` }); return; }
    slugsSeen.add(slug);
    const isPublished = isPublishedRaw === "true" || isPublishedRaw === "yes" || isPublishedRaw === "1";
    const displayOrder = displayOrderRaw ? parseInt(displayOrderRaw, 10) : undefined;
    if (displayOrderRaw && !Number.isFinite(displayOrder)) {
      errors.push({ rowNumber, message: `display_order must be a number (got "${displayOrderRaw}")` }); return;
    }
    rows.push({ title, slug, description, supplementMarkdown, isPublished, displayOrder });
  });
  return { rows, errors };
}

function parseQuizCsvForAdmin(csv: string, validSlugs: Set<string>): ImportPreview<QuizParsedRow> & { byLesson: Record<string, number> } {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true, skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  });
  const rows: QuizParsedRow[] = [];
  const errors: ImportPreview<QuizParsedRow>["errors"] = [];
  const byLesson: Record<string, number> = {};
  parsed.errors.forEach(e => errors.push({ rowNumber: (e.row ?? 0) + 2, message: e.message }));
  parsed.data.forEach((raw, idx) => {
    const rowNumber = idx + 2;
    const lessonSlug = (raw["lesson_slug"] ?? "").trim();
    const question = (raw["question"] ?? "").trim();
    const explanation = (raw["explanation"] ?? "").trim() || undefined;
    const options = [
      (raw["option_1"] ?? "").trim(), (raw["option_2"] ?? "").trim(),
      (raw["option_3"] ?? "").trim(), (raw["option_4"] ?? "").trim(),
    ].filter(o => o.length > 0);
    const correctOne = parseInt((raw["correct"] ?? "").trim(), 10);
    if (!lessonSlug) { errors.push({ rowNumber, message: "lesson_slug is empty" }); return; }
    if (!validSlugs.has(lessonSlug)) { errors.push({ rowNumber, message: `lesson_slug "${lessonSlug}" not found in this course` }); return; }
    if (!question) { errors.push({ rowNumber, message: "question is empty" }); return; }
    if (options.length < 2) { errors.push({ rowNumber, message: "at least 2 options required" }); return; }
    if (!Number.isFinite(correctOne) || correctOne < 1 || correctOne > options.length) {
      errors.push({ rowNumber, message: `correct must be 1–${options.length}` }); return;
    }
    rows.push({ lessonSlug, question, options, correctIndex: correctOne - 1, explanation });
    byLesson[lessonSlug] = (byLesson[lessonSlug] ?? 0) + 1;
  });
  return { rows, errors, byLesson };
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function BulkImportTab() {
  const utils = trpc.useUtils();
  const coursesQuery = trpc.coursesLive.list.useQuery({});
  const courses = (coursesQuery.data ?? []) as any[];
  const [courseId, setCourseId] = useState<number | null>(null);

  const course = courses.find(c => c.id === courseId) ?? null;
  const lessonsForCourse = trpc.lessonsAdmin.list.useQuery(
    { courseId: courseId ?? 0 },
    { enabled: !!courseId },
  );
  const lessonSlugs = (lessonsForCourse.data ?? []).map((l: any) => l.slug);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Choose a course</Label>
        <Select value={courseId ? String(courseId) : ""} onValueChange={(v) => setCourseId(parseInt(v))}>
          <SelectTrigger className="max-w-md"><SelectValue placeholder="Pick a course to import into" /></SelectTrigger>
          <SelectContent>
            {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!course ? (
        <Card className="opa-card">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Pick a course above to import lessons or quiz questions.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <LessonImportPanel
            courseId={course.id}
            courseSlug={course.slug}
            onSuccess={() => {
              utils.lessonsAdmin.list.invalidate({ courseId: course.id });
              utils.coursesLive.list.invalidate();
            }}
          />
          <QuizImportPanel
            courseId={course.id}
            lessonSlugs={lessonSlugs}
            onSuccess={() => {
              utils.quiz.lessonQuizMap.invalidate({ courseId: course.id });
            }}
          />
        </div>
      )}
    </div>
  );
}

function LessonImportPanel({ courseId, courseSlug, onSuccess }: { courseId: number; courseSlug: string; onSuccess: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ImportPreview<LessonParsedRow> | null>(null);
  const importMutation = trpc.lessonsAdmin.importLessons.useMutation();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCsvText(String(reader.result ?? "")); setPreview(null); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doImport = async () => {
    if (!preview || preview.errors.length > 0 || preview.rows.length === 0) return;
    try {
      const r = await importMutation.mutateAsync({ courseId, rows: preview.rows });
      toast.success(`Imported ${r.imported} lesson${r.imported === 1 ? "" : "s"}` + (r.skipped.length > 0 ? `, ${r.skipped.length} skipped` : ""));
      if (r.skipped.length > 0) {
        r.skipped.slice(0, 3).forEach(s => toast.warning(`Skipped "${s.slug}": ${s.reason}`));
      }
      onSuccess();
      setCsvText(""); setPreview(null);
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  };

  const canImport = preview && preview.errors.length === 0 && preview.rows.length > 0;

  return (
    <Card className="opa-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Import lessons
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Creates lesson shells (no video). Required columns: <code>title</code>, <code>slug</code>. Optional:{" "}
          <code>description</code>, <code>supplement_markdown</code>, <code>is_published</code>, <code>display_order</code>.
          Existing slugs are skipped, not overwritten.
        </p>
        <Button variant="outline" size="sm" onClick={() => downloadCsv(`${courseSlug}-lessons-sample.csv`, LESSON_CSV_SAMPLE)}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Sample CSV
        </Button>
        <Textarea
          value={csvText}
          onChange={e => { setCsvText(e.target.value); setPreview(null); }}
          placeholder={"title,slug,description,...\n…"}
          className="font-mono text-xs"
          rows={6}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <label className="cursor-pointer hover:text-foreground">
            <FileSpreadsheet className="inline w-3.5 h-3.5 mr-1" /> upload .csv
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </label>
          <Button variant="outline" size="sm" onClick={() => setPreview(parseLessonCsv(csvText))} disabled={!csvText.trim()}>Preview</Button>
        </div>
        {preview && (
          <ImportPreviewPanel
            valid={preview.rows.length}
            errors={preview.errors}
            summary={preview.rows.length > 0 ? `${preview.rows.length} new lesson${preview.rows.length === 1 ? "" : "s"} will be created` : "No valid rows to import"}
          />
        )}
        <Button onClick={doImport} disabled={!canImport || importMutation.isPending} className="w-full">
          {importMutation.isPending ? "Importing…" : preview ? `Import ${preview.rows.length} lesson${preview.rows.length === 1 ? "" : "s"}` : "Import"}
        </Button>
      </CardContent>
    </Card>
  );
}

function QuizImportPanel({ courseId, lessonSlugs, onSuccess }: { courseId: number; lessonSlugs: string[]; onSuccess: () => void }) {
  const [csvText, setCsvText] = useState("");
  const validSlugs = useMemo(() => new Set(lessonSlugs), [lessonSlugs]);
  const [preview, setPreview] = useState<ReturnType<typeof parseQuizCsvForAdmin> | null>(null);
  const importMutation = trpc.quizAdmin.importQuestions.useMutation();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCsvText(String(reader.result ?? "")); setPreview(null); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doImport = async () => {
    if (!preview || preview.errors.length > 0 || preview.rows.length === 0) return;
    try {
      const r = await importMutation.mutateAsync({ courseId, rows: preview.rows });
      toast.success(`Imported ${r.imported} question${r.imported === 1 ? "" : "s"} across ${Object.keys(r.byLesson).length} lesson${Object.keys(r.byLesson).length === 1 ? "" : "s"}`);
      onSuccess();
      setCsvText(""); setPreview(null);
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    }
  };

  const canImport = preview && preview.errors.length === 0 && preview.rows.length > 0;

  return (
    <Card className="opa-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Import quiz questions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Columns: <code>lesson_slug</code>, <code>question</code>, <code>option_1</code>–<code>option_4</code>, <code>correct</code> (1-indexed), <code>explanation</code> (optional). Appends; auto-creates per-lesson quiz at score 70.
        </p>
        <Button variant="outline" size="sm" onClick={() => downloadCsv("quiz-questions-sample.csv", QUIZ_CSV_SAMPLE)}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Sample CSV
        </Button>
        <Textarea
          value={csvText}
          onChange={e => { setCsvText(e.target.value); setPreview(null); }}
          placeholder={"lesson_slug,question,option_1,...\n…"}
          className="font-mono text-xs"
          rows={6}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <label className="cursor-pointer hover:text-foreground">
            <FileSpreadsheet className="inline w-3.5 h-3.5 mr-1" /> upload .csv
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </label>
          <Button variant="outline" size="sm" onClick={() => setPreview(parseQuizCsvForAdmin(csvText, validSlugs))} disabled={!csvText.trim() || lessonSlugs.length === 0}>Preview</Button>
        </div>
        {lessonSlugs.length === 0 && (
          <p className="text-xs text-yellow-700 dark:text-yellow-500">Course has no lessons yet — import lessons first.</p>
        )}
        {preview && (
          <ImportPreviewPanel
            valid={preview.rows.length}
            errors={preview.errors}
            summary={preview.rows.length > 0 ? Object.entries(preview.byLesson).map(([s, n]) => `${s}: +${n}`).join(" · ") : "No valid rows to import"}
          />
        )}
        <Button onClick={doImport} disabled={!canImport || importMutation.isPending} className="w-full">
          {importMutation.isPending ? "Importing…" : preview ? `Import ${preview.rows.length} question${preview.rows.length === 1 ? "" : "s"}` : "Import"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ImportPreviewPanel({ valid, errors, summary }: { valid: number; errors: { rowNumber: number; message: string }[]; summary: string }) {
  if (errors.length === 0) {
    return (
      <div className="border border-green-500/40 bg-green-500/5 rounded p-2 space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Check className="w-4 h-4 text-green-600" /> {valid} valid row{valid === 1 ? "" : "s"}
        </div>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>
    );
  }
  return (
    <div className="border border-destructive/40 bg-destructive/5 rounded p-2 space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 text-destructive" /> {errors.length} error{errors.length === 1 ? "" : "s"} — fix CSV first
      </div>
      <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
        {errors.slice(0, 10).map((e, i) => (
          <li key={i}><span className="font-mono text-muted-foreground">Row {e.rowNumber}:</span> {e.message}</li>
        ))}
        {errors.length > 10 && <li className="text-muted-foreground">…and {errors.length - 10} more</li>}
      </ul>
    </div>
  );
}

// ─── Email Blast Tab ────────────────────────────────────────────────
function EmailBlastTab() {
  const utils = trpc.useUtils();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const recipientCountQuery = trpc.admin.blastRecipientCount.useQuery();
  const blastsQuery = trpc.admin.listBlasts.useQuery();
  const recipientCount = recipientCountQuery.data?.count ?? 0;

  const testMutation = trpc.admin.sendBlastTest.useMutation({
    onSuccess: (r) => toast.success(`Test sent to ${r.sentTo}`),
    onError: (e) => toast.error(e.message),
  });
  const sendMutation = trpc.admin.sendBlast.useMutation({
    onSuccess: (r) => {
      toast.success(`Sent to ${r.sentCount}/${r.recipientCount}` + (r.failedCount > 0 ? ` · ${r.failedCount} failed` : ""));
      setSubject(""); setBody("");
      utils.admin.listBlasts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="opa-card">
          <CardHeader>
            <CardTitle className="text-base">Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="blast-subject">Subject</Label>
              <Input id="blast-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder={`${CLUB_NAME} — May update`} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blast-body">Body (Markdown)</Label>
              <Textarea
                id="blast-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder={"## Hello\n\nWe're back online and the first course is live...\n\n- Bullet one\n- Bullet two\n\n[Visit the platform](https://app.opacommunity.com)"}
              />
              <p className="text-xs text-muted-foreground">
                Sends to <strong>{recipientCount}</strong> member{recipientCount === 1 ? "" : "s"} who haven't opted out of digest email.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate({ subject, bodyMarkdown: body })}
                disabled={!canSend || testMutation.isPending}
              >
                {testMutation.isPending ? "Sending…" : "Send test to me"}
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend || sendMutation.isPending || recipientCount === 0}
              >
                {sendMutation.isPending ? "Sending…" : `Send to all (${recipientCount})`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="opa-card">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded p-4 min-h-[200px]">
              <div className="font-semibold text-sm border-b pb-2 mb-3">{subject || <span className="text-muted-foreground">(no subject)</span>}</div>
              {body.trim() ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Start typing to see a preview.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="text-base">Recent blasts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(blastsQuery.data ?? []).length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No blasts sent yet.</div>
          ) : (
            <ul className="divide-y">
              {(blastsQuery.data ?? []).map((b: any) => (
                <li key={b.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{b.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(b.sentAt).toLocaleString()} · by {b.sentByName ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="text-green-600 font-medium">{b.sentCount} sent</span>
                    {b.failedCount > 0 && <span className="text-destructive ml-2">{b.failedCount} failed</span>}
                    <span className="text-muted-foreground ml-2">/ {b.recipientCount} recipients</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to all {recipientCount} members?</AlertDialogTitle>
            <AlertDialogDescription>
              This emails "<strong>{subject}</strong>" to every member who hasn't opted out of digest email.
              It can't be unsent. Consider sending a test to yourself first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { sendMutation.mutate({ subject, bodyMarkdown: body }); setConfirmOpen(false); }}
            >
              Send to {recipientCount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Seed Data Tab ──────────────────────────────────────────────────
function SeedDataTab() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <CapabilitySeedPanel />
      <VendorSeedPanel />
      <ArchComponentSeedPanel />
      <ForumCategorySeedPanel />
      <TagSeedPanel />
    </div>
  );
}

function CapabilitySeedPanel() {
  const { data: caps, refetch } = trpc.capabilities.list.useQuery();
  const createCap = trpc.capabilities.create.useMutation({
    onSuccess: () => { toast.success("Capability created"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateCap = trpc.admin.capabilities.update.useMutation({
    onSuccess: () => { toast.success("Capability updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCap = trpc.admin.capabilities.delete.useMutation({
    onSuccess: () => { toast.success("Capability deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [layer, setLayer] = useState("");

  return (
    <Card className="opa-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Capabilities</CardTitle>
            <CardDescription>{caps?.length ?? 0} capabilities defined</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-1" />{showCreate ? "Cancel" : "Add"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCreate && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} placeholder="e.g. DCN Connectivity" />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="dcn-connectivity" />
              </div>
            </div>
            <div>
              <Label className="text-xs">O-PAS Layer</Label>
              <Select value={layer} onValueChange={setLayer}>
                <SelectTrigger><SelectValue placeholder="Select layer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physical">Physical</SelectItem>
                  <SelectItem value="Connectivity">Connectivity</SelectItem>
                  <SelectItem value="Runtime">Runtime</SelectItem>
                  <SelectItem value="Application">Application</SelectItem>
                  <SelectItem value="Information">Information</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="System Management">System Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Brief description..." />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (name && slug) {
                  createCap.mutate({ name, slug, description: desc || undefined, opasLayer: layer || undefined });
                  setName(""); setSlug(""); setDesc(""); setLayer(""); setShowCreate(false);
                }
              }}
              disabled={!name || !slug || createCap.isPending}
            >
              Create Capability
            </Button>
          </div>
        )}
        <div className="max-h-80 overflow-y-auto space-y-1">
          {caps?.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/30 group">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.opasLayer || "General"}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={() => deleteCap.mutate({ id: c.id })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {(!caps || caps.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No capabilities yet. Add your first one above.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VendorSeedPanel() {
  const { data: vendors, refetch } = trpc.vendors.list.useQuery();
  const createVendor = trpc.vendors.create.useMutation({
    onSuccess: () => { toast.success("Vendor created"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteVendor = trpc.admin.vendors.delete.useMutation({
    onSuccess: () => { toast.success("Vendor deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [website, setWebsite] = useState("");

  return (
    <Card className="opa-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Vendors</CardTitle>
            <CardDescription>{vendors?.length ?? 0} vendor entries</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-1" />{showCreate ? "Cancel" : "Add"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCreate && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} placeholder="e.g. Honeywell" />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (name && slug) {
                  createVendor.mutate({ name, slug, description: desc || undefined, website: website || undefined });
                  setName(""); setSlug(""); setDesc(""); setWebsite(""); setShowCreate(false);
                }
              }}
              disabled={!name || !slug || createVendor.isPending}
            >
              Create Vendor
            </Button>
          </div>
        )}
        <div className="max-h-80 overflow-y-auto space-y-1">
          {vendors?.map((v: any) => (
            <div key={v.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/30 group">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{v.name}</p>
                <p className="text-xs text-muted-foreground">{v.website || "No website"}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={() => deleteVendor.mutate({ id: v.id })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {(!vendors || vendors.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">No vendors yet. Add your first one above.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ArchComponentSeedPanel() {
  const { data: components, refetch } = trpc.architecture.components.useQuery();
  const createComponent = trpc.admin.archComponents.create.useMutation({
    onSuccess: () => { toast.success("Component created"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteComponent = trpc.admin.archComponents.delete.useMutation({
    onSuccess: () => { toast.success("Component deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"dcn" | "runtime" | "network" | "controller" | "gateway" | "sensor" | "actuator">("dcn");
  const [desc, setDesc] = useState("");
  const [layer, setLayer] = useState("");

  return (
    <Card className="opa-card md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Architecture Components</CardTitle>
            <CardDescription>{components?.length ?? 0} components for the Architecture Builder</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-1" />{showCreate ? "Cancel" : "Add"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCreate && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. OPC UA Server" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dcn">DCN</SelectItem>
                    <SelectItem value="runtime">Runtime</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="controller">Controller</SelectItem>
                    <SelectItem value="gateway">Gateway</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                    <SelectItem value="actuator">Actuator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">O-PAS Layer</Label>
              <Select value={layer} onValueChange={setLayer}>
                <SelectTrigger><SelectValue placeholder="Select layer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physical">Physical</SelectItem>
                  <SelectItem value="Connectivity">Connectivity</SelectItem>
                  <SelectItem value="Runtime">Runtime</SelectItem>
                  <SelectItem value="Application">Application</SelectItem>
                  <SelectItem value="Information">Information</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="System Management">System Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (name.trim()) {
                  createComponent.mutate({ name, type, description: desc || undefined, opasLayer: layer || undefined });
                  setName(""); setType("dcn"); setDesc(""); setLayer(""); setShowCreate(false);
                }
              }}
              disabled={!name.trim() || createComponent.isPending}
            >
              Create Component
            </Button>
          </div>
        )}
        <div className="max-h-60 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {components?.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded bg-muted/20 text-sm group">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-xs shrink-0">{c.type}</Badge>
                  <span className="truncate">{c.name}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                  onClick={() => deleteComponent.mutate({ id: c.id })}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          {(!components || components.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No architecture components yet. Add components for the Architecture Builder.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Digest Tab ─────────────────────────────────────────────────────
function DigestTab() {
  const { data: preview, isLoading, refetch: refetchPreview } = trpc.digest.preview.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.digest.history.useQuery({ limit: 10 });
  const sendDigest = trpc.digest.send.useMutation({
    onSuccess: (data) => {
      toast.success(`Digest sent to ${data.subscriberCount} member(s)`);
      refetchPreview();
      refetchHistory();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card className="opa-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Weekly Community Digest</CardTitle>
              <CardDescription>
                Send a weekly digest to all opted-in members via in-app notifications.
                {preview && ` Period: ${new Date(preview.period.from).toLocaleDateString()} – ${new Date(preview.period.to).toLocaleDateString()}`}
              </CardDescription>
            </div>
            <div className="text-right">
              {preview && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{preview.subscriberCount}</span> opted-in members
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : preview ? (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{preview.stats.users}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-blue-500">{preview.discussions.length}</p>
                  <p className="text-xs text-muted-foreground">New Discussions</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-emerald-500">{preview.blogPosts.length}</p>
                  <p className="text-xs text-muted-foreground">New Blog Posts</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-500">{preview.newMembers.length}</p>
                  <p className="text-xs text-muted-foreground">New Members</p>
                </div>
              </div>

              {/* Discussions */}
              {preview.discussions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    Top Discussions This Week
                  </h4>
                  <div className="space-y-1.5">
                    {preview.discussions.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{d.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{d.replyCount} replies</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blog Posts */}
              {preview.blogPosts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    New Blog Posts
                  </h4>
                  <div className="space-y-1.5">
                    {preview.blogPosts.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{p.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">by {p.authorName ?? "Unknown"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Events */}
              {preview.upcomingEvents.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    Upcoming Events
                  </h4>
                  <div className="space-y-1.5">
                    {preview.upcomingEvents.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{e.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{new Date(e.startDate).toLocaleDateString()}</span>
                        {e.isVirtual && <Badge variant="outline" className="text-xs shrink-0">Virtual</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Members */}
              {preview.newMembers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    New Members
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {preview.newMembers.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-1.5 text-sm bg-muted/30 rounded px-2 py-1">
                        <span className="font-medium">{m.name ?? "New Member"}</span>
                        {m.organization && <span className="text-xs text-muted-foreground">({m.organization})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.discussions.length === 0 && preview.blogPosts.length === 0 && preview.newMembers.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No new community activity this week.</p>
                </div>
              )}
            </>
          ) : null}

          <div className="pt-3 border-t flex items-center gap-3">
            <Button
              onClick={() => sendDigest.mutate()}
              disabled={sendDigest.isPending}
            >
              <Send className="w-4 h-4 mr-1.5" />
              {sendDigest.isPending ? "Sending..." : "Send Digest Now"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sends an in-app notification to all opted-in members ({preview?.subscriberCount ?? 0} recipients).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Send History */}
      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="text-base">Send History</CardTitle>
          <CardDescription>Recent digest sends and their reach.</CardDescription>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No digests sent yet.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{new Date(h.sentAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {h.newDiscussions} discussions · {h.newBlogPosts} posts · {h.upcomingEvents} events · {h.newMembers} new members
                    </p>
                  </div>
                  <Badge variant="secondary">{h.recipientCount} sent</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Forum Category Seed Panel ──────────────────────────────────────
function ForumCategorySeedPanel() {
  const { data: categories, refetch } = trpc.categories.list.useQuery();
  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => { toast.success("Forum category created"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("");

  return (
    <Card className="opa-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Forum Categories</CardTitle>
            <CardDescription>{categories?.length ?? 0} categories defined</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-1" />{showCreate ? "Cancel" : "Add"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showCreate && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} placeholder="e.g. System Architecture" />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="system-architecture" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Icon (emoji)</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🏗️" maxLength={2} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Brief description..." />
            </div>
            <Button
              onClick={() => {
                if (!name || !slug) return toast.error("Name and slug required");
                createCategory.mutate({ name, slug, description: desc, icon, displayOrder: 0 });
                setName(""); setSlug(""); setDesc(""); setIcon(""); setShowCreate(false);
              }}
              disabled={createCategory.isPending}
            >
              {createCategory.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        )}
        {categories?.map((c: any, idx: number) => (
          <div key={c.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <div className="flex items-center gap-2">
              {c.icon && <span className="text-lg">{c.icon}</span>}
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.slug}</p>
              </div>
            </div>
          </div>
        ))}
        {(!categories || categories.length === 0) && !showCreate && (
          <p className="text-sm text-muted-foreground text-center py-4">No categories yet. Add your first one above.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── FCA Import Tab ─────────────────────────────────────────────────
function FcaImportTab() {
  const [membersJson, setMembersJson] = useState("");
  const [postsJson, setPostsJson] = useState("");
  const [postType, setPostType] = useState<"discussion" | "blog">("discussion");
  const [memberResult, setMemberResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [postResult, setPostResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [memberDryRun, setMemberDryRun] = useState(true);
  const [postDryRun, setPostDryRun] = useState(true);

  const { data: categories } = trpc.fcaImport.getCategories.useQuery();
  const [fallbackCategoryId, setFallbackCategoryId] = useState<number | undefined>();

  const importMembers = trpc.fcaImport.importMembers.useMutation({
    onSuccess: (data) => {
      setMemberResult(data);
      toast.success(`Members: ${data.created} ${memberDryRun ? "would be created" : "created"}, ${data.skipped} skipped`);
    },
    onError: (e) => toast.error(e.message),
  });

  const importPosts = trpc.fcaImport.importPosts.useMutation({
    onSuccess: (data) => {
      setPostResult(data);
      toast.success(`Posts: ${data.created} ${postDryRun ? "would be created" : "created"}, ${data.skipped} skipped`);
    },
    onError: (e) => toast.error(e.message),
  });

  function parseCsv(raw: string): any[] {
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    // Handle BOM
    const headerLine = lines[0].replace(/^\uFEFF/, '');
    // Parse CSV header respecting quoted fields
    const headers = parseCsvLine(headerLine);
    const rows: any[] = [];
    let i = 1;
    while (i < lines.length) {
      // Handle multi-line quoted fields
      let line = lines[i];
      while (countQuotes(line) % 2 !== 0 && i + 1 < lines.length) {
        i++;
        line += '\n' + lines[i];
      }
      const values = parseCsvLine(line);
      if (values.length >= 2) {
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
        rows.push(row);
      }
      i++;
    }
    return rows;
  }

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current);
    return result;
  }

  function countQuotes(s: string): number {
    let count = 0;
    for (const ch of s) if (ch === '"') count++;
    return count;
  }

  function parseInput(raw: string): any[] {
    const trimmed = raw.trim();
    // Detect CSV: first line has commas and no { or [
    if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[') && trimmed.includes(',')) {
      const rows = parseCsv(trimmed);
      if (rows.length > 0) return rows;
    }
    // Try JSON
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      // Handle wrapper objects: { items: [...] }, { data: [...] }, { members: [...] }, { posts: [...] }
      return parsed.items ?? parsed.data ?? parsed.members ?? parsed.posts ?? [];
    } catch {
      toast.error("Could not parse input — please paste valid JSON or CSV");
      return [];
    }
  }

  function handleFileUpload(setter: (v: string) => void) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setter(ev.target?.result as string ?? "");
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            FluentCommunity (FCA) Data Import
          </CardTitle>
          <CardDescription>
            Import members and posts exported from FCA Content Manager Pro (CSV or JSON format).
            Always run a <strong>Dry Run</strong> first to preview what will be imported before committing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <div>
                <p className="font-medium">Export from FCA</p>
                <p className="text-muted-foreground text-xs">Use FCA Content Manager Pro → Export → Members/Posts → JSON</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <div>
                <p className="font-medium">Paste or Upload JSON</p>
                <p className="text-muted-foreground text-xs">Paste the exported JSON below or click Upload File</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <div>
                <p className="font-medium">Dry Run → Execute</p>
                <p className="text-muted-foreground text-xs">Preview counts, then uncheck Dry Run and import for real</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Import */}
      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> Member Import
          </CardTitle>
          <CardDescription>
            Imports members as new OCOS accounts. Each imported member receives a 7-day password reset link so they can set their own password on first login. Existing emails are skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleFileUpload(setMembersJson)}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload File
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMembersJson("")}>Clear</Button>
          </div>
          <Textarea
            value={membersJson}
            onChange={(e) => setMembersJson(e.target.value)}
            placeholder={`Paste members data here (JSON or CSV).\nSupported formats:\n• WebToffee CSV export (user_email, display_name columns)\n• FCA space-users JSON export ({ items: [...] })\n• Simple JSON array: [{ "email": "user@example.com", "display_name": "Jane" }]`}
            rows={6}
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={memberDryRun}
                onChange={(e) => setMemberDryRun(e.target.checked)}
                className="rounded"
              />
              Dry Run (preview only — no changes saved)
            </label>
            <Button
              onClick={() => {
                const raw = parseInput(membersJson);
                if (!raw.length) return;
                // Normalize field names from various export formats
                const members = raw.map((m: any) => ({
                  email: m.email || m.user_email || '',
                  display_name: m.display_name || m.user_name || [m.first_name, m.last_name].filter(Boolean).join(' ') || m.name || '',
                  bio: m.bio || m.description || '',
                  organization: m.organization || '',
                  joined_at: m.joined_at || m.user_registered || m.created_at || '',
                  role: m.role || m.roles || '',
                })).filter((m: any) => m.email);
                // Deduplicate by email (FCA space-users export has duplicates)
                const seen = new Set<string>();
                const unique = members.filter((m: any) => {
                  const key = m.email.toLowerCase();
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
                if (!unique.length) { toast.error('No valid members found with email addresses'); return; }
                toast.info(`Parsed ${unique.length} unique members from ${raw.length} rows`);
                importMembers.mutate({ members: unique, dryRun: memberDryRun });
              }}
              disabled={!membersJson.trim() || importMembers.isPending}
              variant={memberDryRun ? "outline" : "default"}
            >
              {importMembers.isPending ? "Processing..." : memberDryRun ? "Preview Import" : "Execute Import"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
          {memberResult && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-500/10 rounded p-2">
                  <p className="text-xl font-bold text-emerald-500">{memberResult.created}</p>
                  <p className="text-xs text-muted-foreground">{memberDryRun ? "Would create" : "Created"}</p>
                </div>
                <div className="bg-amber-500/10 rounded p-2">
                  <p className="text-xl font-bold text-amber-500">{memberResult.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped (exist)</p>
                </div>
                <div className="bg-destructive/10 rounded p-2">
                  <p className="text-xl font-bold text-destructive">{memberResult.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
              {memberResult.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
                  {memberResult.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Posts Import */}
      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Post Import
          </CardTitle>
          <CardDescription>
            Import posts as forum discussions or blog posts. Space names/slugs are matched to existing OCOS forum categories. Author emails are matched to imported members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block">Import posts as</Label>
              <Select value={postType} onValueChange={(v) => setPostType(v as "discussion" | "blog")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">Forum Discussions</SelectItem>
                  <SelectItem value="blog">Blog Posts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {postType === "discussion" && (
              <div>
                <Label className="text-xs mb-1 block">Fallback Category (if space not matched)</Label>
                <Select
                  value={fallbackCategoryId?.toString() ?? ""}
                  onValueChange={(v) => setFallbackCategoryId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleFileUpload(setPostsJson)}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload File
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPostsJson("")}>Clear</Button>
          </div>
          <Textarea
            value={postsJson}
            onChange={(e) => setPostsJson(e.target.value)}
            placeholder={`Paste FCA posts JSON here. Expected format:\n[\n  { "title": "Post Title", "content": "Body text...", "space_name": "General", "author_email": "user@example.com" },\n  ...\n]`}
            rows={6}
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={postDryRun}
                onChange={(e) => setPostDryRun(e.target.checked)}
                className="rounded"
              />
              Dry Run (preview only — no changes saved)
            </label>
            <Button
              onClick={() => {
                const posts = parseInput(postsJson).map((p: any) => ({ ...p, type: postType }));
                if (!posts.length) return;
                importPosts.mutate({ posts, categoryId: fallbackCategoryId, dryRun: postDryRun });
              }}
              disabled={!postsJson.trim() || importPosts.isPending}
              variant={postDryRun ? "outline" : "default"}
            >
              {importPosts.isPending ? "Processing..." : postDryRun ? "Preview Import" : "Execute Import"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
          {postResult && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-500/10 rounded p-2">
                  <p className="text-xl font-bold text-emerald-500">{postResult.created}</p>
                  <p className="text-xs text-muted-foreground">{postDryRun ? "Would create" : "Created"}</p>
                </div>
                <div className="bg-amber-500/10 rounded p-2">
                  <p className="text-xl font-bold text-amber-500">{postResult.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="bg-destructive/10 rounded p-2">
                  <p className="text-xl font-bold text-destructive">{postResult.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
              {postResult.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
                  {postResult.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── LinkedIn Import Tab ─────────────────────────────────────────────
function LinkedInImportTab() {
  const [rawInput, setRawInput] = useState("");
  const [postType, setPostType] = useState<"blog" | "discussion">("blog");
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [preview, setPreview] = useState<{ title: string; date: string; chars: number }[]>([]);

  const { data: categories } = trpc.fcaImport.getCategories.useQuery();
  const [fallbackCategoryId, setFallbackCategoryId] = useState<number | undefined>();

  const importPosts = trpc.linkedInImport.importPosts.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success(`${data.created} post${data.created !== 1 ? 's' : ''} ${dryRun ? 'would be imported' : 'imported'}`);
    },
    onError: (e) => toast.error(e.message),
  });

  function parseInput(raw: string): any[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    // Try JSON first
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // fall through to CSV
      }
    }

    // Parse CSV (LinkedIn Shares.csv format)
    const lines = trimmed.split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    return lines.slice(1).map(line => {
      // Handle quoted CSV fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; continue; }
        if (line[i] === ',' && !inQuotes) { values.push(current); current = ''; continue; }
        current += line[i];
      }
      values.push(current);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
      return obj;
    }).filter(row => Object.values(row).some(v => v.trim()));
  }

  function handlePreview() {
    const posts = parseInput(rawInput);
    setPreview(posts.slice(0, 5).map(p => ({
      title: (() => {
        const text = p.ShareCommentary || p.text || p.content || '';
        const first = text.split('\n')[0].trim();
        return p.title || (first.length > 60 ? first.substring(0, 57) + '...' : first) || 'LinkedIn Post';
      })(),
      date: p.Date || p.date || 'Unknown date',
      chars: (p.ShareCommentary || p.text || p.content || '').length,
    })));
    return posts;
  }

  function handleFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setRawInput(ev.target?.result as string ?? '');
      reader.readAsText(file);
    };
    input.click();
  }

  function handleRun() {
    const posts = parseInput(rawInput);
    if (!posts.length) { toast.error('No posts found — check the file format'); return; }
    importPosts.mutate({ posts, type: postType, categoryId: fallbackCategoryId, dryRun });
  }

  const postCount = parseInput(rawInput).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#0A66C2]" />
            LinkedIn Post Import
          </CardTitle>
          <CardDescription>
            Import your LinkedIn posts into OCOS as blog posts or forum discussions.
            Accepts LinkedIn's native <strong>Shares.csv</strong> export or JSON from third-party tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <div>
                <p className="font-medium">Export from LinkedIn</p>
                <p className="text-muted-foreground text-xs">Settings &amp; Privacy → Data Privacy → Get a copy of your data → select <strong>Posts</strong> → Request archive</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <div>
                <p className="font-medium">Upload Shares.csv</p>
                <p className="text-muted-foreground text-xs">From the downloaded ZIP, find <code>Shares.csv</code> and upload it below. JSON from tools like PhantomBuster also works.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <div>
                <p className="font-medium">Preview → Import</p>
                <p className="text-muted-foreground text-xs">Run a dry-run to see what will be imported, then uncheck Dry Run and execute.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Config */}
      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="text-base">Import Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block">Import posts as</Label>
              <Select value={postType} onValueChange={(v) => setPostType(v as "blog" | "discussion")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Posts</SelectItem>
                  <SelectItem value="discussion">Forum Discussions</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {postType === 'blog' ? 'Posts appear in the Blog section with full markdown rendering.' : `Posts appear in the ${CLUB_NAME} Forum as discussion threads.`}
              </p>
            </div>
            {postType === 'discussion' && (
              <div>
                <Label className="text-xs mb-1 block">Forum Category</Label>
                <Select
                  value={fallbackCategoryId?.toString() ?? ''}
                  onValueChange={(v) => setFallbackCategoryId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <Label className="text-xs mb-1 block">Upload or paste your LinkedIn export</Label>
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={handleFileUpload}>
                <Upload className="w-4 h-4 mr-1.5" /> Upload Shares.csv or JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setRawInput(''); setPreview([]); setResult(null); }}>Clear</Button>
              {rawInput && (
                <Button variant="ghost" size="sm" onClick={() => { handlePreview(); }}>
                  Preview first 5 posts
                </Button>
              )}
            </div>
            <Textarea
              value={rawInput}
              onChange={(e) => { setRawInput(e.target.value); setPreview([]); setResult(null); }}
              placeholder={`Paste Shares.csv content here:\n\nDate,ShareCommentary,ShareLink,Visibility\n2024-01-15,"Just published a deep dive on O-PAS architecture...","https://linkedin.com/posts/...","PUBLIC"\n\nOr paste JSON array from third-party exporters.`}
              rows={7}
              className="font-mono text-xs"
            />
            {rawInput && (
              <p className="text-xs text-muted-foreground mt-1">
                {postCount} post{postCount !== 1 ? 's' : ''} detected
              </p>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview (first 5)</p>
              {preview.map((p, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-muted-foreground text-xs w-4 shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.date} · {p.chars} chars</p>
                  </div>
                </div>
              ))}
              {postCount > 5 && (
                <p className="text-xs text-muted-foreground">...and {postCount - 5} more</p>
              )}
            </div>
          )}

          {/* Run */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              Dry Run (preview only — no changes saved)
            </label>
            <Button
              onClick={handleRun}
              disabled={!rawInput.trim() || importPosts.isPending}
              variant={dryRun ? 'outline' : 'default'}
            >
              {importPosts.isPending ? 'Processing...' : dryRun ? 'Preview Import' : 'Execute Import'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-500/10 rounded p-2">
                  <p className="text-xl font-bold text-emerald-500">{result.created}</p>
                  <p className="text-xs text-muted-foreground">{dryRun ? 'Would import' : 'Imported'}</p>
                </div>
                <div className="bg-amber-500/10 rounded p-2">
                  <p className="text-xl font-bold text-amber-500">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped (empty)</p>
                </div>
                <div className="bg-destructive/10 rounded p-2">
                  <p className="text-xl font-bold text-destructive">{result.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
              {!dryRun && result.created > 0 && (
                <p className="text-xs text-emerald-500 font-medium">
                  ✓ {result.created} post{result.created !== 1 ? 's' : ''} imported successfully. View them in {postType === 'blog' ? 'Blog' : 'Community Forum'}.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Workflows Tab ──────────────────────────────────────────────────
function ProfileFieldsTab() {
  const { data: fields, isLoading, refetch } = trpc.profileFields.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "textarea" | "select" | "url" | "date" | "number">("text");
  const [optionsText, setOptionsText] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const createField = trpc.profileFields.create.useMutation({
    onSuccess: () => { toast.success("Field created"); refetch(); closeDialog(); },
    onError: (e) => toast.error(e.message),
  });
  const updateField = trpc.profileFields.update.useMutation({
    onSuccess: () => { toast.success("Field updated"); refetch(); closeDialog(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteField = trpc.profileFields.delete.useMutation({
    onSuccess: () => { toast.success("Field deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFieldKey("");
    setLabel("");
    setFieldType("text");
    setOptionsText("");
    setIsRequired(false);
  };

  const openCreateDialog = () => {
    closeDialog();
    setDialogOpen(true);
  };

  const openEditDialog = (f: any) => {
    setEditingId(f.id);
    setFieldKey(f.fieldKey);
    setLabel(f.label);
    setFieldType(f.fieldType);
    setOptionsText((f.options || []).join(", "));
    setIsRequired(f.isRequired);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const options = fieldType === "select" ? optionsText.split(",").map(s => s.trim()).filter(Boolean) : undefined;
    if (editingId) {
      updateField.mutate({ id: editingId, label, fieldType, options, isRequired });
    } else {
      createField.mutate({ fieldKey, label, fieldType, options, isRequired, sortOrder: (fields?.length ?? 0) });
    }
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading fields...</div>;

  return (
    <div className="space-y-6">
      <Card className="opa-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5 text-amber-400" />Custom Profile Fields</CardTitle>
            <CardDescription>Additional fields members fill in on their profile, beyond the built-in bio/company/location.</CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}><Plus className="w-4 h-4" /> Add Field</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(fields ?? []).map((f: any) => (
              <div key={f.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{f.label}</span>
                    <Badge variant="secondary" className="text-xs">{f.fieldType}</Badge>
                    {f.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Key: <code className="bg-muted px-1 rounded">{f.fieldKey}</code>
                    {f.fieldType === "select" && f.options?.length ? ` · Options: ${f.options.join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(f)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { if (confirm(`Delete "${f.label}"? Any member values stored for it will also be deleted.`)) deleteField.mutate({ id: f.id }); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {(!fields || fields.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No custom fields yet. Add one to collect extra info on member profiles.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit field" : "Add field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingId && (
              <div className="space-y-1.5">
                <Label>Field key</Label>
                <Input value={fieldKey} onChange={e => setFieldKey(e.target.value)} placeholder="e.g. t_shirt_size" />
                <p className="text-xs text-muted-foreground">A stable internal identifier. Can't be changed after creation.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. T-Shirt Size" />
            </div>
            <div className="space-y-1.5">
              <Label>Field type</Label>
              <Select value={fieldType} onValueChange={(v: any) => setFieldType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Long text</SelectItem>
                  <SelectItem value="select">Dropdown (choose one)</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fieldType === "select" && (
              <div className="space-y-1.5">
                <Label>Options (comma-separated)</Label>
                <Textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} placeholder="Small, Medium, Large" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isRequired" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="isRequired" className="cursor-pointer font-normal">Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!label || (!editingId && !fieldKey) || createField.isPending || updateField.isPending}
            >
              {editingId ? "Save Changes" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowsTab() {
  const { data: workflows, isLoading, refetch } = trpc.workflows.list.useQuery();
  const { data: events, isLoading: eventsLoading } = trpc.workflows.events.useQuery({ limit: 30 });
  const toggle = trpc.workflows.toggle.useMutation({
    onSuccess: () => { toast.success("Workflow updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const workflowDescriptions: Record<string, string> = {
    new_member_welcome: "Send a welcome notification to new members when they register",
    post_submitted_for_moderation: "Notify admin when a new post is submitted for review",
    post_approved: "Notify the author when their post is approved",
    post_rejected: "Notify the author when their post is rejected with a reason",
    new_discussion_reply: "Notify discussion authors when someone replies to their post",
    new_follower: "Notify a member when someone follows them",
    new_event_rsvp: "Notify event organizers when someone RSVPs",
    weekly_digest: "Send a weekly digest of top content to all members",
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading workflows...</div>;

  return (
    <div className="space-y-6">
      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400" />Automated Workflows</CardTitle>
          <CardDescription>Enable or disable automated platform workflows. Workflows fire in real-time when their trigger conditions are met.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(workflows ?? []).map((wf: any) => (
              <div key={wf.workflowKey} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{wf.label}</span>
                    <Badge variant={wf.enabled ? "default" : "secondary"} className="text-xs">
                      {wf.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {workflowDescriptions[wf.workflowKey] ?? wf.description ?? "Automated workflow trigger"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trigger: <code className="bg-muted px-1 rounded">{wf.workflowKey}</code>
                  </p>
                </div>
                <Button
                  variant={wf.enabled ? "default" : "outline"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => toggle.mutate({ workflowKey: wf.workflowKey, enabled: !wf.enabled })}
                  disabled={toggle.isPending}
                >
                  {wf.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            ))}
            {(!workflows || workflows.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No workflows configured. Workflows are seeded automatically on first run.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="opa-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" />Recent Workflow Events</CardTitle>
          <CardDescription>Last 30 workflow trigger events across all active workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Loading events...</div>
          ) : (events ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No workflow events yet. Events appear here when workflows fire.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(events ?? []).map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3 p-3 border rounded-lg text-sm">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ev.status === 'success' ? 'bg-emerald-400' : ev.status === 'failed' ? 'bg-destructive' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{ev.workflowKey}</span>
                      <Badge variant={ev.status === 'success' ? 'default' : 'destructive'} className="text-xs">{ev.status}</Badge>
                    </div>
                    {ev.payload && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{JSON.stringify(ev.payload)}</p>
                    )}
                    {ev.error && (
                      <p className="text-xs text-destructive mt-0.5">{ev.error}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Expert Verification Tab ─────────────────────────────────────────
function ExpertVerificationTab() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  const { data: requests, isLoading, refetch } = trpc.verification.list.useQuery({ status: statusFilter });

  const reviewMutation = trpc.verification.review.useMutation({
    onSuccess: () => {
      toast.success("Verification request reviewed");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleReview = (requestId: number, decision: "approved" | "rejected") => {
    reviewMutation.mutate({ requestId, decision, notes: reviewNotes[requestId] || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-[19px] font-semibold">Expert Verification Requests</h3>
          <p className="text-sm text-muted-foreground">Review and approve expert credentials for community members.</p>
        </div>
        <div className="flex gap-2">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
      ) : !requests || requests.length === 0 ? (
        <Card className="opa-card">
          <CardContent className="pt-6 text-center">
            <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-heading text-lg font-semibold mb-1">No {statusFilter} requests</h3>
            <p className="text-muted-foreground">
              {statusFilter === "pending"
                ? "All verification requests have been reviewed."
                : `No ${statusFilter} requests found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req: any) => (
            <Card key={req.id} className="opa-card overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{req.userName || `User #${req.userId}`}</span>
                      <Badge variant={
                        req.status === "approved" ? "default" :
                        req.status === "rejected" ? "destructive" : "secondary"
                      } className="capitalize text-xs">
                        {req.status}
                      </Badge>
                      {req.linkedInUrl && (
                        <a href={req.linkedInUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Linkedin className="w-3 h-3" />
                          LinkedIn Profile
                        </a>
                      )}
                    </div>
                    {req.credentials && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Credentials</p>
                        <p className="text-sm text-foreground">{req.credentials}</p>
                      </div>
                    )}
                    {req.statement && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Statement</p>
                        <p className="text-sm text-foreground">{req.statement}</p>
                      </div>
                    )}
                    {req.reviewNotes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Review Notes</p>
                        <p className="text-sm text-muted-foreground italic">{req.reviewNotes}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(req.createdAt).toLocaleDateString()}
                      {req.reviewedAt && ` · Reviewed ${new Date(req.reviewedAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Textarea
                        placeholder="Review notes (optional)..."
                        value={reviewNotes[req.id] || ""}
                        onChange={(e) => setReviewNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                        className="text-xs h-16 resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleReview(req.id, "approved")}
                          disabled={reviewMutation.isPending}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleReview(req.id, "rejected")}
                          disabled={reviewMutation.isPending}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Audit Logs Tab ─────────────────────────────────────────────────
function AuditLogsTab() {
  const { data: logs, isLoading } = trpc.auditLogs.list.useQuery({ limit: 100 });

  const actionColors: Record<string, string> = {
    content_approved: "text-emerald-500",
    content_rejected: "text-red-500",
    user_role_changed: "text-blue-500",
    verification_approved: "text-emerald-500",
    verification_rejected: "text-red-500",
    discussion_promoted: "text-purple-500",
    answer_accepted: "text-amber-500",
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-[19px] font-semibold">Audit Log</h3>
        <p className="text-xs text-muted-foreground">Last {logs?.length ?? 0} platform actions</p>
      </div>
      {!logs || logs.length === 0 ? (
        <Card className="opa-card">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No audit events recorded yet.</p>
            <p className="text-xs mt-1">Actions like approvals, role changes, and verifications will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="opa-card rounded-lg border bg-card p-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Target</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-xs">{log.actorName || `User #${log.actorUserId}`}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-mono font-medium ${actionColors[log.actionType] || "text-foreground"}`}>
                      {log.actionType}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {log.targetType && <span className="capitalize">{log.targetType}</span>}
                    {log.targetId && <span className="ml-1 text-muted-foreground/60">#{log.targetId}</span>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate">
                    {log.detailsJson ? JSON.stringify(log.detailsJson).slice(0, 80) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Pending Promotions Tab ──────────────────────────────────────────────────
function PendingPromotionsTab() {
  const { data: pending, isLoading, refetch } = trpc.rolePromotion.listPending.useQuery();
  const reviewMutation = trpc.rolePromotion.review.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Request ${vars.status}`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

  const ROLE_LABELS: Record<string, string> = {
    owner_operator: "Owner/Operator",
    epc_integrator: "EPC/Integrator",
    automation_engineer: "Automation Engineer",
    executive: "Executive",
    vendor: "Vendor",
    analyst: "Analyst",
    instructor: "Instructor",
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-[19px] font-semibold">Pending Role Promotion Requests</h2>
        <p className="text-sm text-muted-foreground">Review and approve or reject member role upgrade requests.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : !pending || pending.length === 0 ? (
        <Card className="opa-card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No pending requests</h3>
          <p className="text-muted-foreground text-sm">All role promotion requests have been reviewed.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((req: any) => (
            <Card key={req.id} className="opa-card p-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{req.userName || `User #${req.userId}`}</span>
                    <Badge variant="outline" className="text-xs">{req.userEmail}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>Current: <span className="text-foreground font-medium">{ROLE_LABELS[req.currentRole] || req.currentRole || 'None'}</span></span>
                    <ArrowRight className="w-3 h-3" />
                    <span>Requested: <span className="text-primary font-medium">{ROLE_LABELS[req.requestedRole] || req.requestedRole}</span></span>
                  </div>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mb-2">{req.reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Input
                    placeholder="Review notes (optional)"
                    value={reviewNotes[req.id] || ''}
                    onChange={e => setReviewNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="text-xs h-8"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => reviewMutation.mutate({ id: req.id, status: 'approved', reviewNotes: reviewNotes[req.id] })}
                      disabled={reviewMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => reviewMutation.mutate({ id: req.id, status: 'rejected', reviewNotes: reviewNotes[req.id] })}
                      disabled={reviewMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Re-engagement Tab ───────────────────────────────────────────────────────
function ReEngagementTab() {
  const [days, setDays] = useState(30);
  const { data: inactive, isLoading, refetch } = trpc.reEngagement.getInactiveUsers.useQuery({ days });
  const sendSingle = trpc.reEngagement.sendReEngagementEmail.useMutation({
    onSuccess: () => toast.success("Re-engagement email sent"),
    onError: (e) => toast.error(e.message),
  });
  const sendBulk = trpc.reEngagement.sendBulk.useMutation({
    onSuccess: (r) => toast.success(`Sent ${r.sent} of ${r.total} emails`),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-[19px] font-semibold">Re-engagement Automation</h2>
          <p className="text-sm text-muted-foreground">Identify and re-engage members who haven't visited recently.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Inactive for</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="w-20 h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">days</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {inactive && inactive.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            {inactive.length} inactive member{inactive.length !== 1 ? 's' : ''} found
          </span>
          <Button
            size="sm"
            onClick={() => sendBulk.mutate({ days })}
            disabled={sendBulk.isPending}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sendBulk.isPending ? 'Sending...' : `Email All (${inactive.length})`}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : !inactive || inactive.length === 0 ? (
        <Card className="opa-card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: CATEGORY_COLORS.teal.solid }} />
          <h3 className="font-heading text-lg font-semibold mb-2">All members are active</h3>
          <p className="text-muted-foreground text-sm">No members have been inactive for {days}+ days.</p>
        </Card>
      ) : (
        <div className="opa-card rounded-lg border bg-card p-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead className="hidden md:table-cell">Last Seen</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactive.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="whitespace-normal">
                    <div className="font-medium text-sm">{u.name || `User #${u.id}`}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => sendSingle.mutate({ userId: u.id })}
                      disabled={sendSingle.isPending}
                    >
                      <Mail className="w-3 h-3" />
                      Email
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Tag Seed Panel ──────────────────────────────────────────────────
const OPA_STARTER_TAGS = [
  { name: "O-PAS", slug: "o-pas", description: "Open Process Automation Standard" },
  { name: "DCN", slug: "dcn", description: "Distributed Control Node" },
  { name: "OPAF", slug: "opaf", description: "Open Process Automation Forum" },
  { name: "architecture", slug: "architecture", description: "System architecture and design" },
  { name: "migration", slug: "migration", description: "Migration from legacy DCS to OPA" },
  { name: "vendor-neutral", slug: "vendor-neutral", description: "Vendor-neutral interoperability" },
  { name: "interoperability", slug: "interoperability", description: "System interoperability" },
  { name: "portability", slug: "portability", description: "Application portability" },
  { name: "cybersecurity", slug: "cybersecurity", description: "Industrial cybersecurity" },
  { name: "IEC-62443", slug: "iec-62443", description: "IEC 62443 security standard" },
  { name: "APL", slug: "apl", description: "Advanced Physical Layer" },
  { name: "DCS", slug: "dcs", description: "Distributed Control System" },
  { name: "SCADA", slug: "scada", description: "Supervisory Control and Data Acquisition" },
  { name: "digital-twin", slug: "digital-twin", description: "Digital twin technology" },
  { name: "AI-ML", slug: "ai-ml", description: "Artificial Intelligence and Machine Learning in process automation" },
  { name: "edge-computing", slug: "edge-computing", description: "Edge computing in industrial environments" },
  { name: "brownfield", slug: "brownfield", description: "Brownfield retrofit and migration" },
  { name: "greenfield", slug: "greenfield", description: "Greenfield OPA deployment" },
  { name: "ROI", slug: "roi", description: "Return on investment for OPA projects" },
  { name: "case-study", slug: "case-study", description: "Real-world OPA implementation case studies" },
];

function TagSeedPanel() {
  const { data: existingTags, refetch } = trpc.tags.list.useQuery();
  const createTag = trpc.tags.create.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });
  const [seeding, setSeeding] = useState(false);

  const existingSlugs = new Set((existingTags || []).map((t: any) => t.slug));
  const missing = OPA_STARTER_TAGS.filter(t => !existingSlugs.has(t.slug));

  const seedAll = async () => {
    setSeeding(true);
    let count = 0;
    for (const tag of missing) {
      try {
        await createTag.mutateAsync(tag);
        count++;
      } catch { /* skip duplicates */ }
    }
    setSeeding(false);
    toast.success(`Seeded ${count} OPA tags`);
    refetch();
  };

  return (
    <Card className="opa-card md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-lg">#</span> OPA Starter Tags
        </CardTitle>
        <CardDescription>
          Seed 20 pre-defined OPA/O-PAS taxonomy tags so the autocomplete is useful from day one.
          {existingTags && (
            <span className="ml-2 font-medium text-foreground">
              {existingTags.length} tags exist · {missing.length} missing
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {OPA_STARTER_TAGS.map(t => (
            <span
              key={t.slug}
              className={`px-2 py-0.5 rounded-full text-xs border ${
                existingSlugs.has(t.slug)
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {existingSlugs.has(t.slug) ? '✓ ' : ''}{t.name}
            </span>
          ))}
        </div>
        {missing.length > 0 && (
          <Button onClick={seedAll} disabled={seeding} className="gap-2">
            <Plus className="w-4 h-4" />
            {seeding ? 'Seeding…' : `Seed ${missing.length} Missing Tags`}
          </Button>
        )}
        {missing.length === 0 && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> All 20 starter tags are present.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
