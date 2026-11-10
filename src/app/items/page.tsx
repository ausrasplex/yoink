import { Clock, Crown, SearchX, TrendingDown, Gavel } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { FilterChips } from "@/components/filter-chips";
import { ItemCard, type Status } from "@/components/item-card";
import { redirect } from "next/navigation";
import { canBrowse, getAuction } from "@/lib/auction";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { phaseOf, visibleToUsers } from "@/lib/listing";

export const dynamic = "force-dynamic";

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const user = await requireUser("/items");
  if (!canBrowse(user.role, await getAuction())) redirect("/"); // Items page switched off for Users: QR codes only
  const { q = "", filter = "all" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const lotNo = /^\d+$/.test(term) ? Number(term) : undefined;

  const isAdmin = user.role === "ADMIN"; // admins also see listings hidden until they start
  const search = term ? { OR: [{ title: { contains: term, mode: "insensitive" as const } }, ...(lotNo ? [{ lot: lotNo }] : [])] } : {};
  const [items, myItemIds] = await Promise.all([
    db.item.findMany({
      where: isAdmin ? search : { AND: [search, visibleToUsers()] },
      orderBy: { lot: "asc" },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, _count: { select: { bids: true } } },
    }),
    db.bid.findMany({ where: { userId: user.id }, select: { itemId: true }, distinct: ["itemId"] }),
  ]);
  const bidOn = new Set(myItemIds.map((b) => b.itemId));
  const rows = items.map((i) => {
    const ended = phaseOf(i) === "ended";
    const status: Status = i.highBidderId === user.id ? (ended ? "won" : "winning") : bidOn.has(i.id) ? (ended ? "lost" : "outbid") : null;
    return { i, status };
  });
  const shown = rows.filter(({ i, status }) =>
    filter === "open" ? phaseOf(i) === "open"
    : filter === "winning" ? status === "winning" : filter === "outbid" ? status === "outbid" : filter === "nobids" ? i._count.bids === 0 : true);
  const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;

  return (
    <AppShell user={user}>
      <PageTitle icon={<Gavel />}
        sub={term ? `Results for “${term}”` : `${items.length} item${items.length === 1 ? "" : "s"} in the auction`}
      >
        Items
      </PageTitle>
      <div className="mb-4"><SearchBox action="/items" q={term} hidden={filter !== "all" ? { filter } : undefined} placeholder="Search by name or lot number" /></div>
      <div className="mb-6">
        <FilterChips
          base="/items" current={filter} q={term}
          options={[
            { value: "all", label: "All", count: rows.length },
            { value: "open", label: "Open now", icon: <Clock className="size-3.5" />, count: count((r) => phaseOf(r.i) === "open") },
            { value: "winning", label: "Winning", icon: <Crown className="size-3.5" />, count: count((r) => r.status === "winning") },
            { value: "outbid", label: "Outbid", icon: <TrendingDown className="size-3.5" />, count: count((r) => r.status === "outbid") },
            { value: "nobids", label: "No bids yet", icon: <Gavel className="size-3.5" />, count: count((r) => r.i._count.bids === 0) },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center">
          <SearchX className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-bold text-ink">Nothing here</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map(({ i, status }) => (
            <ItemCard
              key={i.id} lot={i.lot} code={i.code} title={i.title} image={i.images[0]?.filename ?? null}
              price={i.currentBid ?? i.startingBid} bids={i._count.bids} status={status} noBidsYet={i.currentBid === null}
              startsAt={i.startsAt.toISOString()} endsAt={i.endsAt.toISOString()}
              hidden={i.hiddenUntilStart && phaseOf(i) === "scheduled"}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
