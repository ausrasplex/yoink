import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const csv = (v: string | number | null) => {
  let s = v === null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return `"${s.replaceAll('"', '""')}"`;
};

export async function GET() {
  await requireAdmin();
  const items = await db.item.findMany({ orderBy: { lot: "asc" }, include: { highBidder: true } });
  const rows = [
    ["Lot", "Title", "Winning bid", "Winner name", "Winner email", "Winner shift"],
    ...items.map((i) => [i.lot, i.title, i.currentBid, i.highBidder?.name ?? null, i.highBidder?.email ?? null, i.highBidder?.shift ?? null]),
  ];
  return new Response(rows.map((r) => r.map(csv).join(",")).join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="auction-results.csv"' },
  });
}
