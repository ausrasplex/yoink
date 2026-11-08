import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { CONTENT_TYPES, LOGO_NAME, uploadDir } from "@/lib/uploads";

/** Inlines the logo as a data URI so the QR page (and prints/PDFs of it) never depend on auth'd image requests. */
export async function logoDataUri(name: string | null): Promise<string | null> {
  if (!name || !LOGO_NAME.test(name)) return null;
  // SVGs were sanitised on upload, and drawn as an <image> they can't run scripts or fetch anything anyway.
  const type = CONTENT_TYPES[name.split(".").pop()!];
  try {
    const data = await fs.readFile(path.join(uploadDir(), name));
    return `data:${type};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Base URL the codes point at: APP_URL, else the address this request came in on. */
export function qrBase(h: Headers): string {
  return (process.env.APP_URL || requestOrigin(h)).replace(/\/$/, "");
}

/** The address this request came in on (what's in the browser's address bar, behind a proxy too). */
export function requestOrigin(h: Headers): string {
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

/**
 * When APP_URL is set but isn't the address being used right now, e.g. APP_URL says localhost:3005 while the dev server
 * runs on localhost:3000. QR codes, invite links and emailed links all use APP_URL, so they'd point at the wrong place.
 * Returns the two origins to show in a warning, or null when they agree (or APP_URL isn't set).
 */
export function appUrlMismatch(h: Headers): { appUrl: string; current: string } | null {
  if (!process.env.APP_URL) return null;
  let appUrl: string;
  try { appUrl = new URL(process.env.APP_URL).origin; } catch { return { appUrl: process.env.APP_URL, current: requestOrigin(h) }; }
  const current = requestOrigin(h);
  return appUrl === current ? null : { appUrl, current };
}
