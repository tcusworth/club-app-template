import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Settings, User, Shield, Save, X, Plus, Award, TrendingUp, Linkedin, CheckCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ROLES = [
  { value: "owner_operator", label: "Owner / Operator" },
  { value: "epc_integrator", label: "EPC / Integrator" },
  { value: "automation_engineer", label: "Automation Engineer" },
  { value: "executive", label: "Executive" },
  { value: "vendor", label: "Vendor" },
  { value: "analyst", label: "Analyst / Researcher" },
];

const SUGGESTED_CREDENTIALS = [
  "O-PAS Certified",
  "ISA/IEC 62443 Certified",
  "PE (Professional Engineer)",
  "PMP Certified",
  "CSSA (Certified System Security Architect)",
  "ISA CAP",
  "DCS Migration Experience",
  "OPA Pilot Project Lead",
  "SCADA/HMI Specialist",
  "Fieldbus Expert",
  "OPC UA Specialist",
  "Safety Instrumented Systems",
  "Process Control Engineer",
  "System Integration Lead",
  "Digital Transformation Lead",
];

export default function UserSettings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [platformRole, setPlatformRole] = useState("");
  const [organization, setOrganization] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [credentials, setCredentials] = useState<string[]>([]);
  const [newCredential, setNewCredential] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [verificationStatement, setVerificationStatement] = useState("");
  const [showVerificationForm, setShowVerificationForm] = useState(false);

  const reputationScore = (user as any)?.reputationScore as number | null | undefined;

  useEffect(() => {
    if (user) {
      setPlatformRole((user as any)?.platformRole || "");
      setOrganization((user as any)?.organization || "");
      setBio((user as any)?.bio || "");
      setLinkedinUrl((user as any)?.linkedInUrl || "");
      const creds = (user as any)?.credentials;
      setCredentials(Array.isArray(creds) ? creds : []);
    }
  }, [user]);

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      utils.auth.me.invalidate();
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const submitVerification = trpc.verification.submit.useMutation({
    onSuccess: () => {
      toast.success("Verification request submitted — an admin will review it shortly");
      setShowVerificationForm(false);
      setVerificationStatement("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    updateProfile.mutate({
      platformRole: platformRole as any || undefined,
      organization: organization || undefined,
      bio: bio || undefined,
      credentials: credentials.length > 0 ? credentials : undefined,
      linkedInUrl: linkedinUrl || undefined,
    });
  };

  const addCredential = (cred: string) => {
    const trimmed = cred.trim();
    if (trimmed && !credentials.includes(trimmed)) {
      setCredentials([...credentials, trimmed]);
    }
    setNewCredential("");
    setShowSuggestions(false);
  };

  const removeCredential = (idx: number) => {
    setCredentials(credentials.filter((_, i) => i !== idx));
  };

  const filteredSuggestions = SUGGESTED_CREDENTIALS.filter(
    s => !credentials.includes(s) && s.toLowerCase().includes(newCredential.toLowerCase())
  );

  if (!user) return null;

  // Profile completion score
  const completionItems = [
    { label: "Platform role", done: !!platformRole },
    { label: "Organization", done: !!organization },
    { label: "Bio", done: bio.length > 20 },
    { label: "LinkedIn URL", done: !!linkedinUrl },
    { label: "Credentials", done: credentials.length > 0 },
  ];
  const completionPct = Math.round((completionItems.filter(i => i.done).length / completionItems.length) * 100);

  return (
    <div className="max-w-[640px] space-y-6">
      <div>
        <h1 className="font-heading text-[34px] font-semibold leading-tight">Settings</h1>
        <p className="text-[15.5px] text-muted-foreground mt-1.5">Manage your profile, credentials, and preferences</p>
      </div>

      {/* Profile Completion Card */}
      <div className="opa-card rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Profile Completion</span>
          <span className={`text-sm font-semibold ${completionPct === 100 ? 'text-emerald-600' : 'text-primary'}`}>{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-2 mb-3" />
        <div className="flex flex-wrap gap-2">
          {completionItems.map(item => (
            <span key={item.label} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              item.done ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'
            }`}>
              {item.done ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Profile Card */}
      <div className="opa-card rounded-lg border bg-card p-5">
        <h3 className="font-heading text-[18px] font-semibold mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Profile
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={user.name || ""} disabled className="bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={user.email || ""} disabled className="bg-muted/30" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Platform Role</Label>
            <Select value={platformRole} onValueChange={setPlatformRole}>
              <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Organization</Label>
            <Input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Your company or organization" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bio</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Brief description of your OPA experience and background" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" />LinkedIn Profile URL</Label>
            <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
          </div>
        </div>
      </div>

      {/* Credentials Card */}
      <div className="opa-card rounded-lg border bg-card p-5">
        <h3 className="font-heading text-[18px] font-semibold mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Credentials & Experience Tags
        </h3>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Add certifications, experience tags, and project roles relevant to OPA and process automation.
            These are displayed on your profile and help the community understand your expertise.
          </p>

          {/* Current credentials */}
          {credentials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {credentials.map((cred, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1 pr-1">
                  {cred}
                  <button
                    onClick={() => removeCredential(idx)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add credential input */}
          <div className="relative">
            <div className="flex gap-2">
              <Input
                value={newCredential}
                onChange={e => {
                  setNewCredential(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newCredential.trim()) {
                    e.preventDefault();
                    addCredential(newCredential);
                  }
                }}
                placeholder="Type a credential or select from suggestions..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addCredential(newCredential)}
                disabled={!newCredential.trim()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                    onMouseDown={e => {
                      e.preventDefault();
                      addCredential(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reputation Card */}
      <div className="opa-card rounded-lg border bg-card p-5">
        <h3 className="font-heading text-[18px] font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Reputation
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-2xl font-semibold">{reputationScore ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reputation points earned through contributions
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-1">
            <p>+5 per published article</p>
            <p>+3 per verified claim review</p>
            <p>+2 per decision log entry</p>
            <p>+1 per AI conversation</p>
          </div>
        </div>
      </div>

      {/* Expert Verification Card */}
      <ExpertVerificationCard
        verificationStatus={(user as any)?.verificationStatus}
        showForm={showVerificationForm}
        setShowForm={setShowVerificationForm}
        statement={verificationStatement}
        setStatement={setVerificationStatement}
        onSubmit={() => submitVerification.mutate({ statement: verificationStatement })}
        isPending={submitVerification.isPending}
      />

      {/* Weekly Digest Card */}
      <DigestPreferenceCard />

      {/* Account Card */}
      <div className="opa-card rounded-lg border bg-card p-5">
        <h3 className="font-heading text-[18px] font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Account
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Account Type</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(user as any)?.role === "admin" ? "Administrator" : "Community Member"}
            </p>
          </div>
          <Badge variant={(user as any)?.role === "admin" ? "default" : "secondary"} className="text-xs">
            {(user as any)?.role === "admin" ? "Admin" : "Free Tier"}
          </Badge>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={updateProfile.isPending} size="lg">
          <Save className="h-4 w-4 mr-1.5" /> {updateProfile.isPending ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}

function DigestPreferenceCard() {
  const { data: pref, isLoading: prefLoading } = trpc.digest.getPreference.useQuery();
  const updateDigest = trpc.digest.updatePreference.useMutation({
    onSuccess: () => toast.success("Digest preference updated"),
    onError: (e: any) => toast.error(e.message),
  });
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (pref !== undefined) setEnabled(pref.optIn);
  }, [pref]);

  return (
    <div className="opa-card rounded-lg border bg-card p-5">
      <h3 className="font-heading text-[18px] font-semibold mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" /> Weekly Digest
      </h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">Email Digest</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Receive a weekly summary of new content, capabilities, and community activity.
          </p>
        </div>
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            updateDigest.mutate({ optIn: next });
          }}
          disabled={updateDigest.isPending}
        >
          {enabled ? "Subscribed" : "Subscribe"}
        </Button>
      </div>
    </div>
  );
}

function ExpertVerificationCard({
  verificationStatus,
  showForm,
  setShowForm,
  statement,
  setStatement,
  onSubmit,
  isPending,
}: {
  verificationStatus?: string;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  statement: string;
  setStatement: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    verified: { label: "Verified Expert", icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, color: "text-emerald-600" },
    pending: { label: "Verification Pending", icon: <Clock className="h-4 w-4 text-amber-500" />, color: "text-amber-600" },
    rejected: { label: "Verification Not Approved", icon: <X className="h-4 w-4 text-destructive" />, color: "text-destructive" },
  };
  const status = verificationStatus && statusConfig[verificationStatus];

  return (
    <div className="opa-card rounded-lg border bg-card p-5">
      <h3 className="font-heading text-[18px] font-semibold mb-3 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-primary" /> Expert Verification
      </h3>
      <div className="space-y-3">
        {status ? (
          <div className={`flex items-center gap-2 text-sm font-medium ${status.color}`}>
            {status.icon} {status.label}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Apply for Verified Expert status to display a badge on your profile. An admin will review your credentials and statement.
          </p>
        )}
        {verificationStatus !== "verified" && verificationStatus !== "pending" && (
          <>
            {!showForm ? (
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                Apply for Verification
              </Button>
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={statement}
                  onChange={e => setStatement(e.target.value)}
                  placeholder="Describe your OPA expertise, relevant projects, and why you should be verified..."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={onSubmit} disabled={isPending || !statement.trim()}>
                    {isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
