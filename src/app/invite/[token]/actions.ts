"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, sha256 } from "@/lib/auth";
import { db } from "@/lib/db";

export type AcceptState = { error?: string; name?: string } | undefined;

export async function acceptInviteAction(token: string, _: AcceptState, form: FormData): Promise<AcceptState> {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!name) return { error: "Enter your name." };
  if (password.length < 8) return { name, error: "Password must be at least 8 characters." };
  if (password.length > 200) return { name, error: "Password is too long." };
  if (password !== confirm) return { name, error: "Passwords don't match." };

  const invite = await db.invite.findUnique({ where: { tokenHash: sha256(token) } });
  if (!invite || invite.expiresAt < new Date()) return { error: "This invite has expired or was already used. Ask for a new one." };
  if (await db.user.findUnique({ where: { email: invite.email } })) {
    return { error: "An account with this email already exists. Sign in instead, or ask the server admin to make it an admin." };
  }
  // Single use: only continue if this request is the one that consumed the invite.
  const consumed = await db.invite.deleteMany({ where: { id: invite.id } });
  if (consumed.count !== 1) return { error: "This invite has expired or was already used. Ask for a new one." };

  const user = await db.user.create({
    data: { name, email: invite.email, role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });
  await createSession(user.id);
  redirect("/admin");
}
