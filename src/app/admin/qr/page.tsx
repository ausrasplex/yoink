import { QrCode } from "lucide-react";
import { headers } from "next/headers";
import { QrSheet } from "@/components/admin/qr-sheet";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth";
import { QrOptions } from "@/components/admin/qr-options";
import { getAuction } from "@/lib/auction";
import { db } from "@/lib/db";
import { logoDataUri, qrBase } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const user = await requireAdmin();
  const h = await headers();
  const base = qrBase(h);
  const [items, auction] = await Promise.all([
    db.item.findMany({ orderBy: { lot: "asc" }, select: { lot: true, title: true } }),
    getAuction(),
  ]);
  const logo = await logoDataUri(auction.qrLogo);

  return (
    <AppShell user={user}>
      <div className="print:hidden">
        <PageTitle icon={<QrCode />} sub={`Codes point at ${base}. If guests can't reach that address, set APP_URL.`}>QR Codes</PageTitle>
        <div className="mb-6">
          <QrOptions
            head={{ title: "Customise codes", desc: "Codes are created automatically for every item — new items appear here straight away." }}
            color={auction.qrColor} logo={logo}
            demoUrl={items[0] ? `${base}/lot/${items[0].lot}` : `${base}/items`}
          />
        </div>
      </div>
      <QrSheet items={items} base={base} color={auction.qrColor} logo={logo} />
    </AppShell>
  );
}
