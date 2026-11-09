import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getAuction } from "@/lib/auction";
import { brandImages } from "@/lib/brand";
import { brandName } from "@/lib/format";
import { getActiveTheme } from "@/lib/theme/active";

/**
 * /manifest.webmanifest: what "Install app" / "Add to Home screen" uses. `standalone` opens it as its own app,
 * without the browser's address bar. Name, icon and colours follow Branding and the active theme.
 *
 * Icons: the default Yoink icon comes with "maskable" versions (artwork on a full navy square), so Android fills the
 * whole launcher shape instead of putting a small icon in a white circle. A custom icon (theme or Branding) is listed
 * as-is: Android fills the shape with it only if it's already a full square with no transparent corners.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  await connection(); // per request: branding and theme live in the database
  const a = await getAuction();
  const name = brandName(a);
  const theme = await getActiveTheme();
  const canvas = theme.colours?.canvas ?? "#f1f1f3";
  const { logo } = await brandImages(a);

  const icons: MetadataRoute.Manifest["icons"] = logo
    ? [{ src: logo, sizes: "any", type: /\.svg(\b|$)/i.test(logo) ? "image/svg+xml" : undefined, purpose: "any" }]
    : [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

  return {
    id: "/",
    name,
    short_name: name,
    description: a.appSlogan || "Scan, view and bid.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: canvas, // splash screen while it opens
    theme_color: canvas,      // status bar / title bar, matching the page behind it
    icons,
  };
}
