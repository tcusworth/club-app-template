import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Building2, Globe, Plus, ShieldCheck, AlertCircle, HelpCircle,
  Network, CheckCircle2, XCircle, ArrowRight, Sparkles, Loader2
} from "lucide-react";
import { Streamdown } from "streamdown";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function VendorDetail({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: vendor, isLoading } = trpc.vendors.getBySlug.useQuery({ slug });
  const { data: allClaims, refetch: refetchClaims } = trpc.vendors.claims.list.useQuery({});
  const { data: capabilities } = trpc.capabilities.list.useQuery();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [challengeClaimId, setChallengeClaimId] = useState<number | null>(null);
  const [challengeReason, setChallengeReason] = useState("");
  const [selectedCap, setSelectedCap] = useState<string>("");
  const [claimText, setClaimText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evaluatingClaimId, setEvaluatingClaimId] = useState<number | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);

  const evaluateClaim = trpc.ai.evaluateClaim.useMutation({
    onSuccess: (data) => {
      setEvaluationResult(data.evaluation);
      setEvaluationDialogOpen(true);
      setEvaluatingClaimId(null);
    },
    onError: (err) => {
      toast.error("Evaluation failed: " + err.message);
      setEvaluatingClaimId(null);
    },
  });

  const vendorClaims = allClaims?.filter(c => c.vendorId === vendor?.id) ?? [];

  // Capabilities supported aggregation
  const capabilitiesSummary = useMemo(() => {
    if (!capabilities || !vendorClaims.length) return { verified: [], unverified: [], challenged: [] };
    const verified: any[] = [];
    const unverified: any[] = [];
    const challenged: any[] = [];

    vendorClaims.forEach(claim => {
      const cap = capabilities.find(c => c.id === claim.capabilityId);
      if (!cap) return;
      const entry = { ...cap, claimStatus: claim.status, claimId: claim.id };
      if (claim.status === "verified") verified.push(entry);
      else if (claim.status === "challenged") challenged.push(entry);
      else unverified.push(entry);
    });

    return { verified, unverified, challenged };
  }, [capabilities, vendorClaims]);

  const createClaim = trpc.vendors.claims.create.useMutation({
    onSuccess: () => {
      toast.success("Claim submitted — status: Unverified");
      setClaimDialogOpen(false);
      setSelectedCap("");
      setClaimText("");
      setEvidenceUrl("");
      refetchClaims();
    },
  });

  const updateStatus = trpc.vendors.claims.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Claim status updated");
      refetchClaims();
    },
  });

  const submitChallenge = trpc.vendors.claims.challenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge submitted — it will be reviewed by administrators");
      setChallengeDialogOpen(false);
      setChallengeReason("");
      setChallengeClaimId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const isAdmin = (user as any)?.role === "admin";

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground text-sm">Loading...</div></div>;
  }

  if (!vendor) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Vendor not found</p>
        <Button variant="ghost" onClick={() => setLocation("/vendors")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Registry
        </Button>
      </div>
    );
  }

  const getCapName = (capId: number) => capabilities?.find(c => c.id === capId)?.name || `Capability #${capId}`;
  const getCapSlug = (capId: number) => capabilities?.find(c => c.id === capId)?.slug;

  const statusIcon = (status: string) => {
    if (status === "verified") return <ShieldCheck className="h-3.5 w-3.5 text-green-400" />;
    if (status === "challenged") return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
    return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const statusBadge = (status: string) => {
    if (status === "verified") return <Badge className="text-[10px] bg-green-500/10 text-green-400">Verified</Badge>;
    if (status === "challenged") return <Badge className="text-[10px] bg-red-500/10 text-red-400">Challenged</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Unverified</Badge>;
  };

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => setLocation("/vendors")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Vendor Registry
      </button>

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-amber-400/10 shrink-0">
          <Building2 className="h-6 w-6 text-amber-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{vendor.name}</h1>
          {vendor.description && <p className="text-muted-foreground mt-1">{vendor.description}</p>}
          {vendor.website && (
            <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
              <Globe className="h-3 w-3" /> {vendor.website}
            </a>
          )}
        </div>
      </div>

      {/* Capabilities Supported Summary */}
      {(capabilitiesSummary.verified.length > 0 || capabilitiesSummary.unverified.length > 0 || capabilitiesSummary.challenged.length > 0) && (
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" /> Capabilities Supported
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Verified */}
            {capabilitiesSummary.verified.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs font-medium text-green-400">Verified ({capabilitiesSummary.verified.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {capabilitiesSummary.verified.map((cap: any) => (
                    <button
                      key={cap.id}
                      onClick={() => cap.slug && setLocation(`/capabilities/${cap.slug}`)}
                      className="flex items-center gap-1 px-2 py-1 rounded border border-green-500/20 bg-green-500/5 text-xs text-green-400 hover:bg-green-500/10 transition-colors"
                    >
                      <Network className="h-2.5 w-2.5" /> {cap.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Unverified */}
            {capabilitiesSummary.unverified.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Pending Verification ({capabilitiesSummary.unverified.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {capabilitiesSummary.unverified.map((cap: any) => (
                    <button
                      key={cap.id}
                      onClick={() => cap.slug && setLocation(`/capabilities/${cap.slug}`)}
                      className="flex items-center gap-1 px-2 py-1 rounded border border-border/30 bg-muted/20 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
                    >
                      <Network className="h-2.5 w-2.5" /> {cap.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Challenged */}
            {capabilitiesSummary.challenged.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs font-medium text-red-400">Challenged ({capabilitiesSummary.challenged.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {capabilitiesSummary.challenged.map((cap: any) => (
                    <button
                      key={cap.id}
                      onClick={() => cap.slug && setLocation(`/capabilities/${cap.slug}`)}
                      className="flex items-center gap-1 px-2 py-1 rounded border border-red-500/20 bg-red-500/5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Network className="h-2.5 w-2.5" /> {cap.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Claims Detail */}
      <Card className="border-border/30">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Capability Claims</CardTitle>
          {user && (
            <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1.5" /> Submit Claim</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit Capability Claim</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">O-PAS Capability</Label>
                    <Select value={selectedCap} onValueChange={setSelectedCap}>
                      <SelectTrigger><SelectValue placeholder="Select capability" /></SelectTrigger>
                      <SelectContent>
                        {capabilities?.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Claim Description</Label>
                    <Textarea value={claimText} onChange={e => setClaimText(e.target.value)} placeholder="Describe how this vendor meets the capability..." rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Evidence URL (optional)</Label>
                    <Input value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <Button onClick={() => {
                    if (!selectedCap) { toast.error("Select a capability"); return; }
                    createClaim.mutate({
                      vendorId: vendor.id,
                      capabilityId: parseInt(selectedCap),
                      claimText: claimText || undefined,
                      evidenceLinks: evidenceUrl ? [evidenceUrl] : undefined,
                    });
                  }} disabled={createClaim.isPending || !selectedCap} className="w-full">
                    {createClaim.isPending ? "Submitting..." : "Submit Claim"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {vendorClaims.length > 0 ? (
            <div className="space-y-3">
              {vendorClaims.map(claim => {
                const capSlug = getCapSlug(claim.capabilityId);
                return (
                  <div key={claim.id} className="p-4 rounded-lg bg-muted/20 border border-border/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {statusIcon(claim.status)}
                          <button
                            onClick={() => capSlug && setLocation(`/capabilities/${capSlug}`)}
                            className="text-xs font-medium flex items-center gap-1.5 hover:text-primary transition-colors"
                          >
                            <Network className="h-3 w-3 text-primary" />
                            {getCapName(claim.capabilityId)}
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                          {statusBadge(claim.status)}
                        </div>
                        {claim.claimText && <p className="text-xs text-muted-foreground mt-1">{claim.claimText}</p>}
                        {(claim.evidenceLinks as string[] | null)?.map((link, i) => (
                          <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline block mt-0.5">{link}</a>
                        ))}
                        {claim.reviewNotes && (
                          <p className="text-[11px] text-muted-foreground/70 mt-1 italic">Review: {claim.reviewNotes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {/* Admin controls */}
                        {isAdmin && claim.status !== "verified" && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] text-green-400 border-green-400/20 hover:bg-green-400/10"
                            onClick={() => updateStatus.mutate({ id: claim.id, status: "verified" })}>
                            Verify
                          </Button>
                        )}
                        {/* AI Evaluate */}
                        {user && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] text-primary border-primary/20 hover:bg-primary/10"
                            disabled={evaluateClaim.isPending && evaluatingClaimId === claim.id}
                            onClick={() => {
                              setEvaluatingClaimId(claim.id);
                              evaluateClaim.mutate({
                                claimId: claim.id,
                                vendorName: vendor.name,
                                capabilityName: getCapName(claim.capabilityId),
                                claimText: claim.claimText || "No description provided",
                                evidenceLinks: (claim.evidenceLinks as string[] | null) ?? undefined,
                              });
                            }}>
                            {evaluateClaim.isPending && evaluatingClaimId === claim.id
                              ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Evaluating...</>
                              : <><Sparkles className="h-3 w-3 mr-1" /> AI Evaluate</>}
                          </Button>
                        )}
                        {/* Community challenge — any authenticated user */}
                        {user && claim.status !== "challenged" && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-400 border-red-400/20 hover:bg-red-400/10"
                            onClick={() => {
                              if (isAdmin) {
                                updateStatus.mutate({ id: claim.id, status: "challenged" });
                              } else {
                                setChallengeClaimId(claim.id);
                                setChallengeDialogOpen(true);
                              }
                            }}>
                            Challenge
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 text-center py-6">No capability claims submitted yet</p>
          )}
        </CardContent>
      </Card>

      {/* AI Evaluation Result Dialog */}
      <Dialog open={evaluationDialogOpen} onOpenChange={setEvaluationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Claim Evaluation</DialogTitle></DialogHeader>
          <div className="mt-2 prose prose-sm prose-invert max-w-none">
            <Streamdown>{evaluationResult || ""}</Streamdown>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-3">This evaluation is AI-generated and references O-PAS capabilities. It should be used as guidance, not as a definitive assessment.</p>
        </DialogContent>
      </Dialog>

      {/* Community Challenge Dialog */}
      <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Challenge This Claim</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Provide your reasoning for challenging this vendor claim. Your challenge will be reviewed by administrators.
              Community challenges help maintain the integrity of the vendor registry.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason for Challenge</Label>
              <Textarea
                value={challengeReason}
                onChange={e => setChallengeReason(e.target.value)}
                placeholder="Explain why this claim should be challenged..."
                rows={4}
              />
            </div>
            <Button
              onClick={() => {
                if (!challengeClaimId || !challengeReason.trim()) {
                  toast.error("Please provide a reason");
                  return;
                }
                submitChallenge.mutate({
                  claimId: challengeClaimId,
                  reason: challengeReason,
                });
              }}
              disabled={!challengeReason.trim() || submitChallenge.isPending}
              className="w-full"
            >
              Submit Challenge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
