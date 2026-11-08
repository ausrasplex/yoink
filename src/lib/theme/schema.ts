import { z } from "zod";
import { COPY_KEYS, type CopyKey, type CopyTable } from "@/lib/theme/copy";

/**
 * theme.json — the one file every theme folder needs. Documented for theme authors in THEMES.md.
 * Themes are data only: no scripts, no CSS. Colours, images, a font, one built-in effect and wording.
 */

export const EFFECTS = ["none", "snow", "leaves", "bats", "confetti"] as const;
export type Effect = (typeof EFFECTS)[number];

export const THEME_ID = /^[a-z0-9][a-z0-9-]{0,39}$/; // folder name
export const ASSET_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}\.(png|jpe?g|webp|svg|woff2?|ttf|otf)$/;
export const IMAGE_ASSET = /\.(png|jpe?g|webp|svg)$/i;
export const FONT_ASSET = /\.(woff2?|ttf|otf)$/i;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #2a2742");
const monthDay = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Use MM-DD, e.g. "12-01"');
const image = z.string().regex(ASSET_NAME, "A file in the theme folder, e.g. logo.png").refine((f) => IMAGE_ASSET.test(f), "Must be PNG, JPEG, WebP or SVG");
const text = z.string().trim().min(1).max(500);

export const themeSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).optional(),
  /** Switches on automatically between these dates every year (when the Server page is set to Automatic). May wrap past New Year. */
  active: z.object({ from: monthDay, to: monthDay }).optional(),
  colours: z.object({ ink: hex, lilac: hex, peach: hex, lime: hex, canvas: hex }).partial().optional(),
  images: z.object({ icon: image, logo: image, background: image }).partial().optional(),
  font: z.object({
    file: z.string().regex(ASSET_NAME).refine((f) => FONT_ASSET.test(f), "Must be WOFF2, WOFF, TTF or OTF"),
    use: z.enum(["headings", "all"]).default("headings"),
  }).optional(),
  effect: z.enum(EFFECTS).default("none"),
  copy: z.record(z.string(), z.union([text, z.array(text).min(1).max(20)])).optional()
    .superRefine((c, ctx) => {
      for (const k of Object.keys(c ?? {})) {
        if (!(COPY_KEYS as string[]).includes(k)) ctx.addIssue({ code: "custom", path: [k], message: `Unknown wording key "${k}" (see THEMES.md)` });
      }
    }),
});

export type ThemeFile = z.infer<typeof themeSchema>;

/** Validated copy → one list of options per key. */
export function copyTable(copy: ThemeFile["copy"]): CopyTable {
  const out: CopyTable = {};
  for (const [k, v] of Object.entries(copy ?? {})) out[k as CopyKey] = Array.isArray(v) ? v : [v];
  return out;
}

/** "12-20" → 1220, for comparing dates within a year. */
const md = (s: string) => Number(s.replace("-", ""));

/** Whether today (MM-DD in the venue's time zone) falls in a theme's yearly window, including windows that wrap New Year. */
export function inWindow(win: { from: string; to: string }, todayMd: string): boolean {
  const t = md(todayMd), f = md(win.from), e = md(win.to);
  return f <= e ? t >= f && t <= e : t >= f || t <= e;
}

/** Length of a window in days-ish (for picking the most specific theme when windows overlap). */
export function windowSpan(win: { from: string; to: string }): number {
  const f = md(win.from), e = md(win.to);
  return f <= e ? e - f : 1231 - f + e;
}

/** Human-readable reason for the first problem in a theme.json. */
export function describeIssue(err: z.ZodError): string {
  const i = err.issues[0];
  const where = i.path.length ? i.path.join(".") : "theme.json";
  return `${where}: ${i.message}`;
}
