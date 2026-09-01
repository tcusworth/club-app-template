import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, type CategoryHue } from "@/lib/categoryColors";

export interface StatStripItem {
  icon: LucideIcon;
  value: string | number;
  label: string;
  hue?: CategoryHue;
}

/**
 * Inline segmented stat strip used at the top of dashboard screens
 * (e.g. Discussions / Unread / Topics / Your Reputation).
 */
export function StatStrip({ items, className }: { items: StatStripItem[]; className?: string }) {
  return (
    <div className={cn("opa-card flex flex-wrap rounded-lg border bg-card overflow-hidden", className)}>
      {items.map((item, i) => {
        const colors = item.hue ? CATEGORY_COLORS[item.hue] : null;
        return (
          <div
            key={item.label}
            className={cn(
              "flex flex-1 min-w-[160px] items-center gap-3 px-4 py-4",
              i > 0 && "border-l border-border"
            )}
          >
            <div
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md"
              style={colors ? { background: colors.bg, color: colors.text } : undefined}
            >
              <item.icon className="h-[17px] w-[17px]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span
                className="font-heading text-[26px] font-semibold leading-none"
                style={colors ? { color: colors.text } : undefined}
              >
                {item.value}
              </span>
              <span className="text-[12.5px] uppercase tracking-wide text-muted-foreground">
                {item.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
