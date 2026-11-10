import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BidPanel } from "@/components/bid-panel";
import { AppShell } from "@/components/shell/app-shell";
import { tintFor } from "@/components/item-card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { canBrowse, getAuction } from "@/lib/auction";
import { requireUser } from "@/lib/auth";
import { grantItemAccess } from "@/lib/item-access";
import { ITEM_CODE } from "@/lib/item-code";
import { db } from "@/lib/db";
import { getLotStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

/**
 * The item page, at its one address: /i/<secret code> (what the QR code prints, and every link in the app). The code
 * is random, so addresses don't reveal lot numbers or how many items there are. Opening it signs the person in first
 * if needed (and comes back here), and records that this User has it (ItemAccess): with the Items page switched off,
 * Users can open only items they've scanned or bid on. Old /lot/<n> addresses redirect here (see app/lot/[lot]).
 */
export default async function ItemPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toLowerCase();
  if (!ITEM_CODE.test(code)) notFound();
  const user = await requireUser(`/i/${code}`);
  const item = await db.item.findUnique({
    where: { code },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!item) notFound(); // unknown codes are just "not found", so they can't be probed
  const status = await getLotStatus(item.lot, user.id, user.role === "ADMIN"); // hidden-until-start rules
  if (!status) notFound();
  if (user.role === "USER") await grantItemAccess(user.id, item.id);
  const auction = await getAuction();
  const { terms } = auction;

  return (
    <AppShell user={user}>
      {/* No way back to the full list when Users can't browse it (they got here from a QR code) */}
      {canBrowse(user.role, auction) && (
        <Link href="/items" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink">
          <ArrowLeft className="size-4" /> All items
        </Link>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div>
          {item.images.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent>
                {item.images.map((img) => (
                  <CarouselItem key={img.id}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-white">
                      <Image src={`/uploads/${img.filename}`} alt={item.title} fill unoptimized className="object-cover" priority />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {item.images.length > 1 && (
                <>
                  <CarouselPrevious className="left-3 border-0 bg-white/90" />
                  <CarouselNext className="right-3 border-0 bg-white/90" />
                </>
              )}
            </Carousel>
          ) : (
            <div className={`${tintFor(item.lot)} grid aspect-[4/3] place-items-center rounded-3xl text-6xl font-extrabold text-ink/30`}>#{item.lot}</div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink">Lot {item.lot}</span>
              {item.hiddenUntilStart && status.phase === "scheduled" && (
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Hidden from users until it starts</span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-ink">{item.title}</h1>
          </div>
          <BidPanel lot={item.lot} title={item.title} first={user.name.split(" ")[0]} initial={status} startingBid={item.startingBid} increment={item.minIncrement} />
          {item.description && (
            <section className="rounded-3xl bg-white p-5">
              <h2 className="mb-2 text-sm font-extrabold text-ink">About this item</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </section>
          )}
          {terms && (
            <section className="rounded-3xl bg-peach/60 p-5">
              <h2 className="mb-2 text-sm font-extrabold text-ink">Terms &amp; conditions</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/75">{terms}</p>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
