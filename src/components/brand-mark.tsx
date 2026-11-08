import { cn } from "@/lib/utils";

/**
 * The app logo: the Branding logo (Server page, served by /brand/logo) or, until one is uploaded, the default Yoink icon
 * (public/brand-default.png, generated from assets/yoink-icon.png). `className` sizes it. Logos are shown exactly as
 * designed — no background behind transparent ones, nothing clipped.
 */
/**
 * The app's name lockup: the landscape logo (Branding) when set — it already contains the name — otherwise the icon
 * next to the name. `size` picks the height used in the sidebar/top bar ("md") or the sign-in screens ("lg").
 */
export function BrandLockup({ name, logo, logoWide, size = "md", nameClassName }: {
  name: string; logo: string | null; logoWide: string | null; size?: "md" | "lg"; nameClassName?: string;
}) {
  if (logoWide) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small image from our own route
      <img src={`/brand/wordmark?v=${logoWide}`} alt={name}
        className={cn("w-auto max-w-full object-contain object-left", size === "lg" ? "h-12 max-w-72" : "h-10 max-w-48")} />
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandMark logo={logo} className={size === "lg" ? "size-10" : "size-9"} />
      <span className={cn("line-clamp-2 leading-tight", nameClassName)}>{name}</span>
    </span>
  );
}

export function BrandMark({ logo, className }: { logo: string | null; className?: string }) {
  const src = logo ? `/brand/logo?v=${logo}` : "/brand-default.png";
  // eslint-disable-next-line @next/next/no-img-element -- tiny, already-sized image
  return <img src={src} alt="" className={cn("shrink-0 object-contain", className)} />;
}
