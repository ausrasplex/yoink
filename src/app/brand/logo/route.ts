import fs from "node:fs/promises";
import path from "node:path";
import { getAuction } from "@/lib/auction";
import { CONTENT_TYPES, LOGO_NAME, uploadDir } from "@/lib/uploads";

/**
 * The app logo, served without sign-in so it can appear on the login screen and as the favicon.
 * Only ever serves the one file named in server settings, never arbitrary uploads.
 */
export async function GET() {
  const { appLogo } = await getAuction();
  if (!appLogo || !LOGO_NAME.test(appLogo)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(uploadDir(), appLogo));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[appLogo.split(".").pop()!],
        // Pages link to /brand/logo?v=<file name>, so a new logo shows up straight away despite caching.
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
