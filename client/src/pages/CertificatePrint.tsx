import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { useEffect } from "react";

export default function CertificatePrint() {
  const [, params] = useRoute("/certificates/print/:uniqueId");
  const uniqueId = params?.uniqueId || "";

  const { data: cert, isLoading } = trpc.certificates.verify.useQuery(
    { uniqueId },
    { enabled: !!uniqueId }
  );

  useEffect(() => {
    if (cert && !isLoading) {
      // Auto-trigger print dialog after a short delay
      const timer = setTimeout(() => window.print(), 800);
      return () => clearTimeout(timer);
    }
  }, [cert, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading certificate...</p>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Certificate not found.</p>
      </div>
    );
  }

  const isPractitioner = cert.certificateType === "opa_practitioner";
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .cert-container { box-shadow: none !important; }
        }
        @page { size: landscape; margin: 0; }
      `}</style>

      {/* Print/Download buttons */}
      <div className="no-print flex items-center justify-center gap-4 py-4 bg-muted/50">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition"
        >
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-6 py-2 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition"
        >
          Close
        </button>
      </div>

      {/* Certificate */}
      <div className="flex items-center justify-center min-h-screen bg-white p-8">
        <div
          className="cert-container relative w-[1056px] h-[816px] bg-white border-[3px] border-gray-200 shadow-2xl"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {/* Decorative border */}
          <div className="absolute inset-3 border-2 border-gray-300" />
          <div className="absolute inset-5 border border-gray-200" />

          {/* Corner ornaments */}
          {[
            "top-6 left-6",
            "top-6 right-6 rotate-90",
            "bottom-6 left-6 -rotate-90",
            "bottom-6 right-6 rotate-180",
          ].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-16 h-16`}>
              <svg viewBox="0 0 64 64" className="w-full h-full text-gray-300">
                <path d="M0 0 L64 0 L64 8 L8 8 L8 64 L0 64 Z" fill="currentColor" />
              </svg>
            </div>
          ))}

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-20 text-center">
            {/* Logo / Shield icon */}
            <div className="mb-4">
              <svg
                viewBox="0 0 64 64"
                className={`w-16 h-16 ${isPractitioner ? "text-amber-500" : "text-blue-600"}`}
              >
                <path
                  d="M32 4 L56 16 V32 C56 48 32 60 32 60 C32 60 8 48 8 32 V16 Z"
                  fill="currentColor"
                  opacity="0.15"
                />
                <path
                  d="M32 4 L56 16 V32 C56 48 32 60 32 60 C32 60 8 48 8 32 V16 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M22 32 L29 39 L42 26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="text-sm tracking-[0.3em] uppercase text-gray-400 mb-2">
              The Open Process Automation Community
            </p>

            <h1
              className={`text-4xl font-bold mb-1 ${
                isPractitioner ? "text-amber-600" : "text-gray-800"
              }`}
            >
              Certificate of {isPractitioner ? "Achievement" : "Completion"}
            </h1>

            <div className="w-48 h-px bg-gray-300 my-4" />

            <p className="text-lg text-gray-500 mb-2">This certifies that</p>

            <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Georgia', serif" }}>
              {cert.userName || "Community Member"}
            </h2>

            <div className="w-64 h-px bg-gray-300 my-3" />

            <p className="text-lg text-gray-500 mb-1">has successfully {isPractitioner ? "earned the" : "completed"}</p>

            <h3
              className={`text-2xl font-bold mb-4 ${
                isPractitioner ? "text-amber-600" : "text-blue-600"
              }`}
            >
              {isPractitioner ? "OPA Practitioner Certification" : cert.courseTitle || "Course Completion"}
            </h3>

            {isPractitioner && (
              <p className="text-sm text-gray-500 max-w-md mb-4">
                Demonstrating comprehensive knowledge of Open Process Automation standards,
                architecture, and implementation practices across all OPA Community courses.
              </p>
            )}

            <div className="flex items-center gap-12 mt-4">
              <div className="text-center">
                <div className="w-40 border-b border-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Date Issued</p>
                <p className="text-sm font-medium text-gray-700">{issuedDate}</p>
              </div>
              <div className="text-center">
                <div className="w-40 border-b border-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Certificate ID</p>
                <p className="text-sm font-mono text-gray-700">{cert.uniqueId}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-6">
              Verify at {window.location.origin}/certificates — ID: {cert.uniqueId}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
