import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Search, ArrowRight, Globe, ShieldCheck, AlertCircle, HelpCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  unverified: { color: "bg-muted text-muted-foreground", icon: HelpCircle },
  verified: { color: "bg-green-500/10 text-green-400", icon: ShieldCheck },
  challenged: { color: "bg-red-500/10 text-red-400", icon: AlertCircle },
};

export default function Vendors() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newWebsite, setNewWebsite] = useState("");

  const { data: vendors, refetch } = trpc.vendors.list.useQuery();
  const { data: allClaims } = trpc.vendors.claims.list.useQuery({});

  const createVendor = trpc.vendors.create.useMutation({
    onSuccess: () => {
      toast.success("Vendor submitted");
      setDialogOpen(false);
      setNewName("");
      setNewDesc("");
      setNewWebsite("");
      refetch();
    },
  });

  const filtered = useMemo(() => {
    if (!vendors) return [];
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(v => v.name.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
  }, [vendors, search]);

  const getVendorClaimStats = (vendorId: number) => {
    if (!allClaims) return { total: 0, verified: 0, challenged: 0, unverified: 0 };
    const vc = allClaims.filter(c => c.vendorId === vendorId);
    return {
      total: vc.length,
      verified: vc.filter(c => c.status === "verified").length,
      challenged: vc.filter(c => c.status === "challenged").length,
      unverified: vc.filter(c => c.status === "unverified").length,
    };
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    createVendor.mutate({
      name: newName,
      slug: slug + "-" + Date.now(),
      description: newDesc || undefined,
      website: newWebsite || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vendor Capability Registry</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Neutral, evidence-based vendor profiles mapped to O-PAS capabilities</p>
        </div>
        {user && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Submit Vendor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit Vendor Profile</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Vendor Name</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Company name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Website</Label>
                  <Input value={newWebsite} onChange={e => setNewWebsite(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of vendor's O-PAS offerings" rows={3} />
                </div>
                <Button onClick={handleCreate} disabled={createVendor.isPending || !newName.trim()} className="w-full">
                  {createVendor.isPending ? "Submitting..." : "Submit Vendor"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {/* Vendor Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No vendors found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Submit a vendor profile to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(vendor => {
            const stats = getVendorClaimStats(vendor.id);
            return (
              <Card
                key={vendor.id}
                className="card-glow cursor-pointer border-border/30 hover:border-border/60 transition-all"
                onClick={() => setLocation(`/vendors/${vendor.slug}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-amber-400/10 shrink-0">
                    <Building2 className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">{vendor.name}</h3>
                      {vendor.website && <Globe className="h-3 w-3 text-muted-foreground/40" />}
                    </div>
                    {vendor.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{vendor.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      {stats.total > 0 && (
                        <>
                          <Badge variant="secondary" className="text-[10px]">{stats.total} claims</Badge>
                          {stats.verified > 0 && <Badge className="text-[10px] bg-green-500/10 text-green-400">{stats.verified} verified</Badge>}
                          {stats.challenged > 0 && <Badge className="text-[10px] bg-red-500/10 text-red-400">{stats.challenged} challenged</Badge>}
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
