import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, type CategoryHue } from "@/lib/categoryColors";

/**
 * Row card with a colored left stripe, used for discussion/blog/case-study/event lists.
 * Composes the visual shell only — pass whatever content each screen needs as children.
 */
export function ListCard({
  hue,
  onClick,
  children,
  className,
}: {
  hue: CategoryHue;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const colors = CATEGORY_COLORS[hue];
  return (
    <div
      onClick={onClick}
      className={cn(
        "opa-card flex items-stretch rounded-lg border bg-card",
        onClick && "cursor-pointer hover:border-[var(--accent-400)]",
        className
      )}
    >
      <div
        className="w-[5px] shrink-0 rounded-l-lg"
        style={{ background: colors.solid }}
      />
      <div className="min-w-0 flex-1 p-4">{children}</div>
    </div>
  );
}

export function CategoryPill({ hue, children, className }: { hue: CategoryHue; children: ReactNode; className?: string }) {
  const colors = CATEGORY_COLORS[hue];
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold", className)}
      style={{ background: colors.bg, color: colors.text }}
    >
      {children}
    </span>
  );
}
