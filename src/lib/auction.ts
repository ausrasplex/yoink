import "server-only";
import { db } from "@/lib/db";

export async function getAuction() {
  return db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export function minNextBid(item: { startingBid: number; minIncrement: number; currentBid: number | null }) {
  return item.currentBid === null ? item.startingBid : item.currentBid + item.minIncrement;
}
