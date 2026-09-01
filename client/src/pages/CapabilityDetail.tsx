import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Network, CheckCircle2, Building2, Layers, FileText, ArrowRight, Link2 } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo } from "react";

export default function CapabilityDetail({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  const { data: capability, isLoading } = trpc.capabilities.getBySlug.useQuery({ slug });
  const { data: requirements } = trpc.capabilities.requirements.useQuery(
    { capabilityId: capability?.id ?? 0 },
    { enabled: !!capability?.id }
  );
  const { data: claims } = trpc.vendors.claims.list.useQuery({});
  const { data: allContent } = trpc.content.list.useQuery({ status: "published" });
  const { data: allCapabilities } = trpc.capabilities.list.useQuery();

  const capClaims = claims?.filter(c => c.capabilityId === capability?.id) ?? [];

  // Find content nodes that link to this capability
  const relatedContent = useMemo(() => {
    if (!allContent || !capability) return [];
    return allContent.filter(node => {
      const linked = (node.linkedCapabilities as number[] | null) || [];
      return linked.includes(capability.id);
    });
  }, [allContent, capability]);

  // Find sibling capabilities (same layer)
  const siblingCaps = useMemo(() => {
    if (!allCapabilities || !capability) return [];
    return allCapabilities.filter(c =>
      c.id !== capability.id &&
      c.opasLayer === capability.opasLayer &&
      c.opasLayer
    ).slice(0, 6);
  }, [allCapabilities, capability]);

  // Find child capabilities (parentId = this)
  const childCaps = useMemo(() => {
    if (!allCapabilities || !capability) return [];
    return allCapabilities.filter(c => c.parentId === capability.id);
  }, [allCapabilities, capability]);

  // Find parent capability
  const parentCap = useMemo(() => {
    if (!allCapabilities || !capability?.parentId) return null;
    return allCapabilities.find(c => c.id === capability.parentId) ?? null;
  }, [allCapabilities, capability]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground text-sm">Loading...</div></div>;
  }

  if (!capability) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Capability not found</p>
        <Button variant="ghost" onClick={() => setLocation("/capabilities")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Capabilities
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <button onClick={() => setLocation("/capabilities")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Capabilities
      </button>

      <div>
        <div className="flex items-center gap-2 mb-2">
          {capability.opasLayer && <Badge variant="secondary" className="text-xs"><Layers className="h-3 w-3 mr-1" />{capability.opasLayer}</Badge>}
          {parentCap && (
            <button onClick={() => setLocation(`/capabilities/${parentCap.slug}`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Link2 className="h-3 w-3" /> {parentCap.name}
            </button>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{capability.name}</h1>
        {capability.description && <p className="text-muted-foreground mt-1">{capability.description}</p>}
      </div>

      {/* Child Capabilities */}
      {childCaps.length > 0 && (
        <Card className="border-border/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" /> Sub-Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {childCaps.map(child => (
                <button
                  key={child.id}
                  onClick={() => setLocation(`/capabilities/${child.slug}`)}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="p-1.5 rounded bg-primary/10 shrink-0">
                    <Network className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{child.name}</p>
                    {child.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{child.description}</p>}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requirements && requirements.length > 0 ? (
            <div className="space-y-3">
              {requirements.map(req => (
                <div key={req.id} className="p-3 rounded-lg bg-muted/30 border border-border/20">
                  <p className="text-sm">{req.definition}</p>
                  {req.validationCriteria && (
                    <p className="text-xs text-muted-foreground mt-1.5">Validation: {req.validationCriteria}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No requirements defined yet</p>
          )}
        </CardContent>
      </Card>



      {/* Vendor Claims for this capability */}
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" /> Vendor Claims
          </CardTitle>
        </CardHeader>
        <CardContent>
          {capClaims.length > 0 ? (
            <div className="space-y-2">
              {capClaims.map(claim => (
                <div key={claim.id} className="p-3 rounded-lg bg-muted/30 border border-border/20 flex items-center justify-between">
                  <div>
                    <p className="text-sm">{claim.claimText || "No description"}</p>
                  </div>
                  <Badge variant={claim.status === "verified" ? "default" : claim.status === "challenged" ? "destructive" : "secondary"} className="text-xs shrink-0 ml-3">
                    {claim.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No vendor claims for this capability</p>
          )}
        </CardContent>
      </Card>

      {/* Related Capabilities (same layer) */}
      {siblingCaps.length > 0 && (
        <Card className="border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-400" /> Related Capabilities ({capability.opasLayer} Layer)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {siblingCaps.map(sib => (
                <button
                  key={sib.id}
                  onClick={() => setLocation(`/capabilities/${sib.slug}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 hover:border-sky-400/30 hover:bg-sky-400/5 transition-all text-xs"
                >
                  <Network className="h-3 w-3 text-sky-400" />
                  {sib.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
