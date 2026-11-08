import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { strToU8, unzipSync, zipSync, type Unzipped } from "fflate";
import { sanitizeSvg, SvgError } from "@/lib/svg";
import { COPY_KEYS, DEFAULT_COPY, type CopyTable } from "@/lib/theme/copy";
import {
  ASSET_NAME, describeIssue, FONT_ASSET, IMAGE_ASSET, inWindow, THEME_ID, themeSchema, windowSpan, copyTable,
  type Effect, type ThemeFile,
} from "@/lib/theme/schema";

/**
 * Themes are folders: built-in ones ship in the image (themes/ → BUILTIN_THEMES_DIR) and the Server Admin installs more
 * (THEMES_DIR, /data/themes in Docker). An installed theme with the same id as a built-in one replaces it.
 * "yoink" is the default look and wording, always available, and can't be replaced or deleted.
 * See THEMES.md for the format.
 */

export const DEFAULT_THEME_ID = "yoink";
const builtinDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.BUILTIN_THEMES_DIR ?? "./themes");
const userDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.THEMES_DIR ?? "./data/themes");

export type ThemeSource = "default" | "built-in" | "installed";
export type ThemeEntry =
  | { id: string; source: ThemeSource; ok: true; theme: ThemeFile; dir: string | null; version: string; replacesBuiltIn: boolean }
  | { id: string; source: ThemeSource; ok: false; error: string; dir: string; replacesBuiltIn: boolean };

const DEFAULT_ENTRY: ThemeEntry = {
  id: DEFAULT_THEME_ID, source: "default", ok: true, dir: null, version: "0", replacesBuiltIn: false,
  theme: { name: "Yoink", description: "The original look and wording.", effect: "none" },
};

const MAX_JSON = 256 * 1024;

function readTheme(id: string, dir: string, source: ThemeSource, replacesBuiltIn: boolean): ThemeEntry {
  try {
    const file = path.join(dir, "theme.json");
    const stat = fs.statSync(file);
    if (stat.size > MAX_JSON) return { id, source, ok: false, error: "theme.json is larger than 256 KB.", dir, replacesBuiltIn };
    let json: unknown;
    try {
      json = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      return { id, source, ok: false, error: `theme.json isn't valid JSON (${e instanceof Error ? e.message : "parse error"}).`, dir, replacesBuiltIn };
    }
    const parsed = themeSchema.safeParse(json);
    if (!parsed.success) return { id, source, ok: false, error: describeIssue(parsed.error), dir, replacesBuiltIn };
    const t = parsed.data;
    const files = [...Object.values(t.images ?? {}), ...(t.font ? [t.font.file] : [])];
    const missing = files.find((f) => !fs.existsSync(path.join(dir, f)));
    if (missing) return { id, source, ok: false, error: `${missing} is listed in theme.json but isn't in the folder.`, dir, replacesBuiltIn };
    // Version changes whenever any file changes, so asset URLs bust browser caches.
    const version = crypto.createHash("sha1")
      .update(fs.readdirSync(dir).sort().map((f) => `${f}:${fs.statSync(path.join(dir, f)).mtimeMs}`).join("|"))
      .digest("hex").slice(0, 10);
    return { id, source, ok: true, theme: t, dir, version, replacesBuiltIn };
  } catch {
    return { id, source, ok: false, error: "theme.json is missing.", dir, replacesBuiltIn };
  }
}

const subdirs = (dir: string) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && THEME_ID.test(d.name)).map((d) => d.name);
  } catch {
    return [];
  }
};

let cache: { at: number; list: ThemeEntry[] } | null = null;

/** Every theme: default first, then built-in and installed (installed replacing built-in ones with the same id). Re-read every few seconds. */
export function listThemes(): ThemeEntry[] {
  if (cache && Date.now() - cache.at < 3000) return cache.list;
  const builtin = subdirs(builtinDir()).filter((id) => id !== DEFAULT_THEME_ID);
  const installed = subdirs(userDir()).filter((id) => id !== DEFAULT_THEME_ID);
  const byId = new Map<string, ThemeEntry>();
  for (const id of builtin) byId.set(id, readTheme(id, path.join(builtinDir(), id), "built-in", false));
  for (const id of installed) byId.set(id, readTheme(id, path.join(userDir(), id), "installed", builtin.includes(id)));
  const list = [DEFAULT_ENTRY, ...[...byId.values()].sort((a, b) => a.id.localeCompare(b.id))];
  cache = { at: Date.now(), list };
  return list;
}

export const invalidateThemes = () => { cache = null; };

/** The venue's date as MM-DD. */
export function venueMonthDay(now = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.TZ || "Australia/Melbourne", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return `${p.find((x) => x.type === "month")!.value}-${p.find((x) => x.type === "day")!.value}`;
}

