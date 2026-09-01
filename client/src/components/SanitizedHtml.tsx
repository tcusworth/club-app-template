import DOMPurify from "dompurify";
import { useMemo } from "react";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
    "a", "ul", "ol", "li", "h1", "h2", "h3", "h4",
    "blockquote", "code", "pre", "hr", "span", "img",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
  ADD_ATTR: ["target"],
};

export function sanitizeClientHtml(html: string): string {
  if (!html) return "";
  const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);
  return typeof clean === "string" ? clean : String(clean);
}

export function SanitizedHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const clean = useMemo(() => sanitizeClientHtml(html), [html]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
