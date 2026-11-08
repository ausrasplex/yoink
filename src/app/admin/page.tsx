import Link from "next/link";
import { Archive, Boxes, Clock, PackageCheck, Download, EyeOff, History, Pencil, Plus, QrCode } from "lucide-react";
import { ArchiveTable } from "@/components/admin/archive-table";
import { ListingClock } from "@/components/countdown";
import { FilterChips } from "@/components/filter-chips";
import { FilterTable, type FilterRow } from "@/components/filter-table";
import { IconLink } from "@/components/icon-action";
import { ItemThumb } from "@/components/item-card";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { listingTime, phaseOf } from "@/lib/listing";

export const dynamic = "force-dynamic";

const PHASE_LABEL = { scheduled: "Scheduled", open: "Open", ended: "Ended" } as const;

/**
 * Admin: Manage items. "Active" = scheduled or open listings; "Archived" = ended listings,
 * where Admins review results and delete old listings (one at a time or several together).
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const term = (sp.q ?? "").trim().slice(0, 80);
  const archived = sp.filter === "archived";
  const lotNo = /^\d+$/.test(term) ? Number(term) : undefined;
  const now = new Date();
  const search = term ? { OR: [{ title: { contains: term, mode: "insensitive" as const } }, ...(lotNo ? [{ lot: lotNo }] : [])] } : {};
  const [items, users, bids, itemStats, activeCount, archivedCount] = await Promise.all([
    db.item.findMany({
      where: { AND: [search, archived ? { endsAt: { lte: now } } : { endsAt: { gt: now } }] },
      orderBy: archived ? { endsAt: "desc" } : { lot: "asc" },
      include: {
        highBidder: { select: { name: true, email: true } }, _count: { select: { bids: true } },
        images: { take: 1, orderBy: { position: "asc" } },
      },
    }),
    db.user.count({ where: { role: "USER" } }),
    db.bid.count(),
    db.item.aggregate({ _count: true, _sum: { currentBid: true } }),
    db.item.count({ where: { endsAt: { gt: now } } }),
    db.item.count({ where: { endsAt: { lte: now } } }),
  ]);
  const total = itemStats._sum.currentBid ?? 0;

  const itemCell = (i: (typeof items)[number]) => (
    <div className="flex items-center gap-3">
      <ItemThumb lot={i.lot} image={i.images[0]?.filename ?? null} className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="max-w-64 truncate font-bold text-ink">{i.title}</p>
        <p className="text-xs text-muted-foreground">Lot {i.lot}</p>
      </div>
    </div>
  );
  const actions = (i: (typeof items)[number]) => (
    <div className="flex justify-end gap-1">
      <IconLink href={`/admin/items/${i.id}#qr`} label={`QR code for lot ${i.lot}`}><QrCode /></IconLink>
      <IconLink href={`/admin/history?lot=${i.lot}`} label={`Bid history for lot ${i.lot}`}><History /></IconLink>
      <IconLink href={`/admin/items/${i.id}`} label={`Edit lot ${i.lot}`}><Pencil /></IconLink>
    </div>
  );
  const none = <span className="text-muted-foreground">—</span>;

  const rows: FilterRow[] = items.map((i) => {
    const phase = phaseOf(i, now.getTime());
    const hidden = i.hiddenUntilStart && phase === "scheduled";
    return {
      id: i.id,
      values: {
        item: `Lot ${i.lot} ${i.title}`,
        status: hidden ? "Hidden" : PHASE_LABEL[phase],
        ends: listingTime(i.endsAt),
        bid: i.currentBid,
        bids: i._count.bids,
        leader: i.highBidder ? `${i.highBidder.name} ${i.highBidder.email}` : "",
        claimed: !i.highBidder ? "No winner" : i.claimedAt ? "Claimed" : "Waiting",
      },
      sort: { claimed: i.claimedAt ? i.claimedAt.getTime() : i.highBidder ? 0 : null, status: phase === "scheduled" ? i.startsAt.getTime() : i.endsAt.getTime(), ends: i.endsAt.getTime(), item: i.lot },
      cells: {
        item: itemCell(i),
        status: (
          <div className="flex flex-wrap items-center gap-1.5">
            <ListingClock startsAt={i.startsAt.toISOString()} endsAt={i.endsAt.toISOString()} />
            {hidden && <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white"><EyeOff className="size-3.5" /> Hidden</span>}
          </div>
        ),
        ends: <span className="whitespace-nowrap text-sm">{listingTime(i.endsAt)}</span>,
        bid: <span className="font-bold tabular-nums">{i.currentBid === null ? none : money(i.currentBid)}</span>,
        bids: <span className="tabular-nums">{i._count.bids}</span>,
        leader: i.highBidder?.name ?? none,
        claimed: !i.highBidder ? none
          : i.claimedAt ? <Badge variant="lime" title={`Claimed ${listingTime(i.claimedAt)}`}><PackageCheck /> Claimed {i.claimedAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</Badge>
          : <Badge variant="peach"><Clock /> Waiting</Badge>,
        actions: actions(i),
      },
    };
  });

  return (
    <AppShell user={user}>
      <PageTitle icon={<Boxes />}
        sub="Items, bids and results for the whole auction."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><a href="/admin/export"><Download /> Export CSV</a></Button>
            <Button asChild><Link href="/admin/items/new"><Plus /> Add item</Link></Button>
          </div>
        }
      >
        Manage Items
      </PageTitle>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="col-span-2 rounded-3xl bg-lime p-5 lg:col-span-1">
          <p className="text-4xl font-extrabold tabular-nums text-ink">{money(total)}</p>
          <p className="mt-2 text-xs font-semibold text-ink/70">Raised at current bids</p>
        </div>
        {[["Items", itemStats._count, "bg-lilac"], ["Bids placed", bids, "bg-peach"], ["Users", users, "bg-white"]].map(([label, n, tint]) => (
          <div key={label as string} className={`rounded-3xl p-5 ${tint}`}>
            <p className="text-4xl font-extrabold tabular-nums text-ink">{n}</p>
            <p className="mt-2 text-xs font-semibold text-ink/70">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          base="/admin" current={archived ? "archived" : "all"} q={term}
          options={[
            { value: "all", label: "Active", icon: <Boxes className="size-3.5" />, count: activeCount },
            { value: "archived", label: "Archived", icon: <Archive className="size-3.5" />, count: archivedCount },
          ]}
        />
      </div>

      <div className="rounded-3xl bg-white p-3">
        {archived ? (
          <ArchiveTable
            rows={rows}
            columns={[
              { id: "item", header: "Item" },
              { id: "ends", header: "Ended" },
              { id: "bid", header: "Winning bid", align: "right" },
              { id: "bids", header: "Bids", align: "right" },
              { id: "leader", header: "Winner" },
              { id: "claimed", header: "Claimed", options: ["Claimed", "Waiting", "No winner"] },
              { id: "actions", header: "", align: "right" },
            ]}
            empty={term ? `No archived items match “${term}”.` : "Nothing archived yet. Listings move here once they end."}
          />
        ) : (
          <FilterTable
            label="Active items" searchPlaceholder="Search items, lots or leaders…"
            rows={rows}
            columns={[
              { id: "item", header: "Item" },
              { id: "status", header: "Status", options: ["Scheduled", "Hidden", "Open"] },
              { id: "bid", header: "Current bid", align: "right" },
              { id: "bids", header: "Bids", align: "right" },
              { id: "leader", header: "Leader" },
              { id: "actions", header: "", align: "right" },
            ]}
            empty={term ? `No active items match “${term}”.` : "No active items. Add one, or look in Archived for listings that have ended."}
          />
        )}
      </div>
    </AppShell>
  );
}