/** Which theme is in effect: a preview (Server Admin trying one out) > the chosen one > in Automatic mode, today's dated theme > default. */
export function pickTheme(mode: string, previewId: string | null, now = new Date()): ThemeEntry & { ok: true } {
  const list = listThemes();
  const valid = (id: string | null) => list.find((t): t is ThemeEntry & { ok: true } => t.id === id && t.ok);
  const preview = valid(previewId);
  if (preview) return preview;
  if (mode !== "auto") return valid(mode) ?? (DEFAULT_ENTRY as ThemeEntry & { ok: true });
  const today = venueMonthDay(now);
  const dated = list
    .filter((t): t is ThemeEntry & { ok: true } => t.ok && !!t.theme.active && inWindow(t.theme.active, today))
    .sort((a, b) => windowSpan(a.theme.active!) - windowSpan(b.theme.active!)); // the most specific window wins
  return dated[0] ?? (DEFAULT_ENTRY as ThemeEntry & { ok: true });
}

export type ActiveTheme = {
  id: string; name: string; effect: Effect; copy: CopyTable;
  colours: ThemeFile["colours"];
  images: { icon?: string; logo?: string; background?: string }; // URLs
  font?: { url: string; use: "headings" | "all" };
  previewing: boolean;
};

export const assetUrl = (t: { id: string; version: string }, file: string) => `/theme-assets/${t.id}/${file}?v=${t.version}`;

export function activeTheme(mode: string, previewId: string | null): ActiveTheme {
  const t = pickTheme(mode, previewId);
  const img = t.theme.images ?? {};
  return {
    id: t.id, name: t.theme.name, effect: t.theme.effect, copy: copyTable(t.theme.copy), colours: t.theme.colours,
    images: {
      icon: img.icon && assetUrl(t, img.icon), logo: img.logo && assetUrl(t, img.logo), background: img.background && assetUrl(t, img.background),
    },
    font: t.theme.font ? { url: assetUrl(t, t.theme.font.file), use: t.theme.font.use } : undefined,
    previewing: !!previewId && previewId === t.id,
  };
}

const TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml",
  woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf",
};

