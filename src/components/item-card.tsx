import Image from "next/image";
import Link from "next/link";
import { Gavel, Crown, EyeOff, Trophy, TrendingDown } from "lucide-react";
import { ListingClock } from "@/components/countdown";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const tintFor = (lot: number) => (["bg-lilac", "bg-peach", "bg-lime"] as const)[lot % 3];

export type Status = "winning" | "outbid" | "won" | "lost" | null;

/** winning/outbid while a listing is open; won/lost once it has ended. */
export function StatusBadge({ status }: { status: Status }) {
  if (status === "winning") return <Badge variant="lime"><Crown /> Winning</Badge>;
  if (status === "outbid") return <Badge className="bg-destructive text-white"><TrendingDown /> Outbid</Badge>;
  if (status === "won") return <Badge variant="lime"><Trophy /> Won</Badge>;
  if (status === "lost") return <Badge variant="secondary">Not won</Badge>;
  return null;
}

/** Item photo, or a tinted placeholder when there isn't one. */
export function ItemThumb({ lot, image, className }: { lot: number; image: string | null; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", !image && tintFor(lot), className)}>
      {image ? (
        <Image src={`/uploads/${image}`} alt="" fill unoptimized className="object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-ink/40"><Gavel className="size-1/3" strokeWidth={1.6} /></div>
      )}
    </div>
  );
}

export function ItemCard(p: {
  lot: number; title: string; image: string | null; price: number; bids: number; status: Status; noBidsYet: boolean;
  startsAt: string; endsAt: string; hidden?: boolean; // hidden: Admin view of a listing Users can't see yet
}) {
  return (
    <Link href={`/lot/${p.lot}`} className="group block rounded-3xl bg-white p-3 transition-shadow hover:shadow-lg hover:shadow-ink/10">
      <div className="relative">
        <ItemThumb lot={p.lot} image={p.image} className="aspect-[4/3] rounded-2xl" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink backdrop-blur">Lot {p.lot}</span>
        {p.status && <span className="absolute right-3 top-3"><StatusBadge status={p.status} /></span>}
      </div>
      <div className="px-2 pb-2 pt-4">
        <h3 className="truncate font-bold text-ink">{p.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <ListingClock startsAt={p.startsAt} endsAt={p.endsAt} />
          {p.hidden && <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white"><EyeOff className="size-3.5" /> Hidden</span>}
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{p.noBidsYet ? "Starting bid" : "Current bid"}</p>
            <p className="text-xl font-extrabold tabular-nums text-ink">{money(p.price)}</p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            {p.bids} {p.bids === 1 ? "bid" : "bids"}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Badge status for a listing the person has bid on. */
export const bidStatus = (leading: boolean, phase: "scheduled" | "open" | "ended"): Status =>
  phase === "ended" ? (leading ? "won" : "lost") : leading ? "winning" : "outbid";
