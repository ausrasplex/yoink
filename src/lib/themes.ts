/**
 * App themes, chosen by the Server Admin (Server → Theme).
 *
 * A theme can change two things:
 *   - copy: wording for bidding, notifications, emails… — look strings up with `copy(theme, key)`;
 *   - styling: `<html data-theme="…">` is set from the setting, so CSS in globals.css can target `[data-theme="britney"]`.
 *
 * Only the setting and the plumbing exist so far. Theme-specific text gets added to THEME_COPY over time; any key a theme
 * doesn't define falls back to the Yoink wording. (Keep Britney copy to our own playful wording and the song's title —
 * don't paste song lyrics.)
 */

export const THEMES = {
  yoink: { label: "Yoink", description: "The original look and wording." },
  britney: { label: "Britney", description: "Oops!… I did it again: cheeky pop wording for bids, notifications and emails." },
} as const;

export type ThemeId = keyof typeof THEMES;

export const isThemeId = (v: unknown): v is ThemeId => typeof v === "string" && v in THEMES;
export const themeOf = (v: string | null | undefined): ThemeId => (isThemeId(v) ? v : "yoink");

/** Default (Yoink) wording. Add a key here first, then override it per theme below. */
const YOINK_COPY = {
  placeBid: "Place bid",
  leading: "You're the highest bidder",
  outbid: "You've been outbid",
  outbidEmailSubject: "You've been outbid on Lot {lot}: {title}",
} as const;

export type CopyKey = keyof typeof YOINK_COPY;

const THEME_COPY: Record<ThemeId, Partial<Record<CopyKey, string>>> = {
  yoink: {},
  britney: {}, // to be written
};

/** Wording for a theme, with {placeholders} filled from `vars`. */
export function copy(theme: ThemeId, key: CopyKey, vars: Record<string, string | number> = {}): string {
  const text = THEME_COPY[theme][key] ?? YOINK_COPY[key];
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
