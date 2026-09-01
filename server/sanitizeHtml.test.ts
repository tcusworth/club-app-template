import { describe, expect, it } from "vitest";
import { sanitizeUserHtml } from "./sanitizeHtml";
import { resolveUploadMeta, sanitizeFileName, MAX_UPLOAD_BYTES } from "./uploadPolicy";

describe("sanitizeUserHtml", () => {
  it("strips script tags and event handlers", () => {
    const dirty = `<p>Hello</p><script>alert(1)</script><img src=x onerror="alert(2)">`;
    const clean = sanitizeUserHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).toMatch(/Hello/);
  });

  it("blocks javascript: URLs", () => {
    const dirty = `<a href="javascript:alert(1)">click</a>`;
    const clean = sanitizeUserHtml(dirty);
    expect(clean.toLowerCase()).not.toContain("javascript:");
  });

  it("keeps safe formatting and http(s) links", () => {
    const dirty = `<p>Read <a href="https://example.com">this</a> and <strong>that</strong></p>`;
    const clean = sanitizeUserHtml(dirty);
    expect(clean).toContain("https://example.com");
    expect(clean).toContain("<strong>that</strong>");
    expect(clean).toContain("noopener");
  });
});

describe("uploadPolicy", () => {
  it("sanitizes path segments out of file names", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("my photo.png")).toBe("my_photo.png");
  });

  it("derives MIME from extension and ignores client claims", () => {
    const meta = resolveUploadMeta("diagram.PNG");
    expect(meta.mimeType).toBe("image/png");
    expect(meta.safeName).toBe("diagram.PNG");
  });

  it("rejects svg and html uploads", () => {
    expect(() => resolveUploadMeta("xss.svg")).toThrow(/not allowed/i);
    expect(() => resolveUploadMeta("page.html")).toThrow(/not allowed/i);
  });

  it("exposes a 10MB cap", () => {
    expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });
});
