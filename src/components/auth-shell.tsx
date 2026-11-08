import { BrandMark } from "@/components/brand-mark";
import { getAuction } from "@/lib/auction";
import { brandName } from "@/lib/format";

/** Split-screen frame for sign-in, registration and password screens. */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const auction = await getAuction();
  const name = brandName(auction);
  const logo = auction.appLogo;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
          <BrandMark logo={logo} className="size-10 bg-lime text-ink" iconClassName="size-5" />
          {name}
        </div>
        <div className="relative z-10 mt-28 max-w-sm">
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">Scan it. Love it. Bid on it.</h1>
          <p className="mt-5 text-lg text-white/60">Browse every item, place a bid in seconds, and get told the moment someone outbids you.</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-12 bottom-10 flex rotate-[8deg] items-end gap-4">
          <div className="h-48 w-40 rounded-3xl bg-lilac" />
          <div className="h-56 w-40 rounded-3xl bg-peach" />
          <div className="h-44 w-40 rounded-3xl bg-lime" />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-6 p-5 sm:p-10">
        <div className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-ink lg:hidden">
          <BrandMark logo={logo} className="size-9 bg-ink text-lime" iconClassName="size-[18px]" />
          {name}
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
