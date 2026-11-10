import "server-only";
import { db } from "@/lib/db";
import { visibleToUsers } from "@/lib/listing";

/**
 * Bell notifications for bidders. Each is a type + details; the wording comes from the active theme when shown
 * (the notify* keys in src/lib/theme/copy.ts), so switching theme re-words old ones too.
 *   outbid — someone outbid you (created when the bid is placed)
 *   won / lost — a listing you bid on ended (created once per listing by notifyEndedListings)
 *   endingSoon — a listing you bid on ends within the hour (once per listing, notifyEndingSoon)
 *   newItems   — new listings Users can see (once per listing, announceNewListings): one item links to it,
 *                several at once roll up into "3 new items" linking to the Items page
 */

export type NotificationType = "outbid" | "won" | "lost" | "endingSoon" | "newItems";
export type NotificationRow = {
  id: string; type: NotificationType; lot: number | null;
  code: string | null; // the item's address (/i/<code>), looked up from lot; null if none or the item is gone
  title: string; amount: number | null; count: number | null;
  createdAt: string; read: boolean;
};

const ENDING_SOON_MS = 60 * 60_000;

const KEEP_PER_USER = 50;
const KEEP_DAYS = 60;

export async function notifyOutbid(p: { userId: string; lot: number; title: string; amount: number }) {
  await db.notification.create({ data: { userId: p.userId, type: "outbid", lot: p.lot, title: p.title, amount: p.amount } });
}

/**
 * Won / Didn't win for every listing that has ended and hasn't been handled yet. Each listing is claimed first
 * (endNotifiedAt set only if still empty), so restarts, a second instance or overlapping checks can't double up.
 * Cheap when there's nothing to do; called by the background check and when someone opens the bell.
 */
export async function notifyEndedListings(now = new Date()): Promise<number> {
  const ended = await db.item.findMany({
    where: { endsAt: { lte: now }, endNotifiedAt: null },
    select: { id: true, lot: true, title: true, currentBid: true, highBidderId: true },
    take: 100,
  });
  let created = 0;
  for (const item of ended) {
    const claimed = await db.item.updateMany({ where: { id: item.id, endNotifiedAt: null }, data: { endNotifiedAt: now } });
    if (claimed.count !== 1) continue;
    const bidders = await db.bid.findMany({ where: { itemId: item.id }, distinct: ["userId"], select: { userId: true } });
    if (!bidders.length) continue;
    const res = await db.notification.createMany({
      data: bidders.map((b) => ({
        userId: b.userId, type: b.userId === item.highBidderId ? "won" : "lost",
        lot: item.lot, title: item.title, amount: item.currentBid,
      })),
    });
    created += res.count;
  }
  return created;
}

/** "Ends within the hour" for everyone who's bid on a listing, once per listing. */
export async function notifyEndingSoon(now = new Date()): Promise<number> {
  const soon = await db.item.findMany({
    where: { endsAt: { gt: now, lte: new Date(now.getTime() + ENDING_SOON_MS) }, endingSoonNotifiedAt: null, bids: { some: {} } },
    select: { id: true, lot: true, title: true, currentBid: true },
    take: 100,
  });
  let created = 0;
  for (const item of soon) {
    const claimed = await db.item.updateMany({ where: { id: item.id, endingSoonNotifiedAt: null }, data: { endingSoonNotifiedAt: now } });
    if (claimed.count !== 1) continue;
    const bidders = await db.bid.findMany({ where: { itemId: item.id }, distinct: ["userId"], select: { userId: true } });
    const res = await db.notification.createMany({
      data: bidders.map((b) => ({ userId: b.userId, type: "endingSoon", lot: item.lot, title: item.title, amount: item.currentBid })),
    });
    created += res.count;
  }
  return created;
}

/**
 * "New items" for Users: listings that have become visible to them (created visible, or hidden-until-start ones that
 * have started) and haven't been announced. Everything found in one check becomes one notification per User.
 */
export async function announceNewListings(now = new Date()): Promise<number> {
  const fresh = await db.item.findMany({
    where: { announcedAt: null, endsAt: { gt: now }, ...visibleToUsers(now) },
    select: { id: true, lot: true, title: true }, orderBy: { lot: "asc" }, take: 200,
  });
  if (!fresh.length) return 0;
  const claimed = await db.item.updateMany({ where: { id: { in: fresh.map((i) => i.id) }, announcedAt: null }, data: { announcedAt: now } });
  if (claimed.count === 0) return 0; // another check got there first
  const items = claimed.count === fresh.length ? fresh
    : await db.item.findMany({ where: { id: { in: fresh.map((i) => i.id) }, announcedAt: now }, select: { id: true, lot: true, title: true } });
  if (!items.length) return 0;
  // Items page switched off: Users only find items by QR code, so don't point them at new ones. The listings stay
  // claimed (announcedAt), so switching it back on doesn't send a burst of old announcements.
  if (!(await db.auction.findUnique({ where: { id: 1 }, select: { itemsPageEnabled: true } }))?.itemsPageEnabled) return 0;
  const users = await db.user.findMany({ where: { role: "USER" }, select: { id: true } });
  const one = items.length === 1 ? items[0] : null;
  const res = await db.notification.createMany({
    data: users.map((u) => ({
      userId: u.id, type: "newItems",
      lot: one?.lot ?? null, title: one?.title ?? items.map((i) => i.title).slice(0, 3).join(", "), count: items.length,
    })),
  });
  return res.count;
}

export async function listNotifications(userId: string, limit = 20): Promise<{ unread: number; items: NotificationRow[] }> {
  const [unread, rows] = await Promise.all([
    db.notification.count({ where: { userId, readAt: null } }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit }),
  ]);
  const lots = [...new Set(rows.map((n) => n.lot).filter((l): l is number => l !== null))];
  const codes = new Map(lots.length
    ? (await db.item.findMany({ where: { lot: { in: lots } }, select: { lot: true, code: true } })).map((i) => [i.lot, i.code] as const)
    : []);
  return {
    unread,
    items: rows.map((n) => ({
      id: n.id, type: n.type as NotificationType, lot: n.lot, code: n.lot === null ? null : codes.get(n.lot) ?? null, title: n.title, amount: n.amount, count: n.count,
      createdAt: n.createdAt.toISOString(), read: !!n.readAt,
    })),
  };
}

export async function markRead(userId: string, id?: string) {
  await db.notification.updateMany({ where: { userId, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
}

/** Housekeeping: drop notifications older than 60 days, and beyond the newest 50 per person. */
export async function pruneNotifications() {
  await db.notification.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) } } });
  await db.$executeRaw`
    DELETE FROM "Notification" n USING (
      SELECT id FROM (
        SELECT id, row_number() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) AS rn FROM "Notification"
      ) ranked WHERE rn > ${KEEP_PER_USER}
    ) old WHERE n.id = old.id`;
}
