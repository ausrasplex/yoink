import Link from "next/link";
import { ArrowUpRight, ChevronRight, MoreVertical, Trophy, LayoutGrid } from "lucide-react";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { Countdown } from "@/components/countdown";
import { bidStatus, ItemThumb, StatusBadge } from "@/components/item-card";
import { Sparkline } from "@/components/sparkline";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { pageCopy } from "@/lib/theme/active";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { listingTime, openNow } from "@/lib/listing";
import { getBidActivity, getMyBids } from "@/lib/user-data";

export const dynamic = "force-dynamic";

const heroTints = ["bg-lilac", "bg-peach", "bg-lime"];

export default async function Dashboard() {
  const user = await requireUser("/");
  const now = new Date();
  const [mine, activity, hot, openCount, endingNext, startingNext] = await Promise.all([
    getMyBids(user.id),
    getBidActivity(),
    db.item.findMany({ // popular listings that can still be bid on
      where: openNow(now),
      orderBy: [{ bids: { _count: "desc" } }, { endsAt: "asc" }], take: 3,
      include: { images: { take: 1, orderBy: { position: "asc" } }, _count: { select: { bids: true } } },
    }),
    db.item.count({ where: openNow(now) }),
    db.item.findFirst({ where: openNow(now), orderBy: { endsAt: "asc" }, select: { lot: true, title: true, endsAt: true } }),
    db.item.findFirst({ // nothing open: the next listing Users are allowed to see coming
      where: { startsAt: { gt: now }, ...(user.role === "ADMIN" ? {} : { hiddenUntilStart: false }) },
      orderBy: { startsAt: "asc" }, select: { lot: true, title: true, startsAt: true },
    }),
  ]);
  const open = mine.filter((b) => b.phase === "open");
  const leading = open.filter((b) => b.leading);
  const outbid = open.length - leading.length;
  const won = mine.filter((b) => b.phase === "ended" && b.leading);
  const first = user.name.split(" ")[0];
  const t = await pageCopy(); // the active theme's wording
  const winningTotal = leading.reduce((s, b) => s + b.myBid, 0);

  // Hero cards: items needing attention first, then top up with popular items.
  const heroCards = [
    ...mine.slice(0, 3).map((b) => ({ lot: b.lot, title: b.title, line: `${money(b.current)} · ${b.bidCount} bids`, pct: Math.min(100, Math.round((b.myBid / b.current) * 100)), tag: b.phase === "ended" ? (b.leading ? "Won" : "Ended") : b.leading ? "Winning" : "Outbid" })),
    ...hot.filter((h) => !mine.some((b) => b.lot === h.lot)).map((h) => ({ lot: h.lot, title: h.title, line: `${money(h.currentBid ?? h.startingBid)} · ${h._count.bids} bids`, pct: null as number | null, tag: "Popular" })),
  ].slice(0, 3);

  const plural = (n: number) => `${n} item${n === 1 ? "" : "s"}`;
  const headline = mine.length === 0 ? "Find something you love"
    : leading.length > 0 ? `You're winning ${plural(leading.length)}!`
    : outbid > 0 ? "You've been outbid on everything"
    : won.length > 0 ? `You won ${plural(won.length)}!`
    : "Your listings have ended";
  const sub = mine.length === 0 || open.length === 0
    ? `${plural(openCount)} ${openCount === 1 ? "is" : "are"} open for bidding.`
    : outbid > 0 ? `Outbid on ${outbid} — time to bid again.` : `Hi, ${first}.`;

  return (
    <AppShell user={user}>
      <PageTitle icon={<LayoutGrid />}>My Progress</PageTitle>

      <section className="relative mb-8 overflow-hidden rounded-3xl bg-ink text-white lg:overflow-visible">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-sm">
            <p className="text-sm text-white/60">{t("welcomeBack", { first, name: user.name })}</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{headline}</h2>
            <p className="mt-2 text-sm text-white/60">{sub}</p>
            <Button asChild variant="soft" className="mt-6 uppercase tracking-wide text-xs">
              <Link href={mine.length ? "/bids" : "/items"}>See all <ArrowUpRight /></Link>
            </Button>
          </div>
          <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-1 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
            {heroCards.map((c, i) => (
              <Link
                key={c.lot}
                href={`/lot/${c.lot}`}
                className={`${heroTints[i % 3]} flex h-52 w-44 shrink-0 flex-col rounded-3xl p-4 text-ink transition-transform hover:-translate-y-1 sm:w-48 ${i === 2 ? "lg:translate-x-8" : ""} ${i === 0 ? "lg:-mt-8" : ""}`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{String(i + 1).padStart(2, "0")}</span><MoreVertical className="size-4" />
                </div>
                <div className="mt-3 grid size-9 place-items-center rounded-xl bg-ink/90 text-xs font-extrabold text-white">#{c.lot}</div>
                <h3 className="mt-3 line-clamp-2 text-base font-extrabold leading-tight">{c.title}</h3>
                <div className="mt-auto">
                  <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-ink/70"><span>{c.line}</span></div>
                  {c.pct !== null && <div className="h-1.5 rounded-full bg-ink/15"><div className="h-full rounded-full bg-ink" style={{ width: `${c.pct}%` }} /></div>}
                  <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/70">{c.tag}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-extrabold text-ink">Statistics</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-white p-5">
                <p className="text-4xl font-extrabold tabular-nums text-ink">{leading.length}</p>
                <p className="mt-2 text-xs text-muted-foreground">Items winning</p>
              </div>
              <div className="rounded-3xl bg-white p-5">
                <p className="text-4xl font-extrabold tabular-nums text-ink">{mine.length}</p>
                <p className="mt-2 text-xs text-muted-foreground">Items bid on</p>
                {outbid > 0 && <p className="mt-1 text-xs font-semibold text-destructive">{outbid} outbid</p>}
              </div>
              <div className="rounded-3xl bg-white p-5">
                <div className="flex items-end justify-between gap-2">
                  <p className="text-4xl font-extrabold tabular-nums text-ink">{activity.reduce((a, b) => a + b, 0)}</p>
                  <Sparkline values={activity} className="h-12 w-24" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Bids placed in last 24h</p>
              </div>
            </div>
            {winningTotal > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Your winning bids total <strong className="text-ink">{money(winningTotal)}</strong>.</p>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">My bids</h2>
              <Link href="/bids" className="text-xs font-semibold text-muted-foreground hover:text-ink">View all</Link>
            </div>
            {mine.length === 0 ? (
              <div className="rounded-3xl bg-white p-8 text-center">
                <Trophy className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-bold text-ink">No bids yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Scan an item&apos;s QR code or browse the list to place your first bid.</p>
                <Button asChild className="mt-4"><Link href="/items">Browse items</Link></Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {mine.slice(0, 4).map((b) => (
                  <li key={b.lot}>
                    <Link href={`/lot/${b.lot}`} className="flex items-center gap-4 rounded-3xl bg-white p-3 pr-5 transition-shadow hover:shadow-lg hover:shadow-ink/10">
                      <ItemThumb lot={b.lot} image={b.image} className="size-14 shrink-0 rounded-2xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink">{b.title}</p>
                        <p className="text-xs text-muted-foreground">Lot {b.lot} · top bid {money(b.current)}</p>
                      </div>
                      <div className="hidden text-right text-sm sm:block">
                        <p className="font-bold tabular-nums text-ink">{money(b.myBid)}</p><p className="text-xs text-muted-foreground">your bid</p>
                      </div>
                      <StatusBadge status={bidStatus(b.leading, b.phase)} />
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-3xl bg-ink p-5 text-white">
            {endingNext ? (
              <>
                <p className="text-sm font-bold text-white/70">Ending soonest</p>
                <Link href={`/lot/${endingNext.lot}`} className="mt-1 block truncate font-extrabold hover:underline">Lot {endingNext.lot} · {endingNext.title}</Link>
                <div className="mt-3"><Countdown to={endingNext.endsAt.toISOString()} /></div>
                <p className="mt-3 text-xs text-white/60">{listingTime(endingNext.endsAt)}</p>
              </>
            ) : startingNext ? (
              <>
                <p className="text-sm font-bold text-white/70">Next listing opens in</p>
                <Link href={`/lot/${startingNext.lot}`} className="mt-1 block truncate font-extrabold hover:underline">Lot {startingNext.lot} · {startingNext.title}</Link>
                <div className="mt-3"><Countdown to={startingNext.startsAt.toISOString()} /></div>
                <p className="mt-3 text-xs text-white/60">{listingTime(startingNext.startsAt)}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-white/70">Bidding</p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight">Nothing open right now</p>
              </>
            )}
          </section>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Hot items</h2>
              <Link href="/items" className="text-xs font-semibold text-muted-foreground hover:text-ink">View all</Link>
            </div>
            <ul className="space-y-3">
              {hot.map((h) => (
                <li key={h.id}>
                  <Link href={`/lot/${h.lot}`} className="flex items-center gap-3 rounded-3xl bg-white p-3 pr-4 transition-shadow hover:shadow-lg hover:shadow-ink/10">
                    <ItemThumb lot={h.lot} image={h.images[0]?.filename ?? null} className="size-12 shrink-0 rounded-2xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">Lot {h.lot} · {h._count.bids} bids</p>
                      <p className="truncate text-sm font-bold text-ink">{h.title}</p>
                    </div>
                    <span className="text-sm font-extrabold tabular-nums text-ink">{money(h.currentBid ?? h.startingBid)}</span>
                  </Link>
                </li>
              ))}
              {hot.length === 0 && <li className="rounded-3xl bg-white p-5 text-sm text-muted-foreground">No items yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
