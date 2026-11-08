import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { connection } from "next/server";
import { PreviewBanner } from "@/components/theme/preview-banner";
import { ThemeEffect } from "@/components/theme/theme-effect";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getAuction } from "@/lib/auction";
import { brandName } from "@/lib/format";
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
  const [a, theme] = await Promise.all([getAuction(), getActiveTheme()]);
  return {
    title: brandName(a),
    description: a.appSlogan || "Scan, view and bid.",
    icons: favicon(theme.images.icon ?? (a.appLogo ? `/brand/logo?v=${a.appLogo}` : null)),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const theme = await getActiveTheme(); // colours, font, background, effect and wording (src/lib/theme)
  const css = themeCss(theme);
  return (
    <html lang="en" data-theme={theme.id} className={`${jakarta.variable} h-full antialiased`}>
      <head>{css && <style id="yoink-theme" dangerouslySetInnerHTML={{ __html: css }} />}</head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider copy={theme.copy}>{children}</ThemeProvider>
        <ThemeEffect effect={theme.effect} />
        {theme.previewing && <PreviewBanner name={theme.name} />}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
