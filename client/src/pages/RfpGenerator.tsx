import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, ArrowRight, CheckCircle2, Copy } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function RfpGenerator() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [selectedCaps, setSelectedCaps] = useState<number[]>([]);
  const [projectContext, setProjectContext] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string>("");

  const { data: capabilities } = trpc.capabilities.list.useQuery();
  const { data: savedRfps, refetch } = trpc.rfp.list.useQuery(undefined, { enabled: !!user });

  const generateMutation = trpc.rfp.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast.success("RFP document generated");
      refetch();
    },
    onError: () => toast.error("Failed to generate RFP"),
  });

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

  const toggleCap = (id: number) => {
    setSelectedCaps(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleGenerate = () => {
    if (!name.trim()) { toast.error("Please enter a document name"); return; }
    if (selectedCaps.length === 0) { toast.error("Select at least one capability"); return; }
    generateMutation.mutate({ name, selectedCapabilities: selectedCaps, projectContext: projectContext || undefined });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Procurement & RFP Generator</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate vendor-neutral RFP language tied to O-PAS capabilities</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          {/* Config */}
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">RFP Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Document Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., OPA Platform RFP - Q2 2026" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Project Context (optional)</Label>
                <Textarea value={projectContext} onChange={e => setProjectContext(e.target.value)} placeholder="Describe the project scope, timeline, and any specific requirements..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Capability Selection */}
          <Card className="border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select O-PAS Capabilities</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedCaps.length} selected</p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {Object.entries(capsByLayer).map(([layer, caps]) => (
                  <div key={layer} className="mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">{layer}</p>
                    <div className="space-y-1">
                      {caps.map(cap => (
                        <div key={cap.id} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors">
                          <Checkbox
                            checked={selectedCaps.includes(cap.id)}
                            onCheckedChange={() => toggleCap(cap.id)}
                            id={`cap-${cap.id}`}
                          />
                          <label htmlFor={`cap-${cap.id}`} className="text-xs cursor-pointer flex-1">{cap.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!capabilities || capabilities.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-4">No capabilities available. Add capabilities first.</p>
                ) : null}
              </ScrollArea>
            </CardContent>
          </Card>

          <Button onClick={handleGenerate} disabled={generateMutation.isPending || !name.trim() || selectedCaps.length === 0} className="w-full">
            {generateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating RFP...</> : "Generate RFP Document"}
          </Button>

          {/* Generated Content */}
          {generatedContent && (
            <Card className="border-border/30">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Generated RFP
                </CardTitle>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                </Button>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none">
                  <Streamdown>{generatedContent}</Streamdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Saved RFPs */}
        <Card className="border-border/30 h-fit">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Saved Documents</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {savedRfps && savedRfps.length > 0 ? (
              <div className="space-y-1.5">
                {savedRfps.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors cursor-pointer" onClick={() => {
                    setGeneratedContent(r.generatedContent || "");
                    setName(r.name);
                  }}>
                    <div className="min-w-0">
                      <span className="text-xs truncate block">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60">No saved documents yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
