import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { looksLikeSvg, sanitizeSvg, SvgError } from "@/lib/svg";

export const uploadDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./data/uploads");

/** Item photos: raster only. */
export const PHOTO_NAME = /^[a-f0-9]{32}\.(jpg|png|webp)$/;
/** Logos (app logo, QR centre logo): raster or sanitised SVG. */
export const LOGO_NAME = /^[a-f0-9]{32}\.(jpg|png|webp|svg)$/;

export const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", svg: "image/svg+xml" };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 10 * 1024 * 1024;

function rasterExt(buf: Buffer): string | undefined {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
}

async function write(ext: string, data: Buffer | string): Promise<string> {
  const name = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  await fs.mkdir(uploadDir(), { recursive: true });
  await fs.writeFile(path.join(uploadDir(), name), data);
  return name;
}

/** Validates by magic bytes (not just the client-supplied type) and stores under a random name. */
export async function saveImage(file: File): Promise<string> {
  if (file.size === 0 || file.size > MAX_BYTES) throw new Error("Images must be under 10 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = rasterExt(buf);
  if (!ext || !EXT[file.type]) throw new Error("Only JPEG, PNG or WebP images are allowed.");
  return write(ext, buf);
}

/** Profile pictures: JPEG/PNG/WebP only (no SVG), up to 5 MB. */
export async function saveAvatar(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Pictures must be under 5 MB.");
  try {
    return await saveImage(file);
  } catch (e) {
    throw new Error(e instanceof Error && e.message.startsWith("Only") ? "Pictures must be JPEG, PNG or WebP." : "Upload failed.");
  }
}

/**
 * Logos: JPEG/PNG/WebP as for photos, or SVG — which is always repaired and rebuilt from an allow-list
 * (see src/lib/svg.ts) before it's stored; the original upload is never written to disk.
 */
export async function saveLogo(file: File): Promise<string> {
  if (file.size === 0 || file.size > 2 * 1024 * 1024) throw new Error("Logo must be under 2 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = rasterExt(buf);
  if (ext) return write(ext, buf);
  if (!looksLikeSvg(file, buf)) throw new Error("Logos must be SVG, PNG, JPEG or WebP.");
  try {
    return await write("svg", sanitizeSvg(buf));
  } catch (e) {
    if (e instanceof SvgError) throw new Error(e.message);
    throw e;
  }
}

export async function deleteImageFile(name: string) {
  if (LOGO_NAME.test(name)) await fs.rm(path.join(uploadDir(), name), { force: true });
}
