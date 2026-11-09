import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { canOpenLot } from "@/lib/item-access";
import { getLotStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ lot: string }> }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const lot = Number((await params).lot);
  if (!Number.isInteger(lot) || !(await canOpenLot(user, lot))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const status = await getLotStatus(lot, user.id, user.role === "ADMIN");
  if (!status) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
