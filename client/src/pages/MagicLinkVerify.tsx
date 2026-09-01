import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MagicLinkVerify() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";
  const utils = trpc.useUtils();
  const [error, setError] = useState<string | null>(null);

  const verify = trpc.auth.verifyMagicLink.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Signed in!");
      setLocation("/");
    },
    onError: (err) => setError(err.message || "This sign-in link is invalid or expired."),
  });

  useEffect(() => {
    if (!token) {
      setError("This sign-in link is missing a token.");
      return;
    }
    if (token.length !== 64) {
      setError("This sign-in link is invalid.");
      return;
    }
    verify.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center mb-3 shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">OPA Community</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border/50 p-8 text-center space-y-4">
          {error ? (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-lg font-semibold">Sign-in link problem</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button className="w-full" onClick={() => setLocation("/signin")}>
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
              <h2 className="text-lg font-semibold">Signing you in…</h2>
              <p className="text-sm text-muted-foreground">One moment while we verify your link.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
