import "server-only";
import { db } from "@/lib/db";
import { getAuction } from "@/lib/auction";
import { brandName } from "@/lib/format";
import { phaseOf, type Phase } from "@/lib/listing";

export type BidRow = {
  lot: number; title: string; image: string | null;
  myBid: number; current: number; leading: boolean; bidCount: number;
  phase: Phase; startsAt: string; endsAt: string;
  claimedAt: string | null; // the winner marked it as collected
  archived: boolean; // claimed (won) or archived (didn't win): shown in the Archived tab
};

/** Every item the user has bid on, with their best bid and whether they currently lead. */
export async function getMyBids(userId: string): Promise<BidRow[]> {
  const items = await db.item.findMany({
    where: { bids: { some: { userId } } },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      bids: { where: { userId }, orderBy: { amount: "desc" }, take: 1 },
      _count: { select: { bids: true } },
      bidArchives: { where: { userId }, select: { itemId: true } },
    },
  });
  return items
    .map((i) => ({
      lot: i.lot, title: i.title, image: i.images[0]?.filename ?? null,
      myBid: i.bids[0].amount, current: i.currentBid ?? i.startingBid,
      leading: i.highBidderId === userId, bidCount: i._count.bids,
      phase: phaseOf(i), startsAt: i.startsAt.toISOString(), endsAt: i.endsAt.toISOString(),
      claimedAt: i.highBidderId === userId && i.claimedAt ? i.claimedAt.toISOString() : null,
      archived: (i.highBidderId === userId && !!i.claimedAt) || i.bidArchives.length > 0,
    }))
    // open listings first (outbid before winning: needs attention), then by lot; ended listings last
    .sort((a, b) => Number(a.phase === "ended") - Number(b.phase === "ended") || Number(a.leading) - Number(b.leading) || a.lot - b.lot);
}

/** Auction-wide bids per hour for the last 24 hours, oldest first. */
export async function getBidActivity(): Promise<number[]> {
  const since = new Date(Date.now() - 24 * 3600_000);
  const bids = await db.bid.findMany({ where: { createdAt: { gt: since } }, select: { createdAt: true } });
  const buckets = Array<number>(24).fill(0);
  for (const b of bids) {
    const idx = 23 - Math.min(23, Math.floor((Date.now() - b.createdAt.getTime()) / 3600_000));
    buckets[idx]++;
  }
  return buckets;
}

export async function getShellInfo(userId: string) {
  const [auction, outbid] = await Promise.all([
    getAuction(),
    // only listings still open: nothing can be done about an ended one
    db.item.count({ where: { bids: { some: { userId } }, NOT: { highBidderId: userId }, endsAt: { gt: new Date() } } }),
  ]);
  return { name: brandName(auction), logo: auction.appLogo, outbid };
}
