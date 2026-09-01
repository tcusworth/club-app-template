import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, FolderKanban, Plus, FileText, Users, Upload, Image, Film,
  Calendar, MessageSquare, Network, Download, Copy, Layers, Building2,
  ShieldCheck, AlertCircle, HelpCircle, ExternalLink
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── Shared Architecture Diagrams ─────────────────────────────────
function SharedArchitectures({ projectId }: { projectId: number }) {
  const [, setLocation] = useLocation();
  const { data: savedArchitectures } = trpc.architecture.saved.list.useQuery();
  const projectArchitectures = savedArchitectures?.filter(a => a.projectId === projectId) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Project Architectures</h3>
        <Button size="sm" variant="outline" onClick={() => setLocation("/architecture")}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Create in Builder
        </Button>
      </div>
      {projectArchitectures.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projectArchitectures.map(arch => {
            const components = (arch.components as any[]) || [];
            return (
              <Card key={arch.id} className="border-border/30 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setLocation("/architecture")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">{arch.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{components.length} components</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Last updated: {new Date(arch.updatedAt).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-2">No architectures linked to this project yet</p>
          <p className="text-[10px] text-muted-foreground/60">Create an architecture in the Builder and assign it to this project</p>
        </div>
      )}
    </div>
  );
}

// ─── Vendor Evaluation Board ──────────────────────────────────────
function VendorEvaluationBoard() {
  const [, setLocation] = useLocation();
  const { data: vendors } = trpc.vendors.list.useQuery();
  const { data: allClaims } = trpc.vendors.claims.list.useQuery({});
  const { data: capabilities } = trpc.capabilities.list.useQuery();

  const vendorSummaries = useMemo(() => {
    if (!vendors || !allClaims) return [];
    return vendors.map(v => {
      const claims = allClaims.filter(c => c.vendorId === v.id);
      const verified = claims.filter(c => c.status === "verified").length;
      const challenged = claims.filter(c => c.status === "challenged").length;
      const unverified = claims.filter(c => c.status === "unverified").length;
      return { ...v, claims, verified, challenged, unverified, total: claims.length };
    }).filter(v => v.total > 0).sort((a, b) => b.verified - a.verified);
  }, [vendors, allClaims]);

  const getCapName = (capId: number) => capabilities?.find(c => c.id === capId)?.name || `#${capId}`;

  const statusIcon = (status: string) => {
    if (status === "verified") return <ShieldCheck className="h-3 w-3 text-green-400" />;
    if (status === "challenged") return <AlertCircle className="h-3 w-3 text-red-400" />;
    return <HelpCircle className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-400" /> Vendor Evaluation Board</h3>
        <Button size="sm" variant="outline" onClick={() => setLocation("/vendors")}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Full Registry
        </Button>
      </div>
      {vendorSummaries.length > 0 ? (
        <div className="space-y-3">
          {vendorSummaries.map(v => (
            <Card key={v.id} className="border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setLocation(`/vendors/${v.slug}`)} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-400" /> {v.name}
                  </button>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-green-400">{v.verified} verified</span>
                    <span className="text-muted-foreground">{v.unverified} pending</span>
                    {v.challenged > 0 && <span className="text-red-400">{v.challenged} challenged</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {v.claims.slice(0, 8).map(claim => (
                    <div key={claim.id} className="flex items-center gap-1 px-2 py-0.5 rounded border border-border/20 bg-muted/20 text-[10px]">
                      {statusIcon(claim.status)}
                      <span>{getCapName(claim.capabilityId)}</span>
                    </div>
                  ))}
                  {v.claims.length > 8 && <span className="text-[10px] text-muted-foreground px-2 py-0.5">+{v.claims.length - 8} more</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No vendors with capability claims yet</p>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id });
  const { data: members } = trpc.projects.members.useQuery({ projectId: id });
  const { data: decisions, refetch: refetchDecisions } = trpc.projects.decisions.list.useQuery({ projectId: id });
  const { data: media, refetch: refetchMedia } = trpc.projects.media.useQuery({ projectId: id });
  const { data: capabilities } = trpc.capabilities.list.useQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [decDialogOpen, setDecDialogOpen] = useState(false);
  const [decTitle, setDecTitle] = useState("");
  const [decDesc, setDecDesc] = useState("");
  const [decDecision, setDecDecision] = useState("");
  const [decRationale, setDecRationale] = useState("");
  const [decLinkedCaps, setDecLinkedCaps] = useState<number[]>([]);

  const capsByLayer = useMemo(() => {
    if (!capabilities) return {};
    const groups: Record<string, typeof capabilities> = {};
    capabilities.forEach(c => {
      const layer = c.opasLayer || "General";
      if (!groups[layer]) groups[layer] = [];
      groups[layer].push(c);
    });
    return groups;
  }, [capabilities]);

  const createDecision = trpc.projects.decisions.create.useMutation({
    onSuccess: () => {
      toast.success("Decision logged");
      setDecDialogOpen(false);
      setDecTitle(""); setDecDesc(""); setDecDecision(""); setDecRationale(""); setDecLinkedCaps([]);
      refetchDecisions();
    },
  });

  const uploadFile = trpc.upload.file.useMutation({
    onSuccess: () => { toast.success("File uploaded to project"); refetchMedia(); setUploading(false); },
    onError: () => { toast.error("Upload failed"); setUploading(false); },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFile.mutate({ fileName: file.name, mimeType: file.type, base64Data: base64, projectId: id });
    };
    reader.readAsDataURL(file);
  };

  const toggleCap = (capId: number) => {
    setDecLinkedCaps(prev => prev.includes(capId) ? prev.filter(i => i !== capId) : [...prev, capId]);
  };

  const getCapName = (capId: number) => capabilities?.find(c => c.id === capId)?.name || `#${capId}`;
  const getCapSlug = (capId: number) => capabilities?.find(c => c.id === capId)?.slug;

  // Export decision log as Markdown
  const exportDecisionLog = () => {
    if (!decisions || !project) return;
    let md = `# Decision Log: ${project.name}\n\n`;
    md += `*Exported ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    decisions.forEach((dec, i) => {
      md += `## ${i + 1}. ${dec.title}\n\n`;
      md += `**Date:** ${new Date(dec.createdAt).toLocaleDateString()}\n\n`;
      if (dec.description) md += `**Context:** ${dec.description}\n\n`;
      if (dec.decision) md += `**Decision:** ${dec.decision}\n\n`;
      if (dec.rationale) md += `**Rationale:** ${dec.rationale}\n\n`;
      const linked = (dec.linkedCapabilities as number[] | null) || [];
      if (linked.length > 0) {
        md += `**Linked Capabilities:** ${linked.map(id => getCapName(id)).join(", ")}\n\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decision-log-${project.name.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Decision log exported");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground text-sm">Loading...</div></div>;
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Project not found or access denied</p>
        <Button variant="ghost" onClick={() => setLocation("/projects")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <button onClick={() => setLocation("/projects")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Projects
      </button>

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-violet-400/10 shrink-0">
          <FolderKanban className="h-6 w-6 text-violet-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {members?.length || 0} members</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="decisions" className="w-full">
        <TabsList>
          <TabsTrigger value="decisions">Decision Log</TabsTrigger>
          <TabsTrigger value="architectures">Architectures</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Evaluation</TabsTrigger>
          <TabsTrigger value="files">Files & Media</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        {/* Decision Log Tab */}
        <TabsContent value="decisions" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            {decisions && decisions.length > 0 && (
              <Button size="sm" variant="outline" onClick={exportDecisionLog}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
            )}
            <Dialog open={decDialogOpen} onOpenChange={setDecDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Log Decision</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Log Decision</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input value={decTitle} onChange={e => setDecTitle(e.target.value)} placeholder="Decision title" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Context</Label>
                    <Textarea value={decDesc} onChange={e => setDecDesc(e.target.value)} placeholder="What prompted this decision?" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Decision</Label>
                    <Textarea value={decDecision} onChange={e => setDecDecision(e.target.value)} placeholder="What was decided?" rows={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rationale</Label>
                    <Textarea value={decRationale} onChange={e => setDecRationale(e.target.value)} placeholder="Why was this decision made?" rows={2} />
                  </div>
                  {/* Linked Capabilities */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5"><Network className="h-3 w-3" /> Related Capabilities</Label>
                    {decLinkedCaps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {decLinkedCaps.map(capId => (
                          <Badge key={capId} className="text-[10px] bg-primary/10 text-primary">
                            {getCapName(capId)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <ScrollArea className="h-28 rounded-md border border-border/30 p-2">
                      {Object.entries(capsByLayer).map(([layer, caps]) => (
                        <div key={layer} className="mb-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{layer}</p>
                          {caps.map(cap => (
                            <label key={cap.id} className="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-accent/50 cursor-pointer">
                              <Checkbox checked={decLinkedCaps.includes(cap.id)} onCheckedChange={() => toggleCap(cap.id)} />
                              <span className="text-xs">{cap.name}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                  <Button onClick={() => {
                    if (!decTitle.trim()) return;
                    createDecision.mutate({
                      projectId: id,
                      title: decTitle,
                      description: decDesc || undefined,
                      decision: decDecision || undefined,
                      rationale: decRationale || undefined,
                      linkedCapabilities: decLinkedCaps.length > 0 ? decLinkedCaps : undefined,
                    });
                  }} disabled={createDecision.isPending || !decTitle.trim()} className="w-full">
                    {createDecision.isPending ? "Saving..." : "Log Decision"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {decisions && decisions.length > 0 ? (
            <div className="space-y-3">
              {decisions.map(dec => {
                const linked = (dec.linkedCapabilities as number[] | null) || [];
                return (
                  <Card key={dec.id} className="border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-medium">{dec.title}</h3>
                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(dec.createdAt).toLocaleDateString()}</span>
                      </div>
                      {dec.description && <p className="text-xs text-muted-foreground mb-2">{dec.description}</p>}
                      {dec.decision && (
                        <div className="p-2 rounded bg-primary/5 border border-primary/10 mb-2">
                          <p className="text-xs font-medium text-primary/80">Decision: {dec.decision}</p>
                        </div>
                      )}
                      {dec.rationale && <p className="text-xs text-muted-foreground italic mb-2">Rationale: {dec.rationale}</p>}
                      {linked.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Network className="h-3 w-3 text-primary/60" />
                          {linked.map(capId => {
                            const slug = getCapSlug(capId);
                            return (
                              <button
                                key={capId}
                                onClick={() => slug && setLocation(`/capabilities/${slug}`)}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                              >
                                {getCapName(capId)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No decisions logged yet</p>
            </div>
          )}
        </TabsContent>

        {/* Architectures Tab */}
        <TabsContent value="architectures" className="mt-4 space-y-4">
          <SharedArchitectures projectId={id} />
        </TabsContent>

        {/* Vendor Evaluation Tab */}
        <TabsContent value="vendors" className="mt-4 space-y-4">
          <VendorEvaluationBoard />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx" />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
          {media && media.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {media.map(m => (
                <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer">
                  <Card className="card-glow border-border/30 overflow-hidden">
                    {m.mimeType.startsWith("image/") ? (
                      <img src={m.url} alt={m.fileName} className="w-full h-32 object-cover" />
                    ) : m.mimeType.startsWith("video/") ? (
                      <div className="w-full h-32 bg-muted flex items-center justify-center"><Film className="h-8 w-8 text-muted-foreground/40" /></div>
                    ) : (
                      <div className="w-full h-32 bg-muted flex items-center justify-center"><FileText className="h-8 w-8 text-muted-foreground/40" /></div>
                    )}
                    <CardContent className="p-2">
                      <p className="text-xs truncate text-muted-foreground">{m.fileName}</p>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Image className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No files uploaded yet</p>
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4">
          {members && members.length > 0 ? (
            <div className="space-y-2">
              {members.map(m => (
                <Card key={m.id} className="border-border/30">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {m.user?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.user?.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{m.user?.email || ""}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] capitalize">{m.memberRole}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No members found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
