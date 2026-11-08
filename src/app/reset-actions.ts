"use server";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createSession, destroyAllSessions, sha256 } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailStatus, sendPasswordResetEmail } from "@/lib/mail";
import { clientIp, lockedMinutes, recordFailure } from "@/lib/ratelimit";

export type ResetState = { error?: string; sent?: boolean } | undefined;

const RESET_MINUTES = 60;
const REQUESTS_PER_WINDOW = 3; // per email and (x5) per IP, per 15 minutes

export async function requestResetAction(_: ResetState, form: FormData): Promise<ResetState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!email) return { error: "Enter your email address." };
  if ((await emailStatus("passwordReset")) !== "ready") {
    return { error: "Email isn't set up on this server. Ask an organiser to reset your password." };
  }

  // Everything below gives the same visible result whether or not the account exists (and whether or not
  // we're rate limited), so this form can't be used to discover who has an account or to spam inboxes.
  const ip = await clientIp();
  const keys = [`reset:email:${email}`, `reset:ip:${ip}`];
  const limited = (await lockedMinutes(keys)) > 0;
  if (!limited) {
    await Promise.all([
      recordFailure(keys[0], REQUESTS_PER_WINDOW, 15),
      recordFailure(keys[1], REQUESTS_PER_WINDOW * 5, 15),
    ]);
    // Do the lookup and sending after the response so timing doesn't reveal whether the account exists.
    after(async () => {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return;
      const token = crypto.randomBytes(32).toString("base64url");
      await db.$transaction([
        db.passwordReset.deleteMany({ where: { userId: user.id } }), // newest link wins
        db.passwordReset.create({
          data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) },
        }),
      ]);
      await sendPasswordResetEmail({ to: user.email, name: user.name, token, minutes: RESET_MINUTES });
    });
  }
  return { sent: true };
}

export async function resetPasswordAction(token: string, _: ResetState, form: FormData): Promise<ResetState> {
  const next = String(form.get("new") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 8) return { error: "Password must be at least 8 characters." };
  if (next.length > 200) return { error: "Password is too long." };
  if (next !== confirm) return { error: "Passwords don't match." };

  const reset = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!reset || reset.expiresAt < new Date()) {
    return { error: "This link has expired or was already used. Request a new one." };
  }
  // Single use: only proceed if we are the request that actually consumed the row.
  const consumed = await db.passwordReset.deleteMany({ where: { id: reset.id } });
  if (consumed.count !== 1) return { error: "This link has expired or was already used. Request a new one." };

  await db.user.update({
    where: { id: reset.userId },
    data: { passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false },
  });
  await db.passwordReset.deleteMany({ where: { userId: reset.userId } });
  await destroyAllSessions(reset.userId); // revoke anything opened with the old password
  await db.loginAttempt.deleteMany({ where: { key: `email:${reset.user.email}` } });
  await createSession(reset.userId);
  redirect("/");
}
