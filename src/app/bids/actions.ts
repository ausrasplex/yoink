"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Bidders: mark an item they've won as claimed (collected) — it moves to the Archived tab on My Bids — or undo that.
 * Only the winner of an ended listing can do this.
 */
export async function setClaimedAction(lot: number, claimed: boolean): Promise<{ error?: string }> {
  const user = await requireUser("/bids");
  const { count } = await db.item.updateMany({
    where: { lot, highBidderId: user.id, endsAt: { lte: new Date() } },
    data: { claimedAt: claimed ? new Date() : null },
  });
  if (count !== 1) return { error: "Only the winner of an ended item can mark it as claimed." };
  revalidatePath("/bids");
  revalidatePath("/");
  return {};
}

/**
 * Bidders: archive an ended item they bid on but didn't win (moves it to the Archived tab on My Bids), or undo that.
 */
export async function setArchivedAction(lot: number, archived: boolean): Promise<{ error?: string }> {
  const user = await requireUser("/bids");
  const item = await db.item.findFirst({
    where: { lot, endsAt: { lte: new Date() }, NOT: { highBidderId: user.id }, bids: { some: { userId: user.id } } },
    select: { id: true },
  });
  if (!item) return { error: "Only ended items you bid on but didn't win can be archived." };
  const key = { userId_itemId: { userId: user.id, itemId: item.id } };
  if (archived) await db.bidArchive.upsert({ where: key, update: {}, create: { userId: user.id, itemId: item.id } });
  else await db.bidArchive.deleteMany({ where: { userId: user.id, itemId: item.id } });
  revalidatePath("/bids");
  revalidatePath("/");
  return {};
}
