import "server-only";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export type BidResult =
  | { ok: true; amount: number; outbid?: { userId: string; lot: number; code: string; title: string; minBid: number; endsAt: Date } }
  | { ok: false; error: string; minBid?: number };

type Row = {
  currentBid: number | null;
  startingBid: number;
  minIncrement: number;
  highBidderId: string | null;
  endsAt: Date;
  hiddenUntilStart: boolean;
  phase: "scheduled" | "open" | "ended";
};

/**
 * Places a bid atomically. The item row is locked (SELECT ... FOR UPDATE) so two
 * people bidding at the same instant are serialised: the second sees the first's
 * new price and is rejected if it no longer beats it.
 */
export async function placeBid(lot: number, userId: string, amount: number): Promise<BidResult> {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10_000_000) {
    return { ok: false, error: "Enter a whole-dollar amount." };
  }

  return db.$transaction(async (tx) => {
    const found = await tx.item.findUnique({ where: { lot }, select: { id: true, code: true, title: true } });
    if (!found) return { ok: false, error: "Item not found." } as const;

    // The bidding window is checked on the locked row against the database clock (UTC, see CLAUDE.md), so a bid can't
    // slip in after the item ends however close to the deadline it arrives.
    const [row] = await tx.$queryRaw<Row[]>`
      SELECT "currentBid", "startingBid", "minIncrement", "highBidderId", "endsAt", "hiddenUntilStart",
        CASE WHEN (now() AT TIME ZONE 'utc') < "startsAt" THEN 'scheduled'
             WHEN (now() AT TIME ZONE 'utc') < "endsAt" THEN 'open' ELSE 'ended' END AS phase
      FROM "Item" WHERE id = ${found.id} FOR UPDATE`;

    if (row.phase === "scheduled") {
      return row.hiddenUntilStart
        ? ({ ok: false, error: "Item not found." } as const)
        : ({ ok: false, error: "Bidding on this item hasn't started yet." } as const);
    }
    if (row.phase === "ended") return { ok: false, error: "Bidding on this item has ended." } as const;

    if (row.highBidderId === userId) {
      return { ok: false, error: "You're already the highest bidder." } as const;
    }
    const minBid = row.currentBid === null ? row.startingBid : row.currentBid + row.minIncrement;
    if (amount < minBid) {
      return { ok: false, error: `Bid must be at least ${money(minBid)}.`, minBid } as const;
    }

    await tx.bid.create({ data: { itemId: found.id, userId, amount } });
    await tx.item.update({ where: { id: found.id }, data: { currentBid: amount, highBidderId: userId } });
    // Tell the caller who was just displaced so it can notify them after the transaction commits.
    const outbid = row.highBidderId
      ? { userId: row.highBidderId, lot, code: found.code, title: found.title, minBid: amount + row.minIncrement, endsAt: row.endsAt }
      : undefined;
    return { ok: true, amount, outbid } as const;
  });
}
