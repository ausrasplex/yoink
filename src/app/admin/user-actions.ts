"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManageUser, destroyAllSessions, requireAdmin, requireManager } from "@/lib/auth";
import { tempPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { deleteImageFile } from "@/lib/uploads";

// Account actions shared by two pages: admins use them on users (/admin/users),
// the server admin uses them on admins (/server/admins). canManageUser decides who may touch whom.

export type UserState = { error?: string; saved?: boolean; message?: string; tempPassword?: string; email?: string } | undefined;

const userSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  shift: z.string().trim().max(60).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(), // only read when the server admin edits an admin
});

const listFor = (role: string) => (role === "SERVER_ADMIN" ? "/server/admins" : "/admin/users");

function refresh() {
  revalidatePath("/admin/users");
  revalidatePath("/server/admins");
}

/** Loads the target and checks the signed-in manager may act on it. */
async function managedTarget(id: string) {
  const me = await requireManager();
  const target = await db.user.findUnique({ where: { id }, include: { _count: { select: { bids: true } } } });
  if (!target || !canManageUser(me, target)) return { me, target: undefined, error: "User not found." } as const;
  return { me, target, error: undefined } as const;
}

/** Admins add users (bidders). Admins themselves are invited by the server admin. */
export async function createUserAction(_: UserState, form: FormData): Promise<UserState> {
  await requireAdmin();
  const parsed = userSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, shift } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) {
    return { error: "A user with that email already exists." };
  }
  const typed = String(form.get("password") ?? "");
  if (typed && typed.length < 8) return { error: "Password must be at least 8 characters." };
  const password = typed || tempPassword();
  await db.user.create({
    data: {
      name, email, role: "USER",
      shift: shift || null,
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true, // they choose their own at first sign-in
    },
  });
  refresh();
  // Shown to the admin once; only the hash is stored.
  return { saved: true, tempPassword: password, email };
}

export async function updateUserAction(id: string, _: UserState, form: FormData): Promise<UserState> {
  const parsed = userSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { me, target, error } = await managedTarget(id);
  if (error) return { error };

  const clash = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (clash && clash.id !== id) return { error: "Another user already has that email." };

  // Only the server admin changes roles, and only between Admin and User (removing someone's admin access).
  const role = me.role === "SERVER_ADMIN" ? (parsed.data.role ?? target.role) : target.role;
  const { name, email, shift } = parsed.data;
  await db.user.update({ where: { id }, data: { name, email, role, shift: shift || null } });
  if (target.email !== email) {
    await db.loginAttempt.deleteMany({ where: { key: `email:${target.email}` } });
  }
  if (role !== target.role) {
    await destroyAllSessions(id); // they come back in with their new access
    refresh();
    redirect(listFor(me.role)); // no longer on this list
  }
  refresh();
  return { saved: true };
}

export async function resetPasswordAction(id: string): Promise<UserState> {
  const { target, error } = await managedTarget(id);
  if (error) return { error };
  const password = tempPassword();
  await db.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true },
  });
  await destroyAllSessions(id); // anyone signed in with the old password is signed out
  await db.loginAttempt.deleteMany({ where: { key: `email:${target.email}` } });
  refresh();
  return { tempPassword: password, email: target.email };
}

export async function signOutEverywhereAction(id: string): Promise<UserState> {
  const { error } = await managedTarget(id);
  if (error) return { error };
  const { count } = await db.session.deleteMany({ where: { userId: id } });
  refresh();
  return { message: count ? `Signed out of ${count} device${count === 1 ? "" : "s"}.` : "They weren't signed in anywhere." };
}

export async function unlockUserAction(id: string): Promise<UserState> {
  const { target, error } = await managedTarget(id);
  if (error) return { error };
  await db.loginAttempt.deleteMany({ where: { key: `email:${target.email}` } });
  refresh();
  return { message: "Unlocked." };
}

export async function deleteUserAction(id: string): Promise<UserState> {
  const { me, target, error } = await managedTarget(id);
  if (error) return { error };
  if (target._count.bids > 0) {
    return { error: "This account has placed bids, so deleting it would erase bid history. Reset its password or leave the account." };
  }
  await db.user.delete({ where: { id } });
  if (target.avatar) await deleteImageFile(target.avatar);
  refresh();
  redirect(listFor(me.role));
}
