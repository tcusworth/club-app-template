import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { CategoryPill } from "@/components/dashboard/ListCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import type { CategoryHue } from "@/lib/categoryColors";
import { BarChart3, Plus, TrendingUp, Users, Building2, Clock } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

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

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function trendFor(pct: number): { label: string; hue: CategoryHue } {
  if (pct >= 25) return { label: "Leading", hue: "teal" };
  if (pct >= 10) return { label: "Established", hue: "blue" };
  return { label: "Emerging", hue: "amber" };
}

export default function Benchmarking() {
  const { user } = useAuth();
  const [showSubmit, setShowSubmit] = useState(false);
  const { data: dashboard, isLoading } = trpc.benchmarking.dashboard.useQuery();
  const submitMutation = trpc.benchmarking.submit.useMutation({
    onSuccess: () => { toast.success("Benchmark data submitted. Thank you!"); setShowSubmit(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    isAnonymous: false, industry: "", companySize: "" as any,
    roi: "", implementationTimeline: "", teamSize: undefined as number | undefined,
    techStack: "", challenges: "", keySuccesses: "",
  });

  // Compute tech stack frequency from entries
  const techStackFreq = useMemo(() => {
    if (!dashboard?.entries) return [];
    const freq: Record<string, number> = {};
    dashboard.entries.forEach((e: any) => {
      if (e.techStack) {
        e.techStack.split(",").map((t: string) => t.trim()).filter(Boolean).forEach((t: string) => {
          freq[t] = (freq[t] || 0) + 1;
        });
      }
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [dashboard?.entries]);

  const avgTimeline = useMemo(() => {
    const months = (dashboard?.entries || [])
      .map((e: any) => parseTimelineMonths(e.implementationTimeline))
      .filter((n: number | null): n is number => n !== null);
    if (months.length === 0) return "—";
    const avg = months.reduce((a: number, b: number) => a + b, 0) / months.length;
    return avg >= 12 ? `${(avg / 12).toFixed(1)} yrs` : `${avg.toFixed(1)} mo`;
  }, [dashboard?.entries]);

  const medianTeamSize = useMemo(() => {
    const sizes = (dashboard?.entries || [])
      .map((e: any) => e.teamSize)
      .filter((n: any): n is number => typeof n === "number");
    const m = median(sizes);
    return m === null ? "—" : Math.round(m);
  }, [dashboard?.entries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-[34px] font-semibold leading-tight">Benchmarking</h1>
          <p className="text-[15.5px] text-muted-foreground mt-1.5">
            Aggregate, anonymized metrics from community-submitted modernization projects.
          </p>
        </div>
        {user && (
          <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Submit Your Data</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Contribute Benchmark Data</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Share your O-PAS adoption experience to help the community benchmark progress.</p>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <Switch checked={form.isAnonymous} onCheckedChange={v => setForm(f => ({ ...f, isAnonymous: v }))} />
                  <Label>Submit anonymously</Label>
                </div>
                <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                  <SelectTrigger><SelectValue placeholder="Industry *" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.companySize} onValueChange={v => setForm(f => ({ ...f, companySize: v }))}>
                  <SelectTrigger><SelectValue placeholder="Company Size *" /></SelectTrigger>
                  <SelectContent>{COMPANY_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="ROI achieved (e.g., 25% cost reduction)" value={form.roi} onChange={e => setForm(f => ({ ...f, roi: e.target.value }))} />
                <Input placeholder="Implementation timeline (e.g., 6 months)" value={form.implementationTimeline} onChange={e => setForm(f => ({ ...f, implementationTimeline: e.target.value }))} />
                <Input placeholder="Team size" type="number" value={form.teamSize ?? ""} onChange={e => setForm(f => ({ ...f, teamSize: e.target.value ? parseInt(e.target.value) : undefined }))} />
                <Input placeholder="Tech stack (comma-separated)" value={form.techStack} onChange={e => setForm(f => ({ ...f, techStack: e.target.value }))} />
                <Textarea placeholder="Key challenges" rows={3} value={form.challenges} onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))} />
                <Textarea placeholder="Key successes" rows={3} value={form.keySuccesses} onChange={e => setForm(f => ({ ...f, keySuccesses: e.target.value }))} />
                <Button
                  className="w-full"
                  disabled={!form.industry || !form.companySize || submitMutation.isPending}
                  onClick={() => submitMutation.mutate(form)}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Data"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <StatStrip
        items={[
          { icon: Users, value: dashboard?.total || 0, label: "Submissions", hue: "blue" },
          { icon: Clock, value: avgTimeline, label: "Avg Timeline", hue: "teal" },
          { icon: TrendingUp, value: medianTeamSize, label: "Median Team Size", hue: "violet" },
          { icon: Building2, value: dashboard?.byIndustry?.length || 0, label: "Industries", hue: "amber" },
        ]}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
        </div>
      ) : dashboard && dashboard.total > 0 ? (
        <div className="space-y-4">
          {/* Metrics table */}
          <div className="space-y-2">
            <div className="opa-card rounded-lg border bg-card p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Industry</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Share of Total</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.byIndustry?.map((item: any) => {
                    const pct = Math.round((item.count / dashboard.total) * 100);
                    const trend = trendFor(pct);
                    return (
                      <TableRow key={item.industry}>
                        <TableCell className="font-semibold">{item.industry}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell className="font-semibold text-[var(--accent-700)]">{pct}%</TableCell>
                        <TableCell><CategoryPill hue={trend.hue}>{trend.label}</CategoryPill></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Figures are self-reported and anonymized across {dashboard.total} submitted modernization projects. Submit your own data to sharpen the median.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* By Company Size */}
            <SectionCard title="By Company Size">
              <div className="space-y-2.5 px-1 py-1.5">
                {dashboard.byCompanySize?.map((item: any) => {
                  const pct = Math.round((item.count / dashboard.total) * 100);
                  return (
                    <div key={item.companySize} className="flex items-center justify-between text-[13.5px]">
                      <span className="capitalize">{item.companySize}</span>
                      <span className="text-muted-foreground">{item.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Tech Stack */}
            <SectionCard title="Top Technologies">
              <div className="px-1 py-1.5">
                {techStackFreq.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {techStackFreq.map(([tech, count]) => (
                      <Badge key={tech} variant="secondary" className="text-xs font-normal">
                        {tech} <span className="ml-1 text-muted-foreground">({count})</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tech stack data yet.</p>
                )}
              </div>
            </SectionCard>

            {/* ROI Highlights */}
            <SectionCard title="ROI Highlights">
              <div className="space-y-1.5 px-1 py-1.5">
                {dashboard.entries?.filter((e: any) => e.roi).slice(0, 5).map((entry: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="text-muted-foreground truncate">{entry.industry} · <span className="capitalize">{entry.companySize}</span></span>
                    <span className="font-semibold text-[var(--category-teal-text)] shrink-0">{entry.roi}</span>
                  </div>
                ))}
                {(!dashboard.entries || dashboard.entries.filter((e: any) => e.roi).length === 0) && (
                  <p className="text-sm text-muted-foreground">No ROI data yet.</p>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No benchmarking data yet.</p>
            <p className="text-sm text-muted-foreground">Be the first to contribute your O-PAS adoption data.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
