import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getAuction } from "@/lib/auction";
import { copyFor, type CopyKey, type CopyVars } from "@/lib/theme/copy";
import { activeTheme, type ActiveTheme } from "@/lib/theme/store";

/** Cookie set by the Server Admin's "Preview" button: that browser sees the theme; nobody else does. */
export const PREVIEW_COOKIE = "theme_preview";

/** The theme in effect for this request (Auction.theme is "auto" or a theme id). */
export const getActiveTheme = cache(async (): Promise<ActiveTheme> => {
  const [a, jar] = await Promise.all([getAuction(), cookies()]);
  return activeTheme(a.theme, jar.get(PREVIEW_COOKIE)?.value ?? null);
});

/** Theme wording for server code outside a request (emails sent in the background): ignores previews. */
export async function themeCopy(): Promise<(key: CopyKey, vars?: CopyVars) => string> {
  const a = await getAuction();
  const t = activeTheme(a.theme, null);
  return (key, vars) => copyFor(t.copy, key, vars);
}

/** Theme wording inside a page render. */
export async function pageCopy(): Promise<(key: CopyKey, vars?: CopyVars) => string> {
  const t = await getActiveTheme();
  return (key, vars) => copyFor(t.copy, key, vars);
}

/** CSS for the active theme: colours, font, background. Built only from validated values (hex colours, our own URLs). */
export function themeCss(t: ActiveTheme): string {
  const css: string[] = [];
  const vars = Object.entries(t.colours ?? {}).map(([k, v]) => `--${k}:${v};`).join("");
  if (vars) css.push(`:root{${vars}}`);
  if (t.font) {
    const fmt = t.font.url.split("?")[0].split(".").pop();
    const format = fmt === "woff2" ? "woff2" : fmt === "woff" ? "woff" : fmt === "otf" ? "opentype" : "truetype";
    css.push(`@font-face{font-family:"YoinkTheme";src:url("${t.font.url}") format("${format}");font-display:swap}`);
    const stack = `"YoinkTheme",var(--font-jakarta),ui-sans-serif,system-ui,sans-serif`;
    css.push(t.font.use === "all" ? `html,body{font-family:${stack}}` : `h1,h2,h3,[data-slot=card-title]{font-family:${stack}}`);
  }
  if (t.images.background) {
    css.push(`body{background-image:url("${t.images.background}");background-size:cover;background-position:center;background-attachment:fixed}`);
  }
  return css.join("\n");
}
