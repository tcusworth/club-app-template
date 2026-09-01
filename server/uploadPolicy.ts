import { TRPCError } from "@trpc/server";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_EXPIRES_IN = 60 * 60; // 1 hour

const ALLOWED_UPLOAD_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
};

export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return (cleaned || "file").slice(0, 120);
}

/** Ignore client-supplied MIME; derive from a sanitized extension allowlist. */
export function resolveUploadMeta(fileName: string): { safeName: string; mimeType: string } {
  const safeName = sanitizeFileName(fileName);
  const ext = safeName.includes(".") ? safeName.split(".").pop()!.toLowerCase() : "";
  const mimeType = ALLOWED_UPLOAD_MIME[ext];
  if (!mimeType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File type not allowed. Use PNG, JPEG, GIF, WebP, PDF, MP4, or WebM.",
    });
  }
  return { safeName, mimeType };
}

export function assertUploadSize(byteLength: number): void {
  if (byteLength <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Empty file" });
  }
  if (byteLength > MAX_UPLOAD_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB upload limit`,
    });
  }
}
