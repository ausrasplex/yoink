import { readAsset } from "@/lib/theme/store";

/**
 * Public: a theme's images and font (the sign-in screens use them too). Only files that pass the name allow-list, only
 * from inside a valid theme's own folder. SVGs were sanitised on install and get the same locked-down CSP as logos.
 */
export async function GET(_: Request, { params }: { params: Promise<{ theme: string; file: string }> }) {
  const { theme, file } = await params;
  const asset = readAsset(theme, file);
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.type,
      "Cache-Control": "public, max-age=31536000, immutable", // URLs carry ?v=<theme version>
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
      "Access-Control-Allow-Origin": "*", // fonts load cross-origin-safely from our own pages
    },
  });
}
