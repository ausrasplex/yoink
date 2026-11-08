import { getAuction } from "@/lib/auction";
import { serveBrandFile } from "@/lib/brand-file";

/** Branding logo (landscape): replaces icon + name in the sidebar, top bar and sign-in screens. */
export async function GET() {
  return serveBrandFile((await getAuction()).appLogoWide);
}
