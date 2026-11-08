"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { destroyAllSessions, requireServerAdmin, sha256 } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/mail";
import { appUrlMismatch, qrBase } from "@/lib/qr";

const INVITE_DAYS = 7;

export type InviteState =
  | { error?: string; link?: string; email?: string; emailed?: boolean; mailError?: string; promoted?: string; linkWarning?: string }
  | undefined;

const schema = z.object({
  name: z.string().trim().min(1, "Enter their name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

/** Invites a new admin by link, or promotes someone who already has a user (bidder) account. */
export async function createInviteAction(_: InviteState, form: FormData): Promise<InviteState> {
  const me = await requireServerAdmin();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing?.role === "ADMIN") return { error: "That person is already an admin." };
  if (existing?.role === "SERVER_ADMIN") return { error: "That's the server admin account." };
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    await destroyAllSessions(existing.id); // they sign in again with admin access
    await db.invite.deleteMany({ where: { email } });
    revalidatePath("/server/admins");
    return { promoted: `${existing.name} already had an account, so they're now an admin. They'll need to sign in again.` };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  await db.$transaction([
    db.invite.deleteMany({ where: { email } }), // re-inviting replaces the old link
    db.invite.create({
      data: { email, name, tokenHash: sha256(token), invitedById: me.id, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) },
    }),
  ]);
  const h = await headers();
  const link = `${qrBase(h)}/invite/${token}`;
  const mismatch = appUrlMismatch(h);
  const mail = await sendInviteEmail({ to: email, name, link, days: INVITE_DAYS, invitedBy: me.name });
  revalidatePath("/server/admins");
  // Returned once so it can be shared by hand when email isn't set up; only its hash is stored.
  return {
    link, email, emailed: mail.ok, mailError: mail.ok ? undefined : mail.error,
    linkWarning: mismatch
      ? `This link uses APP_URL (${mismatch.appUrl}), but you're on ${mismatch.current}. If it doesn't open, fix APP_URL and restart, or swap the start of the link.`
      : undefined,
  };
}

export async function revokeInviteAction(id: string): Promise<void> {
  await requireServerAdmin();
  await db.invite.deleteMany({ where: { id } });
  revalidatePath("/server/admins");
}
