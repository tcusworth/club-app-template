import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertCircle, Mail, CheckCircle2 } from "lucide-react";
import { CLUB_NAME, CLUB_ICON } from "@/lib/clubConfig";
import { toast } from "sonner";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const returnTo = params.get("returnTo") || "/";

  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  const utils = trpc.useUtils();

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Welcome back!");
      setLocation(returnTo);
    },
    onError: (err) => setError(err.message || "Invalid email or password."),
  });

  const requestMagicLink = trpc.auth.requestMagicLink.useMutation({
    onSuccess: () => setMagicSent(true),
    onError: () => setMagicSent(true), // never reveal failure mode
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    login.mutate({ email, password });
  };

  const handleMagicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    requestMagicLink.mutate({ email });
  };

  const returnToParam = returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : "";

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center mb-3 shadow-lg">
            <CLUB_ICON className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{CLUB_NAME}</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border/50 p-8">
          {magicSent ? (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we've sent a sign-in link. It expires in 15 minutes.
              </p>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setMagicSent(false); setMode("password"); }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${mode === "password" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
                  onClick={() => { setMode("password"); setError(""); }}
                >
                  Password
                </button>
                <button
                  type="button"
                  className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${mode === "magic" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
                  onClick={() => { setMode("magic"); setError(""); }}
                >
                  Email link
                </button>
              </div>

              <form onSubmit={mode === "password" ? handlePasswordSubmit : handleMagicSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                  <Input
                    id="email"
                    type="text"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    autoComplete="email"
                    className="h-11"
                    required
                  />
                </div>

                {mode === "password" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                      <button
                        type="button"
                        onClick={() => setLocation(`/forgot-password${returnToParam}`)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold"
                  disabled={mode === "password" ? login.isPending : requestMagicLink.isPending}
                >
                  {mode === "password"
                    ? (login.isPending ? "Signing in..." : "Sign In")
                    : (requestMagicLink.isPending ? "Sending..." : (<><Mail className="h-4 w-4 mr-2 inline" /> Send sign-in link</>))}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setLocation(`/register${returnToParam}`)}
                    className="text-primary font-medium hover:underline"
                  >
                    Create a free account
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          The Open Process Automation Community Platform
        </p>
      </div>
    </div>
  );
}
