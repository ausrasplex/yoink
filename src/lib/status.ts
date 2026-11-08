import "server-only";
import { db } from "@/lib/db";
import { minNextBid } from "@/lib/auction";
import { phaseOf, type Phase } from "@/lib/listing";

export type LotStatus = {
  currentBid: number | null;
  minBid: number;
  bidCount: number;
  youLead: boolean;
  youBid: boolean; // has bid on this lot before (so we can tell "outbid")
  phase: Phase;
  startsAt: string;
  endsAt: string;
};

/**
 * Live state of one listing for one person. Returns null (→ 404) for listings hidden until they start,
 * unless `seeHidden` (Admins previewing a scheduled listing).
 */
export async function getLotStatus(lot: number, userId: string, seeHidden = false): Promise<LotStatus | null> {
  if (!Number.isInteger(lot)) return null;
  const item = await db.item.findUnique({
    where: { lot },
    select: {
      id: true, startingBid: true, minIncrement: true, currentBid: true, highBidderId: true,
      startsAt: true, endsAt: true, hiddenUntilStart: true,
      _count: { select: { bids: true } },
    },
  });
  if (!item) return null;
  const phase = phaseOf(item);
  if (phase === "scheduled" && item.hiddenUntilStart && !seeHidden) return null;
  const youBid = (await db.bid.count({ where: { itemId: item.id, userId } })) > 0;
  return {
    currentBid: item.currentBid,
    minBid: minNextBid(item),
    bidCount: item._count.bids,
    youLead: item.highBidderId === userId,
    youBid,
    phase,
    startsAt: item.startsAt.toISOString(),
    endsAt: item.endsAt.toISOString(),
  };
}
