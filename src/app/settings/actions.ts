"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuction } from "@/lib/auction";
import { destroyAllSessions, destroySession, getUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lockedMinutes, recordFailure } from "@/lib/ratelimit";
import { deleteImageFile, saveAvatar } from "@/lib/uploads";

export async function revokeSessionAction(sessionId: string) {
  const user = await getUser();
  if (!user || sessionId === user.sessionId) return; // signing out this device is the normal Sign out button
  // Scoped to the caller's own sessions so one user can't end another's.
  await db.session.deleteMany({ where: { id: sessionId, userId: user.id } });
  revalidatePath("/settings");
}

export async function revokeOtherSessionsAction() {
  const user = await getUser();
  if (!user) return;
  await db.session.deleteMany({ where: { userId: user.id, NOT: { id: user.sessionId } } });
  revalidatePath("/settings");
}

/** Signs out every device, including this one. */
export async function signOutAllDevicesAction() {
  const user = await getUser();
  if (user) await destroyAllSessions(user.id);
  await destroySession(); // also clears this browser's cookie
  redirect("/login");
}

export type ProfileState = { error?: string; saved?: boolean; name?: string; email?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

/**
 * The server admin edits their own name and email (nobody else manages that account).
 * Other roles ask an admin. Changing the email — the sign-in name — needs the current password.
 */
export async function updateProfileAction(_: ProfileState, form: FormData): Promise<ProfileState> {
  const session = await requireUser("/settings");
  if (session.role !== "SERVER_ADMIN") return { error: "Ask an admin to change your name or email." };
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  const keep = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  if (!parsed.success) return { ...keep, error: parsed.error.issues[0].message };
  const { name, email } = parsed.data;
  const me = await db.user.findUniqueOrThrow({ where: { id: session.id } });

  if (email !== me.email) {
    // Same lockout as login and the password form, so a stolen session can't be used to guess the password.
    const key = `email:${me.email}`;
    const wait = await lockedMinutes([key]);
    if (wait > 0) return { ...keep, error: `Too many failed attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` };
    if (!(await bcrypt.compare(String(form.get("password") ?? ""), me.passwordHash))) {
      const a = await getAuction();
      await recordFailure(key, a.maxLoginAttempts, a.lockoutMinutes);
      return { ...keep, error: "Enter your current password to change your email." };
    }
    if (await db.user.findUnique({ where: { email } })) return { ...keep, error: "Another account already uses that email." };
    await db.loginAttempt.deleteMany({ where: { key } });
  }
  await db.user.update({ where: { id: me.id }, data: { name, email } });
  revalidatePath("/", "layout");
  return { saved: true, name, email };
}

export type AvatarState = { error?: string } | undefined;

/** Everyone (user, admin, server admin): upload or remove their own profile picture. JPEG/PNG/WebP only. */
export async function updateAvatarAction(_: AvatarState, form: FormData): Promise<AvatarState> {
  const session = await requireUser("/settings");
  const me = await db.user.findUniqueOrThrow({ where: { id: session.id }, select: { avatar: true } });
  let avatar: string | null;
  if (form.get("remove") === "1") {
    avatar = null;
  } else {
    const file = form.get("avatar");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose a picture first." };
    try {
      avatar = await saveAvatar(file);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed." };
    }
  }
  await db.user.update({ where: { id: session.id }, data: { avatar } });
  if (me.avatar) await deleteImageFile(me.avatar);
  revalidatePath("/", "layout");
  return undefined;
}

/** Users: opt in/out of the daily new-items email. */
export async function setDigestAction(on: boolean) {
  const session = await requireUser("/settings");
  if (session.role !== "USER") return;
  await db.user.update({ where: { id: session.id }, data: { emailDigest: on } });
  revalidatePath("/settings");
}
