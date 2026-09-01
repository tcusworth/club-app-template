import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CLUB_NAME } from "@/lib/clubConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import {
  Cpu, Network, Radio, Gauge, Router, Thermometer, Cog,
  Plus, Save, Trash2, AlertTriangle, ArrowRight, Layers,
  GripVertical, X, Zap, Download,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

type PlacedComponent = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  riskFlags?: string[];
};

type Connection = {
  id: string;
  from: string;
  to: string;
};

const COMPONENT_TYPES = [
  { type: "dcn", label: "DCN Node", icon: Network, color: "text-blue-400 bg-blue-400/10" },
  { type: "runtime", label: "Runtime", icon: Cpu, color: "text-purple-400 bg-purple-400/10" },
  { type: "network", label: "Network Switch", icon: Router, color: "text-teal-400 bg-teal-400/10" },
  { type: "controller", label: "Controller", icon: Cog, color: "text-amber-400 bg-amber-400/10" },
  { type: "gateway", label: "Gateway", icon: Radio, color: "text-green-400 bg-green-400/10" },
  { type: "sensor", label: "Sensor", icon: Thermometer, color: "text-cyan-400 bg-cyan-400/10" },
  { type: "actuator", label: "Actuator", icon: Gauge, color: "text-orange-400 bg-orange-400/10" },
];

const RISK_RULES: Record<string, (components: PlacedComponent[]) => string | null> = {
  "No redundant DCN": (c) => c.filter(x => x.type === "dcn").length < 2 ? "Single DCN node — no redundancy. O-PAS recommends redundant DCN for availability." : null,
  "No network switch": (c) => c.filter(x => x.type === "network").length === 0 ? "No network infrastructure. DCN requires Ethernet backbone per O-PAS connectivity layer." : null,
  "Controller without gateway": (c) => {
    const hasController = c.some(x => x.type === "controller");
    const hasGateway = c.some(x => x.type === "gateway");
    return hasController && !hasGateway ? "Controller present without gateway — legacy I/O may not be accessible." : null;
  },
  "No runtime": (c) => c.filter(x => x.type === "runtime").length === 0 ? "No application runtime defined. O-PAS application layer requires at least one runtime." : null,
};

