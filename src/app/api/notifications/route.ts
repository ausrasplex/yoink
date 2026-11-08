import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { announceNewListings, listNotifications, notifyEndedListings, notifyEndingSoon } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** The bell's data: unread count + newest notifications for the signed-in bidder. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (user.role === "SERVER_ADMIN") return NextResponse.json({ unread: 0, items: [] }); // doesn't bid
  // Catch anything since the last background check (ended, ending soon, new), so the bell is up to date when opened.
  await Promise.all([notifyEndedListings(), notifyEndingSoon(), announceNewListings()]).catch(() => {});
  return NextResponse.json(await listNotifications(user.id), { headers: { "Cache-Control": "no-store" } });
}
