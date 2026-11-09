import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { connection } from "next/server";
import { InstallDialog } from "@/components/install/install-ui";
import { PreviewBanner } from "@/components/theme/preview-banner";
import { ThemeEffect } from "@/components/theme/theme-effect";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getAuction } from "@/lib/auction";
import { brandName } from "@/lib/format";
import { brandImages } from "@/lib/brand";
import { getActiveTheme, themeCss } from "@/lib/theme/active";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });

/**
 * Browser tab icon, first that exists: the active theme's icon → the Branding icon (Server page) → the default Yoink icon
 * in public/. (The default lives in public/ rather than app/favicon.ico, because Next always adds a link for
 * app/favicon.ico and browsers would pick that over the others.) URLs carry a version so changes show straight away.
 */
function favicon(url: string | null): Metadata["icons"] {
  if (!url) return { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon-512.png", type: "image/png", sizes: "512x512" }], apple: "/apple-touch-icon.png" };
  const svg = url.split("?")[0].endsWith(".svg");
  return {
    icon: [{ url, type: svg ? "image/svg+xml" : undefined }],
    shortcut: url,
    ...(svg ? {} : { apple: url }), // iOS home-screen icons must be raster
  };
}

export async function generateMetadata(): Promise<Metadata> {
  await connection(); // read the branding per request, never at build time (there's no database during `next build`)
  const a = await getAuction();
  return {
    title: brandName(a),
    description: a.appSlogan || "Scan, view and bid.",
    icons: favicon((await brandImages(a)).logo), // theme icon → Branding icon (if its file is here) → default
    // iPhone "Add to Home Screen": open full screen like an app (Android uses app/manifest.ts).
    appleWebApp: { capable: true, title: brandName(a), statusBarStyle: "default" },
  };
}

/** Browser and installed-app bar colour: the page background, so the status bar blends in. */
export async function generateViewport(): Promise<Viewport> {
  await connection();
  const theme = await getActiveTheme();
  return { themeColor: theme.colours?.canvas ?? "#f1f1f3" };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const [theme, a] = await Promise.all([getActiveTheme(), getAuction()]); // theme: colours, font, background, effect and wording (src/lib/theme)
  const css = themeCss(theme);
  // The theme's CSS is a plain <style> at the top of <body> (after Next's stylesheets, so its :root colours win), which
  // React replaces or removes like any element when the theme changes. Not a hoistable <style href precedence>: React
  // keeps those in the head for the life of the page, so previewed themes piled up and stopping a preview left the last
  // one's colours behind. Not an explicit <head> either: conditional content there mismatched on hydration and React's
  // recovery render wiped Next's stylesheets.
  return (
    <html lang="en" data-theme={theme.id} data-celebration={theme.celebration} className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {css ? <style id="yoink-theme" data-theme-id={theme.id}>{css}</style> : null}
        <ThemeProvider copy={theme.copy}>{children}</ThemeProvider>
        <ThemeEffect effect={theme.effect} />
        {theme.previewing && <PreviewBanner name={theme.name} />}
        <InstallDialog name={brandName(a)} />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
