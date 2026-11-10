import "server-only";
import { db } from "@/lib/db";
import { getAuction } from "@/lib/auction";
import { visibleToUsers } from "@/lib/listing";
import { emailStatusOf, sendNewItemsDigest } from "@/lib/mail";

/**
 * Daily "new items" digest (Admin switch: Auction setup → Emails). Checked every few minutes by the scheduler in
 * src/instrumentation.ts; sends once per day, at or after the Admins' chosen hour in the venue's time zone.
 *
 * "New" = listings Users can see now, still open or upcoming, that appeared since the previous digest:
 * visible listings created since then, plus hidden-until-start listings that have opened since then.
 */
const TZ = () => process.env.TZ || "Australia/Melbourne";
const localDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ(), year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const localHour = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ(), hour: "2-digit", hourCycle: "h23" }).format(d));

export async function runDigestIfDue(now = new Date()): Promise<{ sent: number; items: number } | null> {
  const a = await getAuction();
  if (emailStatusOf(a, "newItems") !== "ready") return null;
  if (localHour(now) < a.digestHour) return null;
  if (a.lastDigestAt && localDay(a.lastDigestAt) === localDay(now)) return null; // already done today

  // Claim today's run atomically: only the process whose update matches the value it read goes ahead,
  // so a restart, a second instance or dev hot-reload can't send it twice.
  const prev = a.lastDigestAt;
  const claimed = await db.auction.updateMany({ where: { id: 1, lastDigestAt: prev }, data: { lastDigestAt: now } });
  if (claimed.count !== 1) return null;

  // Items page switched off: Users only find items by QR code, so no list of new ones (today counts as done).
  if (!a.itemsPageEnabled) return { sent: 0, items: 0 };

  const since = prev ?? new Date(now.getTime() - 86_400_000);
  const items = await db.item.findMany({
    where: {
      AND: [
        visibleToUsers(now),
        { endsAt: { gt: now } },
        { OR: [{ hiddenUntilStart: false, createdAt: { gt: since } }, { hiddenUntilStart: true, startsAt: { gt: since, lte: now } }] },
      ],
    },
    orderBy: { lot: "asc" },
    select: { lot: true, code: true, title: true, startingBid: true, currentBid: true, startsAt: true, endsAt: true },
  });
  if (!items.length) return { sent: 0, items: 0 };
  const sent = await sendNewItemsDigest(items.map((i) => ({
    lot: i.lot, code: i.code, title: i.title, price: i.currentBid ?? i.startingBid, noBids: i.currentBid === null, startsAt: i.startsAt, endsAt: i.endsAt,
  })));
  console.log(`[digest] ${items.length} new item(s), sent to ${sent} user(s)`);
  return { sent, items: items.length };
}
