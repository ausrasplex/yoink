"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuction } from "@/lib/auction";
import { createSession, destroyAllSessions, destroySession, getUser, hasServerAdmin, safeNext } from "@/lib/auth";
import { db } from "@/lib/db";
import { clearFailures, clientIp, loginKeys, lockedMinutes, recordFailure } from "@/lib/ratelimit";

export type FormState = { error?: string } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  shift: z.string().trim().max(60).optional(),
});

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const auction = await getAuction();
  if (!(await hasServerAdmin())) return { error: "This server hasn't been set up yet." };
  if (!auction.registrationOpen) {
    return { error: "Registration is closed. Ask an organiser to create your account." };
  }
  const required = process.env.ACCESS_CODE;
  if (required && String(form.get("accessCode") ?? "").trim() !== required) {
    return { error: "Incorrect access code." };
  }
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, shift } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "An account with that email already exists. Try signing in." };
  }
  const user = await db.user.create({
    data: { name, email, shift: shift || null, passwordHash: await bcrypt.hash(password, 12) },
  });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = "$2b$12$TRx6He.ouu3zRnvgB3eddeAhGX0MVuW4w2XPOegbi7kmgx4ZwgYTm";

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const auction = await getAuction();
  const ip = await clientIp();
  const [emailKey, ipKey] = loginKeys(email, ip);

  // Locked keys are refused outright (even with the right password) and the attempt isn't counted again.
  const wait = await lockedMinutes([emailKey, ipKey]);
  if (wait > 0) {
    return { error: `Too many failed attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` };
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    // Same counter whether or not the account exists, so lockouts don't reveal which emails are registered.
    // The per-IP limit is 5x looser so one shared network (a venue's Wi-Fi) isn't locked out by a few typos.
    await Promise.all([
      recordFailure(emailKey, auction.maxLoginAttempts, auction.lockoutMinutes),
      recordFailure(ipKey, auction.maxLoginAttempts * 5, auction.lockoutMinutes),
    ]);
    return { error: "Incorrect email or password." };
  }
  await clearFailures(emailKey);
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const session = await getUser();
  if (!session) redirect("/login?next=%2Faccount%2Fpassword");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("new") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const user = await db.user.findUniqueOrThrow({ where: { id: session.id } });
  // Same lockout as login, so this form can't be used to guess a password for a stolen session.
  const key = `email:${user.email}`;
  const wait = await lockedMinutes([key]);
  if (wait > 0) return { error: `Too many failed attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` };
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    const a = await getAuction();
    await recordFailure(key, a.maxLoginAttempts, a.lockoutMinutes);
    return { error: "Current password is incorrect." };
  }
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next.length > 200) return { error: "New password is too long." };
  if (next !== confirm) return { error: "New passwords don't match." };
  if (next === current) return { error: "Choose a password different from the current one." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false },
  });
  // Sign out everywhere else (e.g. whoever held the old password), then start a fresh session here.
  await destroyAllSessions(user.id);
  await createSession(user.id);
  redirect(form.get("from") === "settings" ? "/settings?updated=1" : "/");
}