export default function ArchitectureBuilder() {
  const { user } = useAuth();
  const [components, setComponents] = useState<PlacedComponent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [connectMode, setConnectMode] = useState<string | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);

  const { data: savedList, refetch: refetchSaved } = trpc.architecture.saved.list.useQuery(undefined, { enabled: !!user });

  const saveMutation = trpc.architecture.saved.create.useMutation({
    onSuccess: () => {
      toast.success("Architecture saved");
      setSaveDialogOpen(false);
      setSaveName("");
      refetchSaved();
    },
  });

  const risks = useMemo(() => {
    return Object.entries(RISK_RULES)
      .map(([name, check]) => ({ name, message: check(components) }))
      .filter(r => r.message !== null);
  }, [components]);

  const addComponent = useCallback((type: string) => {
    const def = COMPONENT_TYPES.find(c => c.type === type);
    if (!def) return;
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setComponents(prev => [...prev, {
      id, name: def.label, type,
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300,
    }]);
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
  }, []);

  const handleCanvasClick = useCallback((compId: string) => {
    if (!connectMode) return;
    if (connectMode === compId) { setConnectMode(null); return; }
    const exists = connections.some(c =>
      (c.from === connectMode && c.to === compId) || (c.from === compId && c.to === connectMode)
    );
    if (!exists) {
      setConnections(prev => [...prev, { id: `conn-${Date.now()}`, from: connectMode, to: compId }]);
    }
    setConnectMode(null);
  }, [connectMode, connections]);

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveMutation.mutate({
      name: saveName,
      components,
      connections,
      riskSummary: risks,
    });
  };

  const exportDiagram = useCallback(() => {
    if (components.length === 0) return;
    const padding = 40;
    const minX = Math.min(...components.map(c => c.x)) - padding;
    const minY = Math.min(...components.map(c => c.y)) - padding;
    const maxX = Math.max(...components.map(c => c.x)) + 200 + padding;
    const maxY = Math.max(...components.map(c => c.y)) + 60 + padding;
    const width = maxX - minX;
    const height = maxY - minY;

    const typeColors: Record<string, string> = {
      dcn: "#60a5fa", runtime: "#c084fc", network: "#2dd4bf",
      controller: "#fbbf24", gateway: "#4ade80", sensor: "#22d3ee", actuator: "#fb923c",
    };

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`;
    svg += `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#0a0f14" />`;

    connections.forEach(conn => {
      const from = components.find(c => c.id === conn.from);
      const to = components.find(c => c.id === conn.to);
      if (from && to) {
        svg += `<line x1="${from.x + 40}" y1="${from.y + 20}" x2="${to.x + 40}" y2="${to.y + 20}" stroke="#2dd4bf" stroke-width="2" stroke-dasharray="6 3" opacity="0.4" />`;
      }
    });

    components.forEach(comp => {
      const color = typeColors[comp.type] || "#888";
      svg += `<rect x="${comp.x}" y="${comp.y}" width="140" height="40" rx="8" fill="${color}20" stroke="${color}" stroke-width="1.5" />`;
      svg += `<text x="${comp.x + 70}" y="${comp.y + 24}" text-anchor="middle" fill="${color}" font-size="12" font-family="system-ui, sans-serif">${comp.name}</text>`;
    });

    svg += `<text x="${minX + 10}" y="${maxY - 10}" fill="#666" font-size="10" font-family="system-ui">${CLUB_NAME} Architecture Diagram</text>`;
    svg += `</svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opa-architecture.svg";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Architecture diagram exported as SVG");
  }, [components, connections]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragType) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const def = COMPONENT_TYPES.find(c => c.type === dragType);
    if (!def) return;
    const id = `${dragType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setComponents(prev => [...prev, {
      id, name: def.label, type: dragType,
      x: e.clientX - rect.left - 40,
      y: e.clientY - rect.top - 20,
    }]);
    setDragType(null);
  }, [dragType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Architecture Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Design O-PAS compliant architectures with DCN, runtime, and network components</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={components.length === 0} onClick={exportDiagram}>
            <Download className="h-4 w-4 mr-1.5" /> Export SVG
          </Button>
          {user && (
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={components.length === 0}><Save className="h-4 w-4 mr-1.5" /> Save</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Save Architecture</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="My OPA Architecture" />
                  </div>
                  <Button onClick={handleSave} disabled={saveMutation.isPending || !saveName.trim()} className="w-full">
                    {saveMutation.isPending ? "Saving..." : "Save Architecture"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-4 lg:h-[calc(100vh-180px)]">
        {/* Component Palette */}
        <Card className="border-border/30">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Components</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1.5">
              {COMPONENT_TYPES.map(ct => (
                <div
                  key={ct.type}
                  draggable
                  onDragStart={() => setDragType(ct.type)}
                  onClick={() => addComponent(ct.type)}
                  className="flex items-center gap-2.5 p-2 rounded-md cursor-grab hover:bg-accent transition-colors border border-transparent hover:border-border/40 active:cursor-grabbing"
                >
                  <div className={`p-1.5 rounded ${ct.color}`}>
                    <ct.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium">{ct.label}</span>
                  <GripVertical className="h-3 w-3 text-muted-foreground/30 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card
          className="border-border/30 relative overflow-hidden"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, oklch(0.3 0.01 260) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}>
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map(conn => {
                const fromComp = components.find(c => c.id === conn.from);
                const toComp = components.find(c => c.id === conn.to);
                if (!fromComp || !toComp) return null;
                return (
                  <line
                    key={conn.id}
                    x1={fromComp.x + 40} y1={fromComp.y + 20}
                    x2={toComp.x + 40} y2={toComp.y + 20}
                    stroke="oklch(0.72 0.15 195 / 0.4)"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                  />
                );
              })}
            </svg>

            {/* Placed components */}
            {components.map(comp => {
              const def = COMPONENT_TYPES.find(c => c.type === comp.type);
              if (!def) return null;
              const isConnecting = connectMode === comp.id;
              return (
                <div
                  key={comp.id}
                  className={`absolute group cursor-pointer select-none ${isConnecting ? "ring-2 ring-primary" : ""}`}
                  style={{ left: comp.x, top: comp.y }}
                  onClick={() => handleCanvasClick(comp.id)}
                  draggable
                  onDrag={(e) => {
                    if (e.clientX === 0 && e.clientY === 0) return;
                    const canvas = e.currentTarget.parentElement;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, x: e.clientX - rect.left - 40, y: e.clientY - rect.top - 20 } : c));
                  }}
                >
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-card/90 backdrop-blur-sm hover:border-primary/30 transition-all shadow-sm`}>
                    <div className={`p-1 rounded ${def.color}`}>
                      <def.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap">{comp.name}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConnectMode(comp.id); }}
                        className="p-0.5 rounded hover:bg-primary/20"
                        title="Connect"
                      >
                        <Zap className="h-3 w-3 text-primary" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeComponent(comp.id); }}
                        className="p-0.5 rounded hover:bg-destructive/20"
                        title="Remove"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {components.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Layers className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground/40">Drag components here or click to add</p>
                  <p className="text-xs text-muted-foreground/30 mt-1">Build your O-PAS architecture</p>
                </div>
              </div>
            )}
          </div>
          {connectMode && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary">
              Click another component to connect
            </div>
          )}
        </Card>

        {/* Right Panel — Risks & Saved */}
        <div className="space-y-4 overflow-y-auto">
          {/* Risk Flags */}
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {risks.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">
                  {components.length === 0 ? "Add components to see risk analysis" : "No risks detected"}
                </p>
              ) : (
                <div className="space-y-2">
                  {risks.map((r, i) => (
                    <div key={i} className="p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                      <p className="text-xs text-amber-300/80">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-md bg-muted/30 text-center">
                  <p className="text-lg font-semibold">{components.length}</p>
                  <p className="text-[10px] text-muted-foreground">Components</p>
                </div>
                <div className="p-2 rounded-md bg-muted/30 text-center">
                  <p className="text-lg font-semibold">{connections.length}</p>
                  <p className="text-[10px] text-muted-foreground">Connections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saved Architectures */}
          {savedList && savedList.length > 0 && (
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Saved</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1.5">
                  {savedList.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors cursor-pointer" onClick={() => {
                      setComponents((s.components as PlacedComponent[]) || []);
                      setConnections((s.connections as Connection[]) || []);
                      toast.info(`Loaded: ${s.name}`);
                    }}>
                      <span className="text-xs truncate">{s.name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
