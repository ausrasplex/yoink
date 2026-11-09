import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, History, Tag } from "lucide-react";
import { ItemForm } from "@/components/admin/item-form";
import { ItemQr } from "@/components/admin/item-qr";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { getAuction } from "@/lib/auction";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultWindow } from "@/lib/listing";
import { itemCodePath } from "@/lib/item-code";
import { logoDataUri, qrBase } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function AdminItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  const item =
    id === "new"
      ? undefined
      : await db.item.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } } } });
  if (id !== "new" && !item) notFound();
  const auction = item ? await getAuction() : null;
  const logo = auction ? await logoDataUri(auction.qrLogo) : null;
  const base = qrBase(await headers());
  const defaults = defaultWindow(); // prefill for a new listing: opens now, ends in 7 days

  return (
    <AppShell user={user}>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> Manage Items
      </Link>
      <PageTitle icon={<Tag />}
        action={item && (
          <Link href={`/admin/history?lot=${item.lot}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-muted">
            <History className="size-4" /> Bid History
          </Link>
        )}
      >{item ? `Lot ${item.lot}` : "New Item"}</PageTitle>
      {/* The form fills the content width; the QR card (existing items only) takes a fixed column beside it. */}
      <div className={item ? "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]" : "grid grid-cols-1"}>
        <div className="rounded-3xl bg-white p-6">
          <ItemForm
            item={item ? { ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() } : undefined}
            defaults={{ startsAt: defaults.startsAt.toISOString(), endsAt: defaults.endsAt.toISOString() }}
          />
        </div>
        {item && auction && <ItemQr url={`${base}${itemCodePath(item.code)}`} lot={item.lot} color={auction.qrColor} logo={logo} />}
      </div>
    </AppShell>
  );
}
