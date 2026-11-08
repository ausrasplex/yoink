import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BidPanel } from "@/components/bid-panel";
import { AppShell } from "@/components/shell/app-shell";
import { tintFor } from "@/components/item-card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { getAuction } from "@/lib/auction";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLotStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function LotPage({ params }: { params: Promise<{ lot: string }> }) {
  const lotNo = Number((await params).lot);
  const user = await requireUser(`/lot/${lotNo}`); // scanning the QR while logged out returns here after login
  if (!Number.isInteger(lotNo)) notFound();

  const item = await db.item.findUnique({
    where: { lot: lotNo },
    include: { images: { orderBy: { position: "asc" } } },
  });
  const status = item && (await getLotStatus(lotNo, user.id, user.role === "ADMIN"));
  if (!item || !status) notFound();
  const { terms } = await getAuction();

  return (
    <AppShell user={user}>
      <Link href="/items" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> All items
      </Link>
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
