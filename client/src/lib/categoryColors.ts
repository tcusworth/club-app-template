// Industry design system's 5-hue category/status palette (tint bg + deep text pairs,
// plus a solid variant for avatars, icon chips, and stripes). Rotates deterministically
// by string so the same category/tag always lands on the same hue across the app.

export const CATEGORY_HUES = ["blue", "teal", "violet", "amber", "coral"] as const;
export type CategoryHue = (typeof CATEGORY_HUES)[number];

export const CATEGORY_COLORS: Record<CategoryHue, { bg: string; text: string; solid: string }> = {
  blue: { bg: "var(--category-blue-bg)", text: "var(--category-blue-text)", solid: "var(--category-blue-solid)" },
  teal: { bg: "var(--category-teal-bg)", text: "var(--category-teal-text)", solid: "var(--category-teal-solid)" },
  violet: { bg: "var(--category-violet-bg)", text: "var(--category-violet-text)", solid: "var(--category-violet-solid)" },
  amber: { bg: "var(--category-amber-bg)", text: "var(--category-amber-text)", solid: "var(--category-amber-solid)" },
  coral: { bg: "var(--category-coral-bg)", text: "var(--category-coral-text)", solid: "var(--category-coral-solid)" },
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Deterministically pick one of the 5 category hues for a given label/id. */
export function hueFor(key: string | number): CategoryHue {
  const index = hashString(String(key)) % CATEGORY_HUES.length;
  return CATEGORY_HUES[index];
}

/** Convenience: resolve the {bg, text, solid} color set directly from a label/id. */
export function colorsFor(key: string | number) {
  return CATEGORY_COLORS[hueFor(key)];
}
