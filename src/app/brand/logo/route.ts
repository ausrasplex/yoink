import { getAuction } from "@/lib/auction";
import { serveBrandFile } from "@/lib/brand-file";

/** Branding icon (square). ?variant=dark → the version for dark backgrounds (falls back to the normal one). */
export async function GET(req: Request) {
  const a = await getAuction();
  const dark = new URL(req.url).searchParams.get("variant") === "dark";
  return serveBrandFile(dark ? (a.appLogoDark ?? a.appLogo) : a.appLogo);
}
