import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { grantItemAccess } from "@/lib/item-access";
import { ITEM_CODE } from "@/lib/item-code";

export const dynamic = "force-dynamic";

/**
 * Where an item's QR code points: /i/<secret code>. Signs the person in first if needed (and comes back here), notes
 * that this User has scanned the item (so they can open it even when the Items page is switched off), then shows the
 * normal item page. An unknown code is just "not found", so codes can't be probed.
 */
export default async function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toLowerCase();
  if (!ITEM_CODE.test(code)) notFound();
  const user = await requireUser(`/i/${code}`);
  const item = await db.item.findUnique({ where: { code }, select: { id: true, lot: true } });
  if (!item) notFound();
  if (user.role === "USER") await grantItemAccess(user.id, item.id);
  redirect(`/lot/${item.lot}`);
}
