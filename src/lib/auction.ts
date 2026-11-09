import "server-only";
import { db } from "@/lib/db";

export async function getAuction() {
  return db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/**
 * Whether this person may browse and search all listings (Items page, search, "popular"/"hot" lists, new-item notices).
 * Admins always can; Users only while the Admins' "Items page" switch is on. Off: Users open an item from its QR code
 * (or from My Bids / their dashboard once they've bid on it).
 */
export const canBrowse = (role: string, a: { itemsPageEnabled: boolean }) => role !== "USER" || a.itemsPageEnabled;

export function minNextBid(item: { startingBid: number; minIncrement: number; currentBid: number | null }) {
  return item.currentBid === null ? item.startingBid : item.currentBid + item.minIncrement;
}
