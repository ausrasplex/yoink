"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getUser } from "@/lib/auth";
import { placeBid, type BidResult } from "@/lib/bids";
import { sendOutbidEmail } from "@/lib/mail";
import { notifyOutbid } from "@/lib/notifications";

export async function placeBidAction(lot: number, amount: number): Promise<BidResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };
  if (user.mustChangePassword) return { ok: false, error: "Please change your temporary password first." };
  if (user.role === "SERVER_ADMIN") return { ok: false, error: "The server admin account can't bid." };
  const result = await placeBid(lot, user.id, amount);
  if (!result.ok) return result;
  revalidatePath("/");
  const { outbid } = result;
  // After the response, so the bidder isn't kept waiting: tell the person who was just outbid (bell + email).
  if (outbid) {
    after(async () => {
      await notifyOutbid({ userId: outbid.userId, lot: outbid.lot, title: outbid.title, amount })
        .catch((e) => console.error("[notify] outbid failed:", e instanceof Error ? e.message : e));
      await sendOutbidEmail({ ...outbid, amount });
    });
  }
  return { ok: true, amount }; // don't leak the previous leader's id to the client
}
