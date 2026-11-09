import "server-only";
import { canBrowse, getAuction } from "@/lib/auction";
import { db } from "@/lib/db";

/**
 * May this person open lot N (item page, its live status, bidding on it)?
 * Always, while Users can browse (the Admins' Items page switch is on), and always for Admins. With it off, a User
 * needs to have scanned the item's QR code (an ItemAccess row, written by /i/<code>) or bid on it already, so typing
 * /lot/<n> by hand isn't enough. Hidden-until-start rules are separate (getLotStatus).
 */
export async function canOpenLot(user: { id: string; role: string }, lot: number): Promise<boolean> {
  if (canBrowse(user.role, await getAuction())) return true;
  const item = await db.item.findUnique({
    where: { lot },
    select: {
      access: { where: { userId: user.id }, select: { userId: true }, take: 1 },
      bids: { where: { userId: user.id }, select: { id: true }, take: 1 },
    },
  });
  return !!item && (item.access.length > 0 || item.bids.length > 0);
}

/** Remember that this User scanned the item's QR code (idempotent). */
export async function grantItemAccess(userId: string, itemId: string) {
  await db.itemAccess.upsert({ where: { userId_itemId: { userId, itemId } }, update: {}, create: { userId, itemId } });
}
