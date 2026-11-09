import Link from "next/link";
import { Archive, ChevronRight, Crown, Lock, PackageCheck, TrendingDown, Wallet } from "lucide-react";
import { ClaimButton } from "@/components/claim-button";
import { Badge } from "@/components/ui/badge";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { FilterChips } from "@/components/filter-chips";
import { bidStatus, ItemThumb, StatusBadge } from "@/components/item-card";
import { ListingClock } from "@/components/countdown";
import { WinCelebration } from "@/components/theme/win-celebration";
import { Button } from "@/components/ui/button";
import { canBrowse, getAuction } from "@/lib/auction";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { getMyBids } from "@/lib/user-data";

export const dynamic = "force-dynamic";

export default async function BidsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser("/bids");
  const { filter = "all" } = await searchParams;
  const [everything, auction] = await Promise.all([getMyBids(user.id), getAuction()]);
  const browse = canBrowse(user.role, auction);
  // Claimed (won and collected) and archived (didn't win) items live in their own tab, out of the way.
  const archived = everything.filter((b) => b.archived);
  const all = everything.filter((b) => !b.archived);
  const shown = filter === "archived" ? archived : all.filter((b) =>
    filter === "winning" ? b.leading && b.phase !== "ended" : filter === "outbid" ? !b.leading && b.phase !== "ended" : filter === "ended" ? b.phase === "ended" : true);
  const won = (b: (typeof everything)[number]) => b.phase === "ended" && b.leading;
  const ended = (b: (typeof everything)[number]) => b.phase === "ended";

  return (
    <AppShell user={user}>
      <PageTitle icon={<Wallet />} sub="Everything you've bid on. Open listings come first, outbid ones at the top.">My Bids</PageTitle>
      <div className="mb-6">
        <FilterChips
          base="/bids" current={filter}
          options={[
            { value: "all", label: "All", count: all.length },
            { value: "winning", label: "Winning", icon: <Crown className="size-3.5" />, count: all.filter((b) => b.leading && b.phase !== "ended").length },
            { value: "outbid", label: "Outbid", icon: <TrendingDown className="size-3.5" />, count: all.filter((b) => !b.leading && b.phase !== "ended").length },
            { value: "ended", label: "Ended", icon: <Lock className="size-3.5" />, count: all.filter((b) => b.phase === "ended").length },
            { value: "archived", label: "Archived", icon: <Archive className="size-3.5" />, count: archived.length },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center">
          <Wallet className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-bold text-ink">
            {filter === "archived" ? "Nothing archived yet" : everything.length ? "Nothing in this view" : "You haven't bid on anything yet"}
          </p>
          {filter === "archived" && (
            <p className="mt-1 text-sm text-muted-foreground">
              Once an item ends, press Claimed when you&apos;ve collected one you won, or Archive for one you didn&apos;t, to move it here.
            </p>
          )}
          {!everything.length && (browse
            ? <Button asChild className="mt-4"><Link href="/items">Browse items</Link></Button>
            : <p className="mt-1 text-sm text-muted-foreground">Scan the QR code on an item to see it and bid.</p>)}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((b) => (
            <li key={b.lot} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl bg-white p-3 pr-4 transition-shadow hover:shadow-lg hover:shadow-ink/10 sm:flex-nowrap">
              <Link href={`/lot/${b.lot}`} className="flex min-w-0 flex-1 basis-full items-center gap-4 sm:basis-auto">
                <ItemThumb lot={b.lot} image={b.image} className="size-16 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{b.title}</p>
                  <p className="text-xs text-muted-foreground">Lot {b.lot} · {b.bidCount} bids · top bid {money(b.current)}</p>
                  {b.phase !== "ended" && <ListingClock startsAt={b.startsAt} endsAt={b.endsAt} className="mt-1.5" />}
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-extrabold tabular-nums text-ink">{money(b.myBid)}</p><p className="text-xs text-muted-foreground">your best bid</p>
                </div>
                {b.claimedAt
                  ? <Badge variant="secondary"><PackageCheck /> Claimed</Badge>
                  : b.archived ? <Badge variant="secondary"><Archive /> Archived</Badge>
                  : <StatusBadge status={bidStatus(b.leading, b.phase)} />}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              {ended(b) && <div className="ml-auto sm:ml-0"><ClaimButton lot={b.lot} won={won(b)} archived={b.archived} /></div>}
            </li>
          ))}
        </ul>
      )}
      <WinCelebration lots={everything.filter(won).map((b) => b.lot)} />
    </AppShell>
  );
}
