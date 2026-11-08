import { Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

/** The app logo (served publicly by /brand/logo) or the default gavel tile. */
export function BrandMark({ logo, className, iconClassName }: { logo: string | null; className?: string; iconClassName?: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny, already-sized image from our own route
    return <img src={`/brand/logo?v=${logo}`} alt="" className={cn("shrink-0 rounded-xl bg-white object-contain", className)} />;
  }
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-xl", className)}>
      <Gavel className={iconClassName} />
    </span>
  );
}
