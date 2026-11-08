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

type BrandFields = { appLogo: string | null; appLogoWide: string | null; appLogoDark: string | null; appLogoWideDark: string | null };

/**
 * Which images to show for the app's icon and landscape logo, first that exists:
 * the active theme's → the Branding upload (Server page), if its file is here → (icon only) the default Yoink icon.
 * The "Dark" versions are for dark backgrounds (the desktop sign-in panel): each layer's dark image first, then its
 * normal one, so a theme or Branding with a single image still works everywhere. Missing files fall through.
 */
export async function brandImages(a: BrandFields) {
  const t = await getActiveTheme();
  const icon = present(a.appLogo) ? `/brand/logo?v=${a.appLogo}` : null;
  const wide = present(a.appLogoWide) ? `/brand/wordmark?v=${a.appLogoWide}` : null;
  const iconDark = present(a.appLogoDark) ? `/brand/logo?variant=dark&v=${a.appLogoDark}` : null;
  const wideDark = present(a.appLogoWideDark) ? `/brand/wordmark?variant=dark&v=${a.appLogoWideDark}` : null;
  return {
    logo: t.images.icon ?? icon,
    logoWide: t.images.logo ?? wide,
    logoDark: t.images.iconDark ?? t.images.icon ?? iconDark ?? icon,
    logoWideDark: t.images.logoDark ?? t.images.logo ?? wideDark ?? wide,
  };
}
