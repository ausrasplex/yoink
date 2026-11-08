import "server-only";
import zlib from "node:zlib";
import { DOMParser } from "@xmldom/xmldom";

/**
 * SVG upload handling for logos/icons.
 *
 * SVG is a document format, not just an image: it can carry <script>, event handlers, links, external references,
 * CSS that fetches URLs, entity "billion laughs" bombs, and so on. So an uploaded SVG is never stored as-is:
 *
 *   1. repair   — undo the usual damage (gzip/.svgz, odd encodings and BOMs, junk around the markup, Illustrator-style
 *                 entity declarations, stray "&", undeclared namespace prefixes) so real-world files still work;
 *   2. parse    — strict XML parse (xmldom never fetches external entities; DOCTYPEs are removed before parsing anyway);
 *   3. rebuild  — walk the tree and re-serialise ONLY allow-listed elements and attributes with our own serialiser,
 *                 so nothing the parser passes through can sneak into the output;
 *   4. normalise— guarantee xmlns, a viewBox and pixel width/height, which browsers need to size the image (and to draw it
 *                 onto a canvas for the QR PNG download).
 *
 * The result is also served with a locked-down CSP (see /brand/logo), as a second line of defence.
 */

export class SvgError extends Error {}

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

const MAX_INPUT = 2 * 1024 * 1024; // bytes, after decompression
const MAX_OUTPUT = 1024 * 1024;
const MAX_NODES = 10_000;
const MAX_DEPTH = 64;
const MAX_ENTITIES = 100;

