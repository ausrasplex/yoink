"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getUser } from "@/lib/auth";
import { placeBid, type BidResult } from "@/lib/bids";
import { sendOutbidEmail } from "@/lib/mail";

export async function placeBidAction(lot: number, amount: number): Promise<BidResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };
  if (user.mustChangePassword) return { ok: false, error: "Please change your temporary password first." };
  if (user.role === "SERVER_ADMIN") return { ok: false, error: "The server admin account can't bid." };
  const result = await placeBid(lot, user.id, amount);
  if (!result.ok) return result;
  revalidatePath("/");
  const { outbid } = result;
  // Send after the response so the bidder isn't kept waiting on SMTP.
  if (outbid) after(() => sendOutbidEmail({ ...outbid, amount }));
  return { ok: true, amount }; // don't leak the previous leader's id to the client
}
