import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { CONTENT_TYPES, LOGO_NAME, uploadDir } from "@/lib/uploads";

/**
 * Serves one Branding image (icon or landscape logo) without sign-in, so it can appear on the sign-in screens and as the
 * favicon. Only ever the file named in server settings, never arbitrary uploads.
 */
export async function serveBrandFile(name: string | null): Promise<Response> {
  if (!name || !LOGO_NAME.test(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(uploadDir(), name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[name.split(".").pop()!],
        // Pages link with ?v=<file name>, so a new image shows up straight away despite caching.
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        // SVGs are already sanitised on upload; this stops anything active even if the file is opened directly
        // (no scripts, no network requests, sandboxed as an opaque origin). <img> rendering is unaffected.
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
