import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getActiveTheme } from "@/lib/theme/active";
import { LOGO_NAME, uploadDir } from "@/lib/uploads";

/** True when an uploaded Branding file is actually on this server's disk (a database shared with another
 *  install, or a restored backup without its uploads, can name a file that isn't here). */
function present(name: string | null): name is string {
  if (!name || !LOGO_NAME.test(name)) return false;
  try {
    return fs.existsSync(path.join(uploadDir(), name));
  } catch {
    return false;
  }
}

/**
 * Which images to show for the app's icon and landscape logo, first that exists:
 * the active theme's → the Branding upload (Server page), if its file is here → (icon only) the default Yoink icon.
 * A missing file falls through instead of showing a broken image.
 */
export async function brandImages(a: { appLogo: string | null; appLogoWide: string | null }) {
  const t = await getActiveTheme();
  return {
    logo: t.images.icon ?? (present(a.appLogo) ? `/brand/logo?v=${a.appLogo}` : null),
    logoWide: t.images.logo ?? (present(a.appLogoWide) ? `/brand/wordmark?v=${a.appLogoWide}` : null),
  };
}
