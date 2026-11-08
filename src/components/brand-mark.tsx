import { cn } from "@/lib/utils";

/**
 * The app logo: the Branding logo (Server page, served by /brand/logo) or, until one is uploaded, the default Yoink icon
 * (public/brand-default.png, generated from assets/yoink-icon.png). `className` sizes it. Logos are shown exactly as
 * designed — no background behind transparent ones, nothing clipped.
 */
/**
 * The app's name lockup: the landscape logo when there is one (it already contains the name), otherwise the icon next to
 * the name. Images are URLs, worked out by brandImages() (active theme → Branding upload → default). `size`: sidebar /
 * top bar ("md") or sign-in screens ("lg").
 */
export function BrandLockup({ name, logo, logoWide, size = "md", nameClassName, center = false }: {
  name: string; logo: string | null; logoWide: string | null; size?: "md" | "lg"; nameClassName?: string;
  /** Centre it in its space (the desktop sidebar) instead of aligning left. */
  center?: boolean;
}) {
  if (logoWide) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small image from our own routes
      <img src={logoWide} alt={name}
        className={cn("w-auto max-w-full object-contain", center ? "mx-auto object-center" : "object-left", size === "lg" ? "h-12 max-w-72" : "h-10 max-w-48")} />
    );
  }
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", center && "justify-center")}>
      <BrandMark logo={logo} className={size === "lg" ? "size-10" : "size-9"} />
      <span className={cn("line-clamp-2 leading-tight", nameClassName)}>{name}</span>
    </span>
  );
}

/** The square icon (`logo` is its URL), or the default Yoink icon. Shown exactly as designed. */
export function BrandMark({ logo, className }: { logo: string | null; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny, already-sized image
  return <img src={logo ?? "/brand-default.png"} alt="" className={cn("shrink-0 object-contain", className)} />;
}
