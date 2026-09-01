import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CLUB_NAME } from "@/lib/clubConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Award, Search, Download, CheckCircle, Shield, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Certificates() {
  const { user } = useAuth();

  const [verifyId, setVerifyId] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: myCerts, isLoading } = trpc.certificates.my.useQuery(undefined, { enabled: !!user });
  const { data: verifyResult, isLoading: verifying } = trpc.certificates.verify.useQuery(
    { uniqueId: verifyId },
    { enabled: searchTriggered && verifyId.length > 5 }
  );

  const handleVerify = () => {
    if (verifyId.length < 5) {
      toast.error("Enter a valid certificate ID");
      return;
    }
    setSearchTriggered(true);
  };

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10">
          <Award className="h-7 w-7 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Certificates & Credentials</h1>
          <p className="text-muted-foreground">Earn and verify {CLUB_NAME} certificates</p>
        </div>
      </div>

      {/* OPA Practitioner Banner */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 shrink-0">
              <Shield className="h-8 w-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">OPA Practitioner Certification</h2>
              <p className="text-muted-foreground">
                Complete all published OPA courses and earn the OPA Practitioner badge — the definitive credential
                for O-PAS competency. This certification is vendor-neutral, community-recognized, and shareable on LinkedIn.
              </p>
              {myCerts?.some((c: any) => c.certificateType === "opa_practitioner") ? (
                <Badge className="bg-amber-500 text-white">
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Earned
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Complete all courses to earn</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Certificates */}
      {user && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Certificates</h2>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map(i => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
            </div>
          ) : myCerts && myCerts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {myCerts.map((cert: any) => (
                <Card key={cert.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {cert.certificateType === "opa_practitioner" ? (
                            <Shield className="h-5 w-5 text-amber-500" />
                          ) : (
                            <Award className="h-5 w-5 text-primary" />
                          )}
                          <span className="font-semibold">
                            {cert.certificateType === "opa_practitioner"
                              ? "OPA Practitioner"
                              : cert.courseTitle || "Course Completion"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{cert.uniqueId}</p>
                        <p className="text-xs text-muted-foreground">
                          Issued {new Date(cert.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={cert.certificateType === "opa_practitioner" ? "default" : "secondary"}>
                          {cert.certificateType === "opa_practitioner" ? "Practitioner" : "Course"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => window.open(`/certificates/print/${cert.uniqueId}`, '_blank')}
                        >
                          <Download className="h-3 w-3" /> Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No certificates yet. Complete a course to earn your first certificate.</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/training"}>
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Verify Certificate */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Verify a Certificate</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Enter a certificate ID to verify its authenticity and view the holder's details.
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="Enter certificate ID (e.g., CERT-M4X1A2-B3C4D5)"
                value={verifyId}
                onChange={(e) => { setVerifyId(e.target.value); setSearchTriggered(false); }}
                className="flex-1"
              />
              <Button onClick={handleVerify} disabled={verifying}>
                <Search className="h-4 w-4 mr-2" /> Verify
              </Button>
            </div>
            {searchTriggered && verifyResult && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Valid Certificate</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Holder:</span> {verifyResult.userName}</div>
                  <div><span className="text-muted-foreground">Type:</span> {verifyResult.certificateType === "opa_practitioner" ? "OPA Practitioner" : "Course Completion"}</div>
                  {verifyResult.courseTitle && <div><span className="text-muted-foreground">Course:</span> {verifyResult.courseTitle}</div>}
                  <div><span className="text-muted-foreground">Issued:</span> {new Date(verifyResult.issuedAt).toLocaleDateString()}</div>
                </div>
              </div>
            )}
            {searchTriggered && !verifying && !verifyResult && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-600 dark:text-red-400">No certificate found with this ID. Please check and try again.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
