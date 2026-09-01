import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { ListCard, CategoryPill } from "@/components/dashboard/ListCard";
import { hueFor, CATEGORY_COLORS } from "@/lib/categoryColors";
import { FileText, Plus, Building2, Clock, TrendingUp, ArrowRight, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const INDUSTRIES = ["Oil & Gas", "Chemicals", "Pharmaceuticals", "Power & Utilities", "Mining", "Food & Beverage", "Water Treatment", "Manufacturing", "Other"];
const COMPANY_SIZES = [
  { value: "startup", label: "Startup (1-50)" },
  { value: "small", label: "Small (51-200)" },
  { value: "medium", label: "Medium (201-1000)" },
  { value: "large", label: "Large (1001-5000)" },
  { value: "enterprise", label: "Enterprise (5000+)" },
];

// Parses a free-text implementation timeline (e.g. "6 months", "1 year") into a month count.
function parseTimelineMonths(timeline?: string | null): number | null {
  if (!timeline) return null;
  const match = timeline.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return /year/i.test(timeline) ? value * 12 : value;
}

export default function CaseStudies() {
  const { user } = useAuth();

  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [showSubmit, setShowSubmit] = useState(false);

  const { data: studies, isLoading } = trpc.caseStudies.list.useQuery();
  const submitMutation = trpc.caseStudies.submit.useMutation({
    onSuccess: () => { toast.success("Case study submitted for review"); setShowSubmit(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    title: "", description: "", summary: "", industry: "", companySize: "" as any,
    roi: "", implementationTimeline: "", techStack: "", keyResults: "", challenges: "", lessons: "",
  });

  const filtered = studies?.filter((s: any) => industryFilter === "all" || s.industry === industryFilter) || [];

  const industriesCount = useMemo(() => new Set((studies || []).map((s: any) => s.industry)).size, [studies]);
  const avgTimeline = useMemo(() => {
    const months = (studies || [])
      .map((s: any) => parseTimelineMonths(s.implementationTimeline))
      .filter((n: number | null): n is number => n !== null);
    if (months.length === 0) return "—";
    const avg = months.reduce((a: number, b: number) => a + b, 0) / months.length;
    return avg >= 12 ? `${(avg / 12).toFixed(1)} yrs` : `${avg.toFixed(1)} mo`;
  }, [studies]);
  const featuredCount = (studies || []).filter((s: any) => s.isFeatured).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-[34px] font-semibold leading-tight">Case Studies</h1>
          <p className="text-[15.5px] text-muted-foreground mt-1.5">
            Real modernization projects, outcomes and lessons learned.
          </p>
        </div>
        {user && (
          <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Submit Case Study</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit a Case Study</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <Input placeholder="Summary (one-liner)" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
                <Textarea placeholder="Full description *" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                    <SelectTrigger><SelectValue placeholder="Industry *" /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.companySize} onValueChange={v => setForm(f => ({ ...f, companySize: v }))}>
                    <SelectTrigger><SelectValue placeholder="Company Size *" /></SelectTrigger>
                    <SelectContent>{COMPANY_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="ROI (e.g., 25% cost reduction)" value={form.roi} onChange={e => setForm(f => ({ ...f, roi: e.target.value }))} />
                  <Input placeholder="Timeline (e.g., 6 months)" value={form.implementationTimeline} onChange={e => setForm(f => ({ ...f, implementationTimeline: e.target.value }))} />
                </div>
                <Input placeholder="Tech Stack (comma-separated)" value={form.techStack} onChange={e => setForm(f => ({ ...f, techStack: e.target.value }))} />
                <Textarea placeholder="Key Results" rows={3} value={form.keyResults} onChange={e => setForm(f => ({ ...f, keyResults: e.target.value }))} />
                <Textarea placeholder="Challenges Faced" rows={3} value={form.challenges} onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))} />
                <Textarea placeholder="Lessons Learned" rows={3} value={form.lessons} onChange={e => setForm(f => ({ ...f, lessons: e.target.value }))} />
                <Button
                  className="w-full"
                  disabled={!form.title || !form.description || !form.industry || !form.companySize || submitMutation.isPending}
                  onClick={() => submitMutation.mutate(form)}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <StatStrip
        items={[
          { icon: FileText, value: studies?.length ?? 0, label: "Published", hue: "blue" },
          { icon: Building2, value: industriesCount, label: "Industries", hue: "teal" },
          { icon: Clock, value: avgTimeline, label: "Avg Timeline", hue: "violet" },
          { icon: Star, value: featuredCount, label: "Featured", hue: "amber" },
        ]}
      />

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[240px] h-10 bg-card border-border/70">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Case Study List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((study: any) => {
            const hue = hueFor(study.industry);
            return (
              <Link key={study.id} href={`/case-studies/${study.id}`}>
                <ListCard hue={hue} className="cursor-pointer hover:border-[var(--accent-400)] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <CategoryPill hue={hue}>{study.industry}</CategoryPill>
                        {study.isFeatured && (
                          <Star className="w-3.5 h-3.5 text-[var(--category-amber-solid)] fill-[var(--category-amber-solid)]" />
                        )}
                        <h4 className="text-[18px] font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                          {study.title}
                        </h4>
                      </div>
                      <p className="text-[14.5px] text-muted-foreground line-clamp-2 mb-1.5 leading-normal">
                        {study.summary || study.title}
                      </p>
                      <span className="text-[13px] text-muted-foreground capitalize">
                        {study.companySize} company · {study.authorName}
                      </span>
                    </div>
                    {(study.roi || study.implementationTimeline) && (
                      <div className="shrink-0 text-center px-4 border-l border-border">
                        <div className="font-heading text-[22px] font-semibold" style={{ color: CATEGORY_COLORS[hue].text }}>
                          {study.roi || study.implementationTimeline}
                        </div>
                      </div>
                    )}
                  </div>
                </ListCard>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No case studies found</h3>
            <p className="text-muted-foreground mb-4">
              {industryFilter !== "all" ? "Try a different industry filter." : "Be the first to share your O-PAS implementation story."}
            </p>
            {user && industryFilter === "all" && (
              <Button onClick={() => setShowSubmit(true)}>
                <Plus className="w-4 h-4 mr-2" /> Submit Case Study
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function CaseStudyDetail() {
  const id = parseInt(window.location.pathname.split("/").pop() || "0");
  const { data: study, isLoading } = trpc.caseStudies.get.useQuery({ id }, { enabled: id > 0 });

  if (isLoading) return <div className="container max-w-4xl py-8"><Card className="h-96 animate-pulse bg-muted" /></div>;
  if (!study) return <div className="container max-w-4xl py-8 text-center"><p>Case study not found.</p></div>;

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <Link href="/case-studies">
          <Button variant="ghost" size="sm" className="mb-4"><ArrowRight className="h-4 w-4 mr-1 rotate-180" /> Back to Library</Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline">{study.industry}</Badge>
          <Badge variant="secondary" className="capitalize">{study.companySize}</Badge>
        </div>
        <h1 className="text-3xl font-bold mb-2">{study.title}</h1>
        <p className="text-muted-foreground">By {study.authorName} · {new Date(study.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Key Metrics */}
      {(study.roi || study.implementationTimeline || study.techStack) && (
        <div className="grid grid-cols-3 gap-4">
          {study.roi && (
            <Card><CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">ROI</p>
              <p className="font-semibold">{study.roi}</p>
            </CardContent></Card>
          )}
          {study.implementationTimeline && (
            <Card><CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">Timeline</p>
              <p className="font-semibold">{study.implementationTimeline}</p>
            </CardContent></Card>
          )}
          {study.techStack && (
            <Card><CardContent className="p-4 text-center">
              <Building2 className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">Tech Stack</p>
              <p className="font-semibold text-sm">{study.techStack}</p>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* Description */}
      <Card>
        <CardContent className="p-6 prose dark:prose-invert max-w-none">
          <h3>Overview</h3>
          <p className="whitespace-pre-wrap">{study.description}</p>
          {study.keyResults && <><h3>Key Results</h3><p className="whitespace-pre-wrap">{study.keyResults}</p></>}
          {study.challenges && <><h3>Challenges</h3><p className="whitespace-pre-wrap">{study.challenges}</p></>}
          {study.lessons && <><h3>Lessons Learned</h3><p className="whitespace-pre-wrap">{study.lessons}</p></>}
        </CardContent>
      </Card>
    </div>
  );
}
