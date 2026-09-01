import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Right-rail card with a small uppercase accent-colored label header (Quick Actions, Top Contributors, ...). */
export function SectionCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("opa-card overflow-hidden rounded-lg border bg-card", className)}>
      <div className="px-3 pt-3 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--accent-700)]">
        {title}
      </div>
      <div className="p-2 pt-2">{children}</div>
    </div>
  );
}
