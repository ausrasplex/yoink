import { getAuction } from "@/lib/auction";
import { serveBrandFile } from "@/lib/brand-file";

/** Branding icon (square): tab icon and compact spots. */
export async function GET() {
  return serveBrandFile((await getAuction()).appLogo);
}
