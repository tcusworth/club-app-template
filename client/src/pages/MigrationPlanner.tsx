import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, FileText, Loader2, AlertTriangle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function MigrationPlanner() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [dcsVendor, setDcsVendor] = useState("");
  const [controllerCount, setControllerCount] = useState("");
  const [ioCount, setIoCount] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  const { data: savedPlans, refetch } = trpc.migration.list.useQuery(undefined, { enabled: !!user });

  const generateMutation = trpc.migration.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedPlan(data.plan);
      toast.success("Migration plan generated");
      refetch();
    },
    onError: () => toast.error("Failed to generate plan"),
  });

  const handleGenerate = () => {
    if (!name.trim()) { toast.error("Please enter a plan name"); return; }
    generateMutation.mutate({
      name,
      currentEnvironment: {
        dcsVendor: dcsVendor || undefined,
        controllerCount: controllerCount ? parseInt(controllerCount) : undefined,
        ioCount: ioCount ? parseInt(ioCount) : undefined,
        age: age ? parseInt(age) : undefined,
        description: description || undefined,
      },
    });
  };

  const riskColor = (level: string) => {
    if (level.toLowerCase() === "high") return "text-red-400 bg-red-400/10";
    if (level.toLowerCase() === "medium") return "text-amber-400 bg-amber-400/10";
    return "text-green-400 bg-green-400/10";
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Migration Strategy Builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered DCS-to-OPA migration planning with phased execution</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Input Form */}
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Current Environment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Plan Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Refinery Unit 5 Migration" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">DCS Vendor</Label>
                  <Input value={dcsVendor} onChange={e => setDcsVendor(e.target.value)} placeholder="e.g., Honeywell, Emerson" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">System Age (years)</Label>
                  <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="15" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Controller Count</Label>
                  <Input type="number" value={controllerCount} onChange={e => setControllerCount(e.target.value)} placeholder="24" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">I/O Count</Label>
                  <Input type="number" value={ioCount} onChange={e => setIoCount(e.target.value)} placeholder="5000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Additional Context</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe any constraints, requirements, or special considerations..." rows={3} />
              </div>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending || !name.trim()} className="w-full">
                {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Plan...</> : "Generate Migration Plan"}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Plan */}
          {generatedPlan && (
            <div className="space-y-4">
              {/* Phases */}
              <Card className="border-border/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Migration Phases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {generatedPlan.phases?.map((phase: any, i: number) => (
                      <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/20">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium">Phase {i + 1}: {phase.name}</h3>
                          <Badge variant="secondary" className="text-[10px]">{phase.duration}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{phase.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Tasks</p>
                            {phase.tasks?.map((t: string, j: number) => (
                              <div key={j} className="flex items-start gap-1.5 mb-1">
                                <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                <span className="text-[11px] text-muted-foreground">{t}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Risks</p>
                            {phase.risks?.map((r: string, j: number) => (
                              <div key={j} className="flex items-start gap-1.5 mb-1">
                                <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                                <span className="text-[11px] text-muted-foreground">{r}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">Dependencies</p>
                            {phase.dependencies?.map((d: string, j: number) => (
                              <div key={j} className="flex items-start gap-1.5 mb-1">
                                <ArrowRight className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                                <span className="text-[11px] text-muted-foreground">{d}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Profile */}
              {generatedPlan.riskProfile && (
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" /> Risk Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(generatedPlan.riskProfile).map(([key, val]: [string, any]) => (
                        <div key={key} className="p-3 rounded-lg bg-muted/20 border border-border/20">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-medium capitalize">{key}</p>
                            <Badge className={`text-[10px] ${riskColor(val.level)}`}>{val.level}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{val.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cost Implications */}
              {generatedPlan.costImplications && (
                <Card className="border-border/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-400" /> Cost Implications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(generatedPlan.costImplications).map(([key, val]: [string, any]) => (
                        <div key={key} className={`p-3 rounded-lg border border-border/20 ${key === "total" ? "bg-primary/5 col-span-full" : "bg-muted/20"}`}>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 capitalize">{key}</p>
                          <p className={`text-sm font-medium mt-0.5 ${key === "total" ? "text-primary" : ""}`}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Saved Plans Sidebar */}
        <div className="space-y-4">
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Saved Plans</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {savedPlans && savedPlans.length > 0 ? (
                <div className="space-y-1.5">
                  {savedPlans.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors cursor-pointer" onClick={() => {
                      setGeneratedPlan({ phases: p.phases, riskProfile: p.riskProfile, costImplications: p.costImplications });
                      setName(p.name);
                    }}>
                      <div className="min-w-0">
                        <span className="text-xs truncate block">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60">No saved plans yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
