import Link from "next/link";
import { ChevronLeft, ChevronRight, Crown, History, TrendingDown } from "lucide-react";
import { LotPicker } from "@/components/admin/lot-picker";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterTable, type FilterRow } from "@/components/filter-table";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ lot?: string; page?: string }> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const lot = Number.parseInt(sp.lot ?? "", 10);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const where = Number.isFinite(lot) ? { item: { lot } } : {};

  const [items, total, bids] = await Promise.all([
    db.item.findMany({ orderBy: { lot: "asc" }, select: { lot: true, title: true } }),
    db.bid.count({ where }),
    db.bid.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE, take: PAGE,
      include: {
        user: { select: { name: true, email: true, shift: true, avatar: true } },
        item: { select: { lot: true, title: true, currentBid: true, highBidderId: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const q = new URLSearchParams();
    if (Number.isFinite(lot)) q.set("lot", String(lot));
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/history${s ? `?${s}` : ""}`;
  };
  const selected = items.find((i) => i.lot === lot);

  const rows: FilterRow[] = bids.map((b) => {
    const leading = b.item.highBidderId === b.userId && b.item.currentBid === b.amount;
    const when = b.createdAt.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "medium", timeZone: "Australia/Melbourne" });
    return {
      id: b.id,
      values: {
        when, item: `Lot ${b.item.lot} ${b.item.title}`,
        bidder: `${b.user.name} ${b.user.email} ${b.user.shift ?? ""}`,
        amount: b.amount, status: leading ? "Leading" : "Outbid",
      },
      sort: { when: b.createdAt.getTime(), item: b.item.lot },
      cells: {
        when: <time dateTime={b.createdAt.toISOString()} className="whitespace-nowrap text-sm">{when}</time>,
        item: (
          <>
            <Link href={`/admin/history?lot=${b.item.lot}`} className="font-bold text-ink hover:underline">Lot {b.item.lot}</Link>
            <p className="max-w-48 truncate text-xs text-muted-foreground">{b.item.title}</p>
          </>
        ),
        bidder: (
          <div className="flex items-center gap-3">
            <UserAvatar name={b.user.name} avatar={b.user.avatar} className="size-8" textClassName="text-[11px]" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{b.user.name}</p>
              <p className="max-w-48 truncate text-xs text-muted-foreground">{b.user.shift ? `${b.user.shift} · ` : ""}{b.user.email}</p>
            </div>
          </div>
        ),
        amount: <span className="font-bold tabular-nums">{money(b.amount)}</span>,
        status: leading ? <Badge variant="lime"><Crown /> Leading</Badge> : <Badge variant="secondary"><TrendingDown /> Outbid</Badge>,
      },
    };
  });

  return (
    <AppShell user={user}>
      <PageTitle sub={selected ? `Every bid on Lot ${selected.lot}, newest first.` : "Every bid placed, newest first."} icon={<History />}>
        Bid History
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label htmlFor="lot" className="text-sm font-semibold text-ink">Item</label>
        <LotPicker items={items} value={Number.isFinite(lot) ? lot : null} />
        {Number.isFinite(lot) && <Button asChild variant="ghost"><Link href="/admin/history">Clear</Link></Button>}
        <span className="ml-auto text-sm text-muted-foreground">{total} bid{total === 1 ? "" : "s"}</span>
      </div>

      <div className="rounded-3xl bg-white p-3">
        <FilterTable
          label="Bids"
          rows={rows}
          columns={[
            { id: "when", header: "When" },
            { id: "item", header: "Item" },
            { id: "bidder", header: "Bidder" },
            { id: "amount", header: "Amount", align: "right" },
            { id: "status", header: "Status", options: ["Leading", "Outbid"] },
          ]}
          empty="No bids yet."
        />
        {pages > 1 && <p className="px-2 pb-1 text-xs text-muted-foreground">Sorting and search apply to this page of bids; use the Item picker above to see every bid on one item.</p>}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
            <Link href={qs(page - 1)} aria-disabled={page <= 1}><ChevronLeft /> Newer</Link>
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-40" : ""}>
            <Link href={qs(page + 1)} aria-disabled={page >= pages}>Older <ChevronRight /></Link>
          </Button>
        </div>
      )}
    </AppShell>
  );
}
