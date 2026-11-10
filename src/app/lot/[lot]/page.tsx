import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canOpenLot } from "@/lib/item-access";
import { itemCodePath } from "@/lib/item-code";

export const dynamic = "force-dynamic";

/**
 * Old item address (QR codes printed before items had codes, bookmarks, notifications that store a lot number):
 * redirects to the item's own address, /i/<code>. With the Items page switched off, a User only gets there for an item
 * they've scanned or bid on; anything else is "not found", so typing lot numbers by hand doesn't open items.
 */
export default async function LotRedirect({ params }: { params: Promise<{ lot: string }> }) {
  const lot = Number((await params).lot);
  const user = await requireUser(`/lot/${(await params).lot}`);
  if (!Number.isInteger(lot) || !(await canOpenLot(user, lot))) notFound();
  const item = await db.item.findUnique({ where: { lot }, select: { code: true } });
  if (!item) notFound();
  redirect(itemCodePath(item.code));
}
