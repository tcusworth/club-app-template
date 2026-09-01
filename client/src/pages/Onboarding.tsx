import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CLUB_NAME, CLUB_ICON, ONBOARDING_ROLES, ONBOARDING_WELCOME_MESSAGE } from "@/lib/clubConfig";
import { Check, ArrowRight, ArrowLeft, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// NOTE: ONBOARDING_ROLES intentionally excludes "instructor" — the server-side
// Zod enum in server/routers.ts (user.updateProfile) doesn't accept it, so the
// prior hardcoded list here offered a role the backend would have rejected.
// Fixed by making this file read from the same source of truth as everything
// else — see client/src/lib/clubConfig.ts.
const roles = ONBOARDING_ROLES;
const Icon = CLUB_ICON;

const TOTAL_STEPS = 3;

export default function Onboarding() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [organization, setOrganization] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSpaces, setSelectedSpaces] = useState<number[]>([]);

  const { data: categories } = trpc.forum.getCategories.useQuery();

  const updateProfile = trpc.user.updateProfile.useMutation();
  const followSpace = trpc.follows.follow.useMutation();

  if (loading) return null;
  if (!user) {
    window.location.href = "/signin";
    return null;
  }

  const toggleSpace = (id: number) => {
    setSelectedSpaces(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    try {
      await updateProfile.mutateAsync({
        platformRole: selectedRole as any,
        organization: organization || undefined,
        bio: bio || undefined,
        onboarded: true,
      });
      // Follow selected spaces
      for (const spaceId of selectedSpaces) {
        await followSpace.mutateAsync({ targetType: "space", targetId: spaceId }).catch(() => {});
      }
      toast.success(`Welcome to ${CLUB_NAME}!`);
      // Land the new member somewhere with an obvious first action, rather
      // than an empty "/" — the empty-feed-on-first-login moment is where
      // non-technical members are most likely to bounce. If they joined a
      // space, drop them there with a nudge to introduce themselves; if
      // they skipped space selection, fall back to home.
      if (selectedSpaces.length > 0) {
        toast("Say hello — introducing yourself is the fastest way to get replies.", {
          duration: 6000,
        });
        setLocation(`/spaces/${selectedSpaces[0]}`);
      } else {
        setLocation("/");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const stepLabels = ["Your Role", "About You", "Join Spaces"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Icon className="h-8 w-8 text-primary" />
            <span className="text-2xl font-semibold">{CLUB_NAME}</span>
          </div>
          <h1 className="text-xl font-semibold">Welcome to {CLUB_NAME}</h1>
          <p className="text-sm text-muted-foreground">
            {step === 0 && ONBOARDING_WELCOME_MESSAGE}
            {step === 1 && "Tell us about yourself"}
            {step === 2 && "Choose spaces to follow — you can always change this later"}
          </p>
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < TOTAL_STEPS - 1 && (
                  <div className={`h-0.5 w-8 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stepLabels[step]}</p>
        </div>

        {/* Step 0: Role selection */}
        {step === 0 && (
          <div className="grid gap-2">
            {roles.map(role => (
              <Card
                key={role.value}
                className={`cursor-pointer transition-all ${
                  selectedRole === role.value
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-primary/30"
                }`}
                onClick={() => setSelectedRole(role.value)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedRole === role.value ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {selectedRole === role.value && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{role.label}</p>
                    <p className="text-xs text-muted-foreground">{role.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              className="mt-4 w-full"
              disabled={!selectedRole}
              onClick={() => setStep(1)}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 1: Profile details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org" className="text-sm">Organization</Label>
              <Input
                id="org"
                placeholder="Your company or organization"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm">Bio (optional)</Label>
              <Textarea
                id="bio"
                placeholder="Brief description of your experience with OPA/automation"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(2)} className="flex-1">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Space selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-2">
              {!categories || categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No spaces available yet.</p>
              ) : (
                categories.map(cat => (
                  <Card
                    key={cat.id}
                    className={`cursor-pointer transition-all ${
                      selectedSpaces.includes(cat.id)
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                    onClick={() => toggleSpace(cat.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedSpaces.includes(cat.id) ? "border-primary bg-primary" : "border-muted-foreground/30"
                      }`}>
                        {selectedSpaces.includes(cat.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{cat.name}</p>
                          {(cat as any).memberCount != null && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />{(cat as any).memberCount}
                            </Badge>
                          )}
                        </div>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            {selectedSpaces.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {selectedSpaces.length} space{selectedSpaces.length !== 1 ? "s" : ""} selected
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={updateProfile.isPending || followSpace.isPending}
                className="flex-1"
              >
                {updateProfile.isPending ? "Saving..." : selectedSpaces.length === 0 ? "Skip & Finish" : "Finish Setup"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
