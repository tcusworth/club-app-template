import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CLUB_NAME } from "@/lib/clubConfig";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { CategoryPill } from "@/components/dashboard/ListCard";
import { hueFor } from "@/lib/categoryColors";
import {
  Briefcase, ClipboardCheck, GraduationCap, Compass,
  Calendar, Send, ShieldCheck, Users, Star,
  ChevronRight, Clock, CheckCircle2, XCircle, Phone, Mail,
  MessageSquare, Settings, AlertCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, any> = {
  architecture_review: ClipboardCheck,
  custom_training: GraduationCap,
  implementation_advisory: Compass,
};

const SERVICE_LABELS: Record<string, string> = {
  architecture_review: "Architecture Review",
  custom_training: "Custom Training",
  implementation_advisory: "Implementation Advisory",
};

const SERVICE_COLORS: Record<string, { icon: string; badge: string; border: string }> = {
  architecture_review: {
    icon: "text-blue-500 bg-blue-500/10",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    border: "border-blue-500/20",
  },
  custom_training: {
    icon: "text-emerald-500 bg-emerald-500/10",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    border: "border-emerald-500/20",
  },
  implementation_advisory: {
    icon: "text-purple-500 bg-purple-500/10",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    border: "border-purple-500/20",
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: "New", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", icon: AlertCircle },
  contacted: { label: "Contacted", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: MessageSquare },
  scheduled: { label: "Scheduled", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", icon: Calendar },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: XCircle },
};

// ─── Inquiry Dialog ───────────────────────────────────────────────────────────

function InquiryDialog({
  service,
  open,
  onClose,
}: {
  service: any;
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    email: user?.email || "",
    phone: "",
    message: "",
    preferredDate: "",
  });

  const inquireMutation = trpc.consulting.inquire.useMutation({
    onSuccess: () => {
      toast.success("Inquiry submitted! We'll be in touch within 1–2 business days.");
      utils.consulting.services.invalidate();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!service) return null;

  const colors = SERVICE_COLORS[service.serviceType] || SERVICE_COLORS.architecture_review;
  const Icon = SERVICE_ICONS[service.serviceType] || Briefcase;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${colors.icon}`}>
              <Icon className="h-4 w-4" />
            </div>
            Request Consultation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Service Summary */}
          <div className={`p-4 rounded-lg border bg-card ${colors.border}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{service.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{SERVICE_LABELS[service.serviceType]}</p>
              </div>
              {service.duration && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {service.duration}
                </div>
              )}
            </div>
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="your@email.com"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Preferred Date</label>
              <Input
                type="date"
                value={form.preferredDate}
                onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Tell us about your project and goals
            </label>
            <Textarea
              placeholder="Describe your current environment, specific challenges, and what you hope to achieve..."
              rows={4}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!form.email || inquireMutation.isPending}
              onClick={() =>
                inquireMutation.mutate({
                  serviceId: service.id,
                  email: form.email.trim(),
                  phone: form.phone || undefined,
                  message: form.message || undefined,
                  preferredDate: form.preferredDate || undefined,
                })
              }
            >
              {inquireMutation.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Submit Inquiry
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Inquiry Panel ──────────────────────────────────────────────────────

function AdminInquiryPanel() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const utils = trpc.useUtils();

  const { data: inquiries, isLoading } = trpc.consulting.inquiries.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : {}
  );

  const updateMutation = trpc.consulting.updateInquiryStatus.useMutation({
    onSuccess: () => {
      toast.success("Inquiry updated.");
      utils.consulting.inquiries.invalidate();
      setSelectedInquiry(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleOpenInquiry = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setAdminNotes(inquiry.adminNotes || "");
    setNewStatus(inquiry.status);
  };

  const statusCounts = (inquiries || []).reduce((acc: Record<string, number>, inq: any) => {
    acc[inq.status] = (acc[inq.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
              className={`p-3 rounded-lg border text-left transition-all ${
                statusFilter === key
                  ? `${cfg.color} border-current`
                  : "bg-card border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{cfg.label}</span>
              </div>
              <p className="text-xl font-bold">{statusCounts[key] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${(inquiries || []).length} inquiries`}
        </span>
      </div>

      {/* Inquiries Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (inquiries || []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No inquiries yet</p>
          <p className="text-sm mt-1">Inquiries will appear here when members submit them.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Preferred Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(inquiries || []).map((inq: any) => {
                const cfg = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
                const StatusIcon = cfg.icon;
                return (
                  <TableRow key={inq.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{inq.serviceName || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {SERVICE_LABELS[inq.serviceType] || ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{inq.userName || "Member"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{inq.email}</p>
                        {inq.phone && <p className="text-xs text-muted-foreground">{inq.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {inq.preferredDate
                          ? new Date(inq.preferredDate).toLocaleDateString()
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(inq.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenInquiry(inq)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Inquiry Detail Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inquiry #{selectedInquiry?.id}</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4 mt-2">
              {/* Service + Member Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-0.5">Service</p>
                  <p className="text-sm font-medium">{selectedInquiry.serviceName || "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-0.5">Member</p>
                  <p className="text-sm font-medium">{selectedInquiry.userName || "Member"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm font-medium break-all">{selectedInquiry.email}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="text-sm font-medium">{selectedInquiry.phone || "—"}</p>
                </div>
                {selectedInquiry.preferredDate && (
                  <div className="col-span-2 p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-0.5">Preferred Date</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedInquiry.preferredDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Message */}
              {selectedInquiry.message && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedInquiry.message}</p>
                </div>
              )}

              {/* Update Status */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">Update Inquiry</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Admin notes (visible only to admins)..."
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedInquiry(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: selectedInquiry.id,
                        status: newStatus as any,
                        adminNotes: adminNotes || undefined,
                      })
                    }
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Admin Service Manager ────────────────────────────────────────────────────

function AdminServiceManager() {
  const utils = trpc.useUtils();
  const { data: services, isLoading } = trpc.consulting.services.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [editService, setEditService] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "",
    serviceType: "architecture_review" as const,
    price: "0", duration: "", maxSlotsPerMonth: "",
  });

  const createMutation = trpc.consulting.createService.useMutation({
    onSuccess: () => {
      toast.success("Service created.");
      utils.consulting.services.invalidate();
      setShowCreate(false);
      setForm({ name: "", description: "", serviceType: "architecture_review", price: "0", duration: "", maxSlotsPerMonth: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.consulting.updateService.useMutation({
    onSuccess: () => {
      toast.success("Service updated.");
      utils.consulting.services.invalidate();
      setEditService(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (svc: any) => {
    setEditService(svc);
    setForm({
      name: svc.name,
      description: svc.description,
      serviceType: svc.serviceType,
      price: svc.price?.toString() || "0",
      duration: svc.duration || "",
      maxSlotsPerMonth: svc.maxSlotsPerMonth?.toString() || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage the services displayed on the public consulting page.
        </p>
        <Button size="sm" onClick={() => { setShowCreate(true); setEditService(null); }}>
          + Add Service
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(services || []).map((svc: any) => {
            const Icon = SERVICE_ICONS[svc.serviceType] || Briefcase;
            const colors = SERVICE_COLORS[svc.serviceType] || SERVICE_COLORS.architecture_review;
            return (
              <div key={svc.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <div className={`p-2 rounded-lg shrink-0 ${colors.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{svc.name}</p>
                    {!svc.isActive && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{svc.description}</p>
                </div>
                <div className="text-right shrink-0">
                  {svc.duration && (
                    <p className="text-xs text-muted-foreground">{svc.duration}</p>
                  )}
                  {svc.maxSlotsPerMonth && (
                    <p className="text-xs text-muted-foreground">{svc.maxSlotsPerMonth} slots/mo</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => handleEdit(svc)}>
                  Edit
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || !!editService} onOpenChange={() => { setShowCreate(false); setEditService(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editService ? "Edit Service" : "Create Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder="Service name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <Textarea
              placeholder="Description"
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <Select
              value={form.serviceType}
              onValueChange={v => setForm(f => ({ ...f, serviceType: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="architecture_review">Architecture Review</SelectItem>
                <SelectItem value="custom_training">Custom Training</SelectItem>
                <SelectItem value="implementation_advisory">Implementation Advisory</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Duration (e.g. 1–2 weeks)"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              />
              <Input
                placeholder="Max slots/month"
                type="number"
                value={form.maxSlotsPerMonth}
                onChange={e => setForm(f => ({ ...f, maxSlotsPerMonth: e.target.value }))}
              />
            </div>
            {editService && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateMutation.mutate({ id: editService.id, isActive: !editService.isActive })
                  }
                >
                  {editService.isActive ? "Deactivate" : "Activate"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Currently {editService.isActive ? "active" : "inactive"}
                </span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreate(false); setEditService(null); }}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!form.name || !form.description || createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (editService) {
                    updateMutation.mutate({
                      id: editService.id,
                      name: form.name,
                      description: form.description,
                      price: form.price,
                      duration: form.duration || undefined,
                      maxSlotsPerMonth: form.maxSlotsPerMonth ? parseInt(form.maxSlotsPerMonth) : undefined,
                    });
                  } else {
                    createMutation.mutate({
                      name: form.name,
                      description: form.description,
                      serviceType: form.serviceType,
                      price: form.price,
                      duration: form.duration || undefined,
                      maxSlotsPerMonth: form.maxSlotsPerMonth ? parseInt(form.maxSlotsPerMonth) : undefined,
                    });
                  }
                }}
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Consulting() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";
  const { data: services, isLoading } = trpc.consulting.services.useQuery();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showInquiry, setShowInquiry] = useState(false);

  const handleInquire = (service: any) => {
    if (!user) {
      window.location.href = "/signin";
      return;
    }
    setSelectedService(service);
    setShowInquiry(true);
  };

  const activeServices = useMemo(() => (services || []).filter((s: any) => s.isActive !== false), [services]);
  const monthlyCapacity = useMemo(
    () => activeServices.reduce((sum: number, s: any) => sum + (s.maxSlotsPerMonth || 0), 0),
    [activeServices]
  );
  const serviceAreaCount = useMemo(
    () => new Set(activeServices.map((s: any) => s.serviceType)).size,
    [activeServices]
  );

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="max-w-2xl">
        <h1 className="font-heading text-[34px] font-semibold leading-tight">Consulting</h1>
        <p className="text-[15.5px] text-muted-foreground mt-1.5">
          Vendor-neutral O-PAS expertise for your organization. Architecture reviews,
          custom training, and implementation advisory from experienced practitioners.
        </p>
        <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground mt-3">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Vendor-neutral</span>
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> Practitioner-led</span>
          <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-primary" /> Community-backed</span>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <StatStrip
        items={[
          { icon: Briefcase, value: activeServices.length, label: "Active Services", hue: "blue" },
          { icon: Calendar, value: monthlyCapacity || "—", label: "Monthly Capacity", hue: "teal" },
          { icon: ShieldCheck, value: serviceAreaCount, label: "Service Areas", hue: "violet" },
        ]}
      />

      {/* ── Services Grid ───────────────────────────────────────────────── */}
      {isAdmin ? (
        <Tabs defaultValue="services">
          <TabsList className="mb-6">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="manage">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Manage Services
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <ServicesGrid
              services={services}
              isLoading={isLoading}
              onInquire={handleInquire}
              user={user}
            />
          </TabsContent>

          <TabsContent value="inquiries">
            <AdminInquiryPanel />
          </TabsContent>

          <TabsContent value="manage">
            <AdminServiceManager />
          </TabsContent>
        </Tabs>
      ) : (
        <ServicesGrid
          services={services}
          isLoading={isLoading}
          onInquire={handleInquire}
          user={user}
        />
      )}

      {/* ── Why Us ─────────────────────────────────────────────────────── */}
      <Card className="opa-card rounded-lg border bg-card">
        <CardContent className="p-6">
          <h2 className="font-heading text-[19px] font-semibold mb-5 text-center">Why Choose {CLUB_NAME} Consulting?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-[15px]">Vendor-Neutral</h3>
              </div>
              <p className="text-[13.5px] text-muted-foreground leading-normal">
                Recommendations based purely on your needs and the O-PAS standard — not vendor partnerships.
                We evaluate all options objectively.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-[15px]">Practitioner-Led</h3>
              </div>
              <p className="text-[13.5px] text-muted-foreground leading-normal">
                Our consultants are active O-PAS practitioners with real-world implementation experience
                across multiple industries and plant environments.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-[15px]">Community-Backed</h3>
              </div>
              <p className="text-[13.5px] text-muted-foreground leading-normal">
                Access the collective knowledge of the {CLUB_NAME}. Our recommendations are
                informed by real benchmarking data from member organizations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Process ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-heading text-[19px] font-semibold mb-4 text-center">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-3">
          {[
            { step: "01", title: "Submit Inquiry", desc: "Fill out the request form with your project details and preferred timeline." },
            { step: "02", title: "Discovery Call", desc: "We schedule a 30-minute call to understand your environment and objectives." },
            { step: "03", title: "Proposal", desc: "Receive a tailored scope of work with timeline, deliverables, and pricing." },
            { step: "04", title: "Engagement", desc: "Work directly with our practitioners to achieve your O-PAS goals." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="opa-card relative p-4 rounded-lg border bg-card">
              <div className="font-heading text-[28px] font-semibold text-[var(--accent-100)] mb-2">{step}</div>
              <h3 className="font-semibold text-[14.5px] mb-1">{title}</h3>
              <p className="text-[13px] text-muted-foreground leading-normal">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inquiry Dialog */}
      <InquiryDialog
        service={selectedService}
        open={showInquiry}
        onClose={() => { setShowInquiry(false); setSelectedService(null); }}
      />
    </div>
  );
}

// ─── Services Grid (shared between admin/public views) ───────────────────────

function ServicesGrid({
  services,
  isLoading,
  onInquire,
  user,
}: {
  services: any[] | undefined;
  isLoading: boolean;
  onInquire: (service: any) => void;
  user: any;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
      </div>
    );
  }

  const activeServices = (services || []).filter((s: any) => s.isActive !== false);

  if (activeServices.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No services available yet</p>
        <p className="text-sm mt-1">Check back soon or contact us directly.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {activeServices.map((service: any) => {
        const hue = hueFor(service.serviceType);
        return (
          <div key={service.id} className="opa-card flex flex-col gap-2 rounded-lg border bg-card p-4">
            <CategoryPill hue={hue} className="w-fit">
              {SERVICE_LABELS[service.serviceType] || service.serviceType}
            </CategoryPill>
            <h4 className="font-heading text-[18px] font-semibold">{service.name}</h4>
            <p className="text-[14px] text-muted-foreground leading-normal flex-1">
              {service.description}
            </p>
            <div className="flex items-center justify-between gap-3 mt-1 pt-3 border-t border-border">
              <span className="text-[13px] text-muted-foreground">
                From ${Number(service.price).toLocaleString()}{service.duration ? ` · ${service.duration}` : ""}
              </span>
              <Button variant="ghost" size="sm" className="text-[13px] shrink-0" onClick={() => onInquire(service)}>
                {user ? "Learn more" : "Sign in to inquire"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