/** A file from a valid theme's folder, or null. Only names matching ASSET_NAME, only inside that folder. */
export function readAsset(id: string, file: string): { data: Buffer; type: string } | null {
  if (!THEME_ID.test(id) || !ASSET_NAME.test(file)) return null;
  const t = listThemes().find((x) => x.id === id && x.ok && x.dir);
  if (!t || !t.dir) return null;
  const full = path.join(t.dir, file);
  if (path.dirname(full) !== path.resolve(t.dir)) return null;
  try {
    return { data: fs.readFileSync(full), type: TYPES[file.split(".").pop()!.toLowerCase()] };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Install / export / delete (Server Admin)
// ---------------------------------------------------------------------------------------------------------------------

export class ThemeError extends Error {}

const LIMITS = { zip: 15 * 1024 * 1024, total: 30 * 1024 * 1024, file: 8 * 1024 * 1024, files: 40 };

/** Checks a file's real type by its first bytes (never trust the extension). SVGs are rebuilt by the sanitiser. */
function checkFile(name: string, data: Uint8Array): Uint8Array {
  const b = Buffer.from(data);
  const ext = name.split(".").pop()!.toLowerCase();
  const isPng = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const ok =
    ext === "png" ? isPng
    : ext === "jpg" || ext === "jpeg" ? b[0] === 0xff && b[1] === 0xd8
    : ext === "webp" ? b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP"
    : ext === "woff2" ? b.subarray(0, 4).toString() === "wOF2"
    : ext === "woff" ? b.subarray(0, 4).toString() === "wOFF"
    : ext === "otf" ? b.subarray(0, 4).toString() === "OTTO"
    : ext === "ttf" ? b.readUInt32BE(0) === 0x00010000 || b.subarray(0, 4).toString() === "true"
    : ext === "svg";
  if (!ok) throw new ThemeError(`${name} isn't a real ${ext.toUpperCase()} file.`);
  if (ext === "svg") {
    try {
      return strToU8(sanitizeSvg(b));
    } catch (e) {
      throw new ThemeError(`${name}: ${e instanceof SvgError ? e.message : "couldn't read this SVG."}`);
    }
  }
  return data;
}

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/**
 * Installs a theme from a .zip: theme.json plus its images/font, either at the top level or inside one folder.
 * Everything is checked before anything is written; the folder is then swapped in whole. Returns the theme's id.
 */
export function installThemeZip(zip: Uint8Array): string {
  if (zip.length > LIMITS.zip) throw new ThemeError("Theme zips must be under 15 MB.");
  let total = 0, count = 0;
  let files: Unzipped;
  try {
    files = unzipSync(zip, {
      filter: (f) => {
        if (f.name.endsWith("/")) return false; // folders
        if (/(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)/.test(f.name)) return false;
        count++; total += f.originalSize;
        if (count > LIMITS.files) throw new ThemeError(`A theme can have at most ${LIMITS.files} files.`);
        if (f.originalSize > LIMITS.file) throw new ThemeError(`${f.name} is larger than 8 MB.`);
        if (total > LIMITS.total) throw new ThemeError("The theme is larger than 30 MB once unzipped.");
        return true;
      },
    });
  } catch (e) {
    if (e instanceof ThemeError) throw e;
    throw new ThemeError("That file isn't a valid .zip.");
  }

  // Accept files at the top level or inside a single folder; nothing deeper, no path tricks.
  const names = Object.keys(files);
  const top = new Set(names.map((n) => (n.includes("/") ? n.split("/")[0] : "")));
  const prefix = top.size === 1 && !top.has("") ? `${[...top][0]}/` : "";
  const flat: Record<string, Uint8Array> = {};
  for (const n of names) {
    const rel = n.slice(prefix.length);
    if (!rel || rel.includes("/") || rel.includes("\\") || rel.includes("..")) throw new ThemeError(`${n}: put every file in one folder (no sub-folders).`);
    // theme.json, plus notes (README, licences, the guides, the JSON Schema): kept with the theme but never served
    if (rel === "theme.json" || rel === "theme.schema.json" || /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}\.(md|txt)$/i.test(rel)) { flat[rel] = files[n]; continue; }
    if (!ASSET_NAME.test(rel)) throw new ThemeError(`${rel}: only images (PNG, JPEG, WebP, SVG) and fonts (WOFF2, WOFF, TTF, OTF) can go in a theme.`);
    flat[rel] = checkFile(rel, files[n]);
  }
  if (!flat["theme.json"]) throw new ThemeError("The zip needs a theme.json.");

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(flat["theme.json"]).toString("utf8"));
  } catch {
    throw new ThemeError("theme.json isn't valid JSON.");
  }
  const parsed = themeSchema.safeParse(json);
  if (!parsed.success) throw new ThemeError(describeIssue(parsed.error));
  const t = parsed.data;
  for (const f of [...Object.values(t.images ?? {}), ...(t.font ? [t.font.file] : [])]) {
    if (!flat[f]) throw new ThemeError(`${f} is listed in theme.json but isn't in the zip.`);
  }

  const id = slug(prefix ? prefix.slice(0, -1) : t.name);
  if (!THEME_ID.test(id)) throw new ThemeError("Couldn't make a folder name from the theme's name; use letters and numbers.");
  if (id === DEFAULT_THEME_ID) throw new ThemeError(`"${DEFAULT_THEME_ID}" is the built-in default; give your theme another name.`);

  // Write to a temp folder, then swap it in, so a half-written theme is never live.
  const root = userDir();
  fs.mkdirSync(root, { recursive: true });
  const tmp = path.join(root, `.tmp-${crypto.randomBytes(6).toString("hex")}`);
  fs.mkdirSync(tmp);
  try {
    for (const [name, data] of Object.entries(flat)) fs.writeFileSync(path.join(tmp, name), data);
    const dest = path.join(root, id);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(tmp, dest);
  } catch (e) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw e;
  }
  invalidateThemes();
  return id;
}

/** A theme's folder as a .zip (to edit and re-upload). */
export function exportThemeZip(id: string): Uint8Array | null {
  const t = listThemes().find((x) => x.id === id && x.dir);
  if (!t || !t.dir) return null;
  const files: Record<string, Uint8Array> = {};
  for (const f of fs.readdirSync(t.dir)) {
    const full = path.join(t.dir, f);
    if (fs.statSync(full).isFile()) files[`${id}/${f}`] = fs.readFileSync(full);
  }
  return zipSync(files);
}

/** Removes an installed theme (built-in ones can't be deleted; deleting an installed copy brings the built-in back). */
export function deleteInstalledTheme(id: string): boolean {
  const t = listThemes().find((x) => x.id === id && x.source === "installed");
  if (!t || !t.dir) return false;
  fs.rmSync(t.dir, { recursive: true, force: true });
  invalidateThemes();
  return true;
}

/** Starter theme for authors: every wording key with its default, plus the guides (file name → text). */
export function templateZip(docs: Record<string, string>): Uint8Array {
  const copy = Object.fromEntries(COPY_KEYS.map((k) => [k, DEFAULT_COPY[k]]));
  const theme = {
    name: "My Theme",
    description: "What this theme is for.",
    active: { from: "12-01", to: "12-26" },
    colours: { ink: "#2a2742", lilac: "#b9a4fa", peach: "#fddfba", lime: "#e9f94c", canvas: "#f1f1f3" },
    effect: "none",
    copy,
  };
  return zipSync({
    "my-theme/theme.json": strToU8(JSON.stringify(theme, null, 2) + "\n"),
    ...Object.fromEntries(Object.entries(docs).map(([name, text]) => [`my-theme/${name}`, strToU8(text)])),
  });
}

export { IMAGE_ASSET, FONT_ASSET };