const CONTAINERS = ["svg", "g", "defs", "symbol", "clipPath", "mask", "marker", "pattern", "linearGradient", "radialGradient", "filter"];
const SHAPES = ["path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "image", "use"];
const TEXT_HOLDERS = ["text", "tspan", "textPath", "title", "desc", "style"];
const FILTER_PRIMITIVES = [
  "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap",
  "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge",
  "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence",
];
/** Everything else (script, foreignObject, animate/set, iframe, editor metadata…) is dropped with its children. */
const ALLOWED = new Set([...CONTAINERS, ...SHAPES, ...TEXT_HOLDERS, ...FILTER_PRIMITIVES, "stop", "title", "desc"]);
/** Kept for their children only: <a> (links are pointless in an image and risky if the file is opened directly). */
const UNWRAP = new Set(["a"]);
/** Renamed: <switch> picks the first child the viewer supports; with foreignObject gone, a group draws the same thing. */
const RENAME: Record<string, string> = { switch: "g" };

// ---------------------------------------------------------------------------------------------------------------------
// 1. Repair
// ---------------------------------------------------------------------------------------------------------------------

function decode(buf: Buffer): string {
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    // .svgz
    try {
      buf = zlib.gunzipSync(buf, { maxOutputLength: MAX_INPUT });
    } catch {
      throw new SvgError("This compressed SVG (.svgz) is damaged or too large.");
    }
  }
  if (buf.length > MAX_INPUT) throw new SvgError("SVG files must be under 2 MB.");
  let text: string;
  if (buf[0] === 0xff && buf[1] === 0xfe) text = new TextDecoder("utf-16le").decode(buf.subarray(2));
  else if (buf[0] === 0xfe && buf[1] === 0xff) text = new TextDecoder("utf-16be").decode(buf.subarray(2));
  else text = new TextDecoder("utf-8").decode(buf); // invalid bytes become U+FFFD instead of failing; strips a UTF-8 BOM
  // Characters that aren't allowed anywhere in XML 1.0 (often NULs from a truncated or padded download).
  return text.replace(/^﻿/, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");
}

/** Drops anything before the markup starts and after the closing </svg> (padding, concatenated junk). */
function trimJunk(text: string): string {
  const start = text.search(/<\?xml|<!--|<!DOCTYPE|<svg[\s>/]/i);
  if (start < 0) throw new SvgError("That file isn't an SVG.");
  const end = text.toLowerCase().lastIndexOf("</svg>");
  return text.slice(start, end >= 0 ? end + "</svg>".length : undefined);
}

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/**
 * Removes the DOCTYPE. Simple internal text entities (as Illustrator writes: <!ENTITY ns_svg "http://www.w3.org/2000/svg">)
 * are expanded first so those files keep working. Entities whose value contains "&" or "<" (nesting: the "billion laughs"
 * attack) and external/parameter entities (which would fetch files) are never expanded.
 */
function expandEntities(text: string): string {
  const doctype = /<!DOCTYPE[^[>]*(\[([\s\S]*?)\])?\s*>/i.exec(text);
  if (!doctype) return text;
  const entities = new Map<string, string>();
  const subset = doctype[2] ?? "";
  for (const m of subset.matchAll(/<!ENTITY\s+([A-Za-z_][\w.-]*)\s+(["'])([^"']*)\2\s*>/g)) {
    const [, name, , value] = m;
    if (entities.size >= MAX_ENTITIES) break;
    if (value.length > 2048 || /[&<%]/.test(value)) continue;
    entities.set(name, value);
  }
  let body = text.slice(0, doctype.index) + text.slice(doctype.index + doctype[0].length);
  if (entities.size) {
    body = body.replace(/&([A-Za-z_][\w.-]*);/g, (whole, name: string) => (entities.has(name) ? escAttr(entities.get(name)!) : whole));
    if (body.length > MAX_INPUT * 2) throw new SvgError("SVG files must be under 2 MB.");
  }
  return body;
}

/** HTML entities that turn up in hand-edited SVGs but don't exist in XML. */
const HTML_ENTITIES: Record<string, string> = {
  nbsp: "&#160;", copy: "&#169;", reg: "&#174;", trade: "&#8482;", ndash: "&#8211;", mdash: "&#8212;", hellip: "&#8230;",
};

/** Escapes "&" that doesn't start a valid reference (a common hand-edit / export bug that breaks XML parsing). */
function fixAmpersands(text: string): string {
  return text
    .replace(/&(nbsp|copy|reg|trade|ndash|mdash|hellip);/g, (_, n: string) => HTML_ENTITIES[n])
    .replace(/&(?!(?:amp|lt|gt|quot|apos);|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;");
}

/** Declares namespace prefixes that are used but never declared (e.g. xlink:href with no xmlns:xlink). */
function declarePrefixes(text: string): string {
  const root = /<svg(?=[\s>/])/i.exec(text);
  if (!root) throw new SvgError("That file isn't an SVG.");
  const used = new Set<string>();
  for (const m of text.matchAll(/<\/?([A-Za-z_][\w.-]*):[A-Za-z_]/g)) used.add(m[1]);
  for (const m of text.matchAll(/\s([A-Za-z_][\w.-]*):[A-Za-z_][\w.-]*\s*=/g)) used.add(m[1]);
  used.delete("xml");
  used.delete("xmlns");
  const missing = [...used].filter((p) => !new RegExp(`xmlns:${p.replace(/[.-]/g, "\\$&")}\\s*=`).test(text));
  if (!missing.length) return text;
  const decl = missing.map((p) => ` xmlns:${p}="${p === "xlink" ? XLINK_NS : `urn:x-undeclared:${p}`}"`).join("");
  const at = root.index + root[0].length;
  return text.slice(0, at) + decl + text.slice(at);
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. Rebuild (allow-list)
// ---------------------------------------------------------------------------------------------------------------------

type XNode = {
  nodeType: number; nodeValue: string | null; localName?: string | null; namespaceURI?: string | null; prefix?: string | null;
  childNodes: { length: number; [i: number]: XNode }; attributes?: { length: number; [i: number]: XAttr };
};
type XAttr = { name: string; localName: string | null; prefix: string | null; value: string };

const escText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Strip whitespace/controls and lower-case, so "java\nscript:" or "JaVaScRiPt:" can't slip past a check. */
const squash = (s: string) => s.replace(/[\s\u0000-\u001F]+/g, "").toLowerCase();

const LOCAL_URL = /url\(\s*(['"]?)#[\w.:-]+\1\s*\)/gi;
const hasForeignUrl = (v: string) => /url\(/i.test(v.replace(LOCAL_URL, ""));

function cssIsSafe(css: string): boolean {
  const s = squash(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  if (/@import|expression\(|javascript:|vbscript:|behavior:|-moz-binding|<\/|\\/.test(s)) return false;
  return !hasForeignUrl(css);
}

const RASTER_DATA_URI = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/;

function safeAttr(el: string, a: XAttr): [string, string] | null {
  const name = a.name;
  if (!/^[A-Za-z_][\w.:-]*$/.test(name)) return null;
  const lower = name.toLowerCase();
  if (lower.startsWith("on")) return null; // event handlers
  if (lower === "xmlns" || lower.startsWith("xmlns:")) return null; // we declare namespaces ourselves

  const isHref = name === "href" || (a.prefix === "xlink" && a.localName === "href");
  if (a.prefix && !isHref && name !== "xml:space" && name !== "xml:lang") return null; // editor junk, xml:base, …

  const value = a.value;
  if (isHref) {
    const v = value.trim();
    if (/^#[\w.:-]+$/.test(v)) return ["xlink:href", v]; // same-document references only (gradients, <use>, …)
    if ((el === "image" || el === "feImage") && RASTER_DATA_URI.test(v)) return ["xlink:href", v.replace(/\s+/g, "")];
    return null; // external files, javascript:, nested SVG data: URIs
  }
  const s = squash(value);
  if (s.includes("javascript:") || s.includes("vbscript:") || s.includes("data:")) return null;
  if (lower === "style") {
    // Keep the safe declarations ("fill:red") and drop only the bad ones ("background:url(https://…)").
    const kept = value.split(";").map((d) => d.trim()).filter((d) => d && cssIsSafe(d));
    return kept.length ? [name, kept.join(";")] : null;
  }
  if (hasForeignUrl(value)) return null;
  return [name, value];
}

type Out = { parts: string[]; nodes: number; drawable: boolean };

function serialise(node: XNode, depth: number, out: Out, rootAttrs?: (attrs: [string, string][]) => [string, string][]) {
  if (++out.nodes > MAX_NODES) throw new SvgError("This SVG is too complex.");
  if (depth > MAX_DEPTH) throw new SvgError("This SVG is nested too deeply.");

  const ns = node.namespaceURI;
  const local = node.localName ?? "";
  if (ns && ns !== SVG_NS) return; // HTML, MathML, editor namespaces
  if (UNWRAP.has(local)) return children(node, local, depth, out);
  const name = RENAME[local] ?? local;
  if (!ALLOWED.has(name)) return;
  if (SHAPES.includes(name)) out.drawable = true;

  let attrs: [string, string][] = [];
  const list = node.attributes;
  for (let i = 0; list && i < list.length; i++) {
    const kept = safeAttr(name, list[i]);
    if (kept && !attrs.some(([n]) => n === kept[0])) attrs.push(kept);
  }
  if (rootAttrs) attrs = rootAttrs(attrs);

  if (name === "style") {
    const css = textOf(node);
    if (!cssIsSafe(css)) return; // drop the whole stylesheet rather than guess
    out.parts.push(`<style>${escText(css)}</style>`);
    return;
  }
  out.parts.push(`<${name}${attrs.map(([n, v]) => ` ${n}="${escAttr(v)}"`).join("")}>`);
  children(node, name, depth, out);
  out.parts.push(`</${name}>`);
}

function children(node: XNode, name: string, depth: number, out: Out) {
  const kids = node.childNodes;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.nodeType === 1) serialise(k, depth + 1, out);
    else if ((k.nodeType === 3 || k.nodeType === 4) && TEXT_HOLDERS.includes(name)) out.parts.push(escText(k.nodeValue ?? ""));
    // comments (8), processing instructions (7, e.g. <?xml-stylesheet?>) and stray text are dropped
  }
}

function textOf(node: XNode): string {
  let s = "";
  const kids = node.childNodes;
  for (let i = 0; i < kids.length; i++) if (kids[i].nodeType === 3 || kids[i].nodeType === 4) s += kids[i].nodeValue ?? "";
  return s;
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. Normalise size
// ---------------------------------------------------------------------------------------------------------------------

const UNIT_PX: Record<string, number> = { "": 1, px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };

function toPx(v: string | undefined): number | null {
  const m = v?.trim().match(/^(\d*\.?\d+(?:e[-+]?\d+)?)\s*(px|pt|pc|mm|cm|in)?$/i);
  if (!m) return null; // missing, %, em, garbage
  const n = parseFloat(m[1]) * UNIT_PX[(m[2] ?? "").toLowerCase()];
  return Number.isFinite(n) && n > 0 ? n : null;
}

const round = (n: number) => String(Math.round(n * 1000) / 1000);

/** Makes sure the root has a usable viewBox and pixel width/height, deriving one from the other where possible. */
function normaliseSize(attrs: [string, string][]): [string, string][] {
  const get = (n: string) => attrs.find(([k]) => k === n)?.[1];
  const rest = attrs.filter(([k]) => k !== "width" && k !== "height" && k !== "viewBox");
  let w = toPx(get("width"));
  let h = toPx(get("height"));

  const vb = get("viewBox")?.trim().split(/[\s,]+/).map(Number);
  let viewBox = vb && vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0 ? vb : null;

  if (viewBox) {
    const ratio = viewBox[2] / viewBox[3];
    if (w && !h) h = w / ratio;
    else if (h && !w) w = h * ratio;
    else if (!w && !h) [w, h] = [viewBox[2], viewBox[3]];
  } else if (w && h) {
    viewBox = [0, 0, w, h]; // without a viewBox, one user unit is one pixel of the declared size
  } else {
    throw new SvgError("This SVG has no size. Re-export it with a viewBox (or width and height).");
  }
  return [["viewBox", viewBox.map(round).join(" ")], ["width", round(w!)], ["height", round(h!)], ...rest];
}

// ---------------------------------------------------------------------------------------------------------------------

/** Repairs, sanitises and normalises an uploaded SVG. Throws SvgError with a message fit to show the user. */
export function sanitizeSvg(input: Buffer): string {
  let text = trimJunk(decode(input));
  text = declarePrefixes(fixAmpersands(expandEntities(text)));

  let fatal: string | null = null;
  let doc;
  try {
    doc = new DOMParser({
      onError: (level, msg) => { if (level !== "warning" && !fatal) fatal = msg; },
    }).parseFromString(text, "image/svg+xml");
  } catch (e) {
    fatal ??= e instanceof Error ? e.message : "parse error";
  }
  if (fatal || !doc) {
    console.warn("[svg] rejected upload:", fatal);
    throw new SvgError("This SVG file is damaged and couldn't be read. Try re-exporting it.");
  }

  // The root may be wrapped (e.g. an SVG saved inside an HTML page); use the first <svg> element found.
  const find = (n: XNode): XNode | null => {
    if (n.nodeType === 1 && n.localName === "svg" && (!n.namespaceURI || n.namespaceURI === SVG_NS)) return n;
    for (let i = 0; i < n.childNodes.length; i++) {
      const hit = find(n.childNodes[i]);
      if (hit) return hit;
    }
    return null;
  };
  const root = find(doc as unknown as XNode);
  if (!root) throw new SvgError("That file isn't an SVG.");

  const out: Out = { parts: [], nodes: 0, drawable: false };
  serialise(root, 0, out, normaliseSize);
  if (!out.drawable) throw new SvgError("This SVG doesn't contain anything to draw.");
  const svg = out.parts.join("").replace(/^<svg/, `<svg xmlns="${SVG_NS}" xmlns:xlink="${XLINK_NS}"`);
  if (svg.length > MAX_OUTPUT) throw new SvgError("This SVG is too large once cleaned up. Try simplifying it.");
  return svg;
}

/** True when the upload looks like SVG (by name/type, or by content — some browsers send no type for .svg). */
export function looksLikeSvg(file: File, head: Buffer): boolean {
  if (/\.svgz?$/i.test(file.name) || file.type === "image/svg+xml") return true;
  if (head[0] === 0x1f && head[1] === 0x8b) return false; // gzip without an .svgz name: don't guess
  return /<svg[\s>]/i.test(head.subarray(0, 4096).toString("utf8"));
}
