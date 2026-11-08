import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { connection } from "next/server";
import { Toaster } from "@/components/ui/sonner";
import { getAuction } from "@/lib/auction";
import { brandName } from "@/lib/format";
import { themeOf } from "@/lib/themes";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

/**
 * Browser tab icon: the Branding logo (Server page) when one is set, otherwise the default in public/favicon.ico.
 * (The default lives in public/ rather than app/favicon.ico, because Next always adds a link for app/favicon.ico and
 * browsers would pick that over the logo.) ?v=<file> busts browser caches when the logo changes.
 */
function favicon(logo: string | null): Metadata["icons"] {
  if (!logo) return { icon: "/favicon.ico" };
  const url = `/brand/logo?v=${logo}`;
  const svg = logo.endsWith(".svg");
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
    description: "Scan, view and bid.",
    icons: favicon(a.appLogo),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const theme = themeOf((await getAuction()).theme); // getAuction is a single-row upsert; styling hooks: [data-theme="…"]
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
