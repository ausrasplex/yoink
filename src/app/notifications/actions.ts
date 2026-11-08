"use server";

import { getUser } from "@/lib/auth";
import { markRead } from "@/lib/notifications";

/** Marks one of the signed-in person's notifications as read (or all of them, without an id). */
export async function markNotificationsReadAction(id?: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await markRead(user.id, typeof id === "string" ? id : undefined);
}
