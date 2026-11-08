import { BrandLockup } from "@/components/brand-mark";
import { getAuction } from "@/lib/auction";
import { brandImages } from "@/lib/brand";
import { brandName } from "@/lib/format";
import { getActiveTheme } from "@/lib/theme/active";
import { copyFor } from "@/lib/theme/copy";

/** Split-screen frame for sign-in, registration and password screens. */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const auction = await getAuction();
  const name = brandName(auction);
  const { logo, logoWide, logoDark, logoWideDark } = await brandImages(auction);
  const theme = await getActiveTheme();
  const t = (k: Parameters<typeof copyFor>[1]) => copyFor(theme.copy, k);
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="text-xl font-extrabold tracking-tight">
          {/* on the navy panel: the versions for dark backgrounds */}
          <BrandLockup name={name} logo={logoDark} logoWide={logoWideDark} size="lg" />
        </div>
        <div className="relative z-10 mt-28 max-w-sm">
          {/* Headline: the active theme's if it sets one, else the Branding slogan, else the default. */}
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
            {theme.copy.signInHeadline ? t("signInHeadline") : auction.appSlogan || t("signInHeadline")}
          </h1>
          <p className="mt-5 text-lg text-white/60">{t("signInTagline")}</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-12 bottom-10 flex rotate-[8deg] items-end gap-4">
          <div className="h-48 w-40 rounded-3xl bg-lilac" />
          <div className="h-56 w-40 rounded-3xl bg-peach" />
          <div className="h-44 w-40 rounded-3xl bg-lime" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-6 p-5 sm:p-10">
        <div className="text-lg font-extrabold tracking-tight text-ink lg:hidden">
          <BrandLockup name={name} logo={logo} logoWide={logoWide} />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
