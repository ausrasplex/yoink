import "server-only";
import { getActiveTheme } from "@/lib/theme/active";

/**
 * Which images to show for the app's icon and landscape logo, first that exists:
 * the active theme's → the Branding upload (Server page) → (icon only) the default Yoink icon.
 */
export async function brandImages(a: { appLogo: string | null; appLogoWide: string | null }) {
  const t = await getActiveTheme();
  return {
    logo: t.images.icon ?? (a.appLogo ? `/brand/logo?v=${a.appLogo}` : null),
    logoWide: t.images.logo ?? (a.appLogoWide ? `/brand/wordmark?v=${a.appLogoWide}` : null),
  };
}
