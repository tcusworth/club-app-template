import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Network, Search, ArrowRight, Layers, LayoutGrid, GitBranch } from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const LAYER_COLORS: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  "Connectivity": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", fill: "#3b82f6" },
  "Application": { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", fill: "#a855f7" },
  "Platform": { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/20", fill: "#14b8a6" },
  "Physical": { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", fill: "#f97316" },
  "System Management": { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20", fill: "#22c55e" },
  "Security": { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", fill: "#ef4444" },
  "Information": { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", fill: "#06b6d4" },
};

const DEFAULT_COLOR = { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", fill: "#6b7280" };

// ─── Graph Visualization Component ──────────────────────────────────
interface GraphNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  name: string;
  layer: string;
  slug: string;
  parentId: number | null;
}

function CapabilityGraph({ capabilities, onSelect }: { capabilities: any[]; onSelect: (slug: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ nodeId: number | null; offsetX: number; offsetY: number }>({ nodeId: null, offsetX: 0, offsetY: 0 });
  const hoveredRef = useRef<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Initialize nodes
  useEffect(() => {
    if (!capabilities.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    // Group by layer for initial positioning
    const layerGroups: Record<string, any[]> = {};
    capabilities.forEach(c => {
      const layer = c.opasLayer || "General";
      if (!layerGroups[layer]) layerGroups[layer] = [];
      layerGroups[layer].push(c);
    });

    const layerKeys = Object.keys(layerGroups);
    const nodes: GraphNode[] = [];

    layerKeys.forEach((layer, li) => {
      const angle = (li / layerKeys.length) * Math.PI * 2;
      const cx = w / 2 + Math.cos(angle) * (w * 0.25);
      const cy = h / 2 + Math.sin(angle) * (h * 0.25);

      layerGroups[layer].forEach((cap, ci) => {
        const subAngle = (ci / layerGroups[layer].length) * Math.PI * 2;
        const spread = Math.min(80, 30 + layerGroups[layer].length * 8);
        nodes.push({
          id: cap.id,
          x: cx + Math.cos(subAngle) * spread + (Math.random() - 0.5) * 20,
          y: cy + Math.sin(subAngle) * spread + (Math.random() - 0.5) * 20,
          vx: 0, vy: 0,
          name: cap.name,
          layer: cap.opasLayer || "General",
          slug: cap.slug,
          parentId: cap.parentId,
        });
      });
    });

    nodesRef.current = nodes;
  }, [capabilities]);

  // Animation loop with force-directed layout
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    let running = true;
    const tick = () => {
      if (!running) return;
      const nodes = nodesRef.current;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Force simulation
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        // Center gravity
        n.vx += (w / 2 - n.x) * 0.0003;
        n.vy += (h / 2 - n.y) * 0.0003;

        // Repulsion
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = Math.min(500 / (dist * dist), 2);
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
          m.vx -= (dx / dist) * force;
          m.vy -= (dy / dist) * force;
        }

        // Layer clustering
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const m = nodes[j];
          if (n.layer === m.layer) {
            const dx = m.x - n.x;
            const dy = m.y - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            n.vx += (dx / dist) * 0.08;
            n.vy += (dy / dist) * 0.08;
          }
        }

        // Parent-child attraction
        if (n.parentId) {
          const parent = nodes.find(p => p.id === n.parentId);
          if (parent) {
            const dx = parent.x - n.x;
            const dy = parent.y - n.y;
            n.vx += dx * 0.005;
            n.vy += dy * 0.005;
          }
        }
      }

      // Apply velocity with damping
      for (const n of nodes) {
        if (dragRef.current.nodeId === n.id) continue;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(40, Math.min(w - 40, n.x));
        n.y = Math.max(40, Math.min(h - 40, n.y));
      }

      // Draw
      ctx.clearRect(0, 0, w, h);

      // Draw edges (parent-child + same-layer)
      ctx.lineWidth = 0.5;
      for (const n of nodes) {
        if (n.parentId) {
          const parent = nodes.find(p => p.id === n.parentId);
          if (parent) {
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(parent.x, parent.y);
            ctx.stroke();
          }
        }
      }

      // Draw same-layer connections (light)
      const layerNodes: Record<string, GraphNode[]> = {};
      for (const n of nodes) {
        if (!layerNodes[n.layer]) layerNodes[n.layer] = [];
        layerNodes[n.layer].push(n);
      }
      for (const layer of Object.keys(layerNodes)) {
        const ln = layerNodes[layer];
        if (ln.length < 2) continue;
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        for (let i = 0; i < ln.length; i++) {
          for (let j = i + 1; j < ln.length; j++) {
            const dx = ln[i].x - ln[j].x;
            const dy = ln[i].y - ln[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              ctx.beginPath();
              ctx.moveTo(ln[i].x, ln[i].y);
              ctx.lineTo(ln[j].x, ln[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const color = LAYER_COLORS[n.layer]?.fill || DEFAULT_COLOR.fill;
        const isHovered = hoveredRef.current === n.id;
        const radius = isHovered ? 8 : 6;

        // Glow
        if (isHovered) {
          ctx.shadowBlur = 16;
          ctx.shadowColor = color;
        }

        ctx.fillStyle = color;
        ctx.globalAlpha = isHovered ? 1 : 0.7;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Label
        if (isHovered) {
          ctx.font = "11px Inter, sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(n.name, n.x, n.y - 14);
        }
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [capabilities]);

  // Mouse handlers
  const getNodeAt = useCallback((x: number, y: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const dx = nodes[i].x - x;
      const dy = nodes[i].y - y;
      if (dx * dx + dy * dy < 100) return nodes[i];
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragRef.current.nodeId !== null) {
      const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }

    const node = getNodeAt(x, y);
    hoveredRef.current = node?.id ?? null;
    setHoveredNode(node);
    canvas.style.cursor = node ? "pointer" : "default";
  }, [getNodeAt]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (node) {
      dragRef.current = { nodeId: node.id, offsetX: 0, offsetY: 0 };
    }
  }, [getNodeAt]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.nodeId !== null) {
      const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
      if (node && hoveredRef.current === node.id) {
        onSelect(node.slug);
      }
    }
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
  }, [onSelect]);

  // Layer legend
  const activeLayers = useMemo(() => {
    const set = new Set(capabilities.map(c => c.opasLayer || "General"));
    return Array.from(set).sort();
  }, [capabilities]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-[500px] rounded-lg border border-border/30 bg-card/30"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          hoveredRef.current = null;
          setHoveredNode(null);
          dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
        }}
      />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {activeLayers.map(layer => {
          const color = LAYER_COLORS[layer]?.fill || DEFAULT_COLOR.fill;
          return (
            <div key={layer} className="flex items-center gap-1.5 px-2 py-1 rounded bg-background/80 backdrop-blur-sm border border-border/30 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {layer}
            </div>
          );
        })}
      </div>
      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute top-3 right-3 px-3 py-2 rounded-lg bg-background/90 backdrop-blur-sm border border-border/30">
          <p className="text-xs font-medium">{hoveredNode.name}</p>
          <p className="text-[10px] text-muted-foreground">{hoveredNode.layer} Layer</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function Capabilities() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  const { data: capabilities, isLoading } = trpc.capabilities.list.useQuery();

  const layers = useMemo(() => {
    if (!capabilities) return [];
    const unique = Array.from(new Set(capabilities.map(c => c.opasLayer).filter(Boolean) as string[]));
    return unique.sort();
  }, [capabilities]);

  const filtered = useMemo(() => {
    if (!capabilities) return [];
    let result = capabilities;
    if (layerFilter !== "all") result = result.filter(c => c.opasLayer === layerFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    return result;
  }, [capabilities, search, layerFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(c => {
      const layer = c.opasLayer || "General";
      if (!groups[layer]) groups[layer] = [];
      groups[layer].push(c);
    });
    return groups;
  }, [filtered]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-pulse text-muted-foreground text-sm">Loading capabilities...</div></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">O-PAS Capabilities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Capability-centric navigation mapped to O-PAS architecture layers</p>
        </div>
        <div className="flex gap-1 border border-border/30 rounded-lg p-0.5">
          <Button
            variant={viewMode === "graph" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("graph")}
          >
            <GitBranch className="h-3.5 w-3.5 mr-1" /> Graph
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("list")}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> List
          </Button>
        </div>
      </div>

      {/* Graph View */}
      {viewMode === "graph" && capabilities && capabilities.length > 0 && (
        <CapabilityGraph
          capabilities={capabilities}
          onSelect={(slug) => setLocation(`/capabilities/${slug}`)}
        />
      )}

      {/* Filters (list view) */}
      {viewMode === "list" && (
        <>
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search capabilities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setLayerFilter("all")}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${layerFilter === "all" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                All Layers
              </button>
              {layers.map(l => (
                <button
                  key={l}
                  onClick={() => setLayerFilter(l!)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-colors ${layerFilter === l ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16">
              <Network className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No capabilities found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Capabilities will be populated by administrators</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([layer, caps]) => (
                <div key={layer}>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-medium">{layer}</h2>
                    <Badge variant="secondary" className="text-[10px]">{caps.length}</Badge>
                  </div>
                  <div className="grid gap-2">
                    {caps.map(cap => {
                      const colors = LAYER_COLORS[layer] || DEFAULT_COLOR;
                      return (
                        <Card
                          key={cap.id}
                          className="card-glow cursor-pointer border-border/30 hover:border-border/60 transition-all"
                          onClick={() => setLocation(`/capabilities/${cap.slug}`)}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className={`p-2 rounded-lg shrink-0 ${colors.bg} ${colors.text}`}>
                              <Network className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium">{cap.name}</h3>
                              {cap.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cap.description}</p>}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state for graph */}
      {viewMode === "graph" && (!capabilities || capabilities.length === 0) && (
        <div className="text-center py-16">
          <Network className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No capabilities to visualize</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Capabilities will be populated by administrators</p>
        </div>
      )}
    </div>
  );
}
