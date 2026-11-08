"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";

export type SetupState = { error?: string; name?: string; email?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  confirm: z.string(),
});

/** Creates the server admin. Only works while there isn't one yet. */
export async function setupAction(_: SetupState, form: FormData): Promise<SetupState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  const keep = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  if (!parsed.success) return { ...keep, error: parsed.error.issues[0].message };
  const { name, email, password, confirm } = parsed.data;
  if (password !== confirm) return { ...keep, error: "Passwords don't match." };
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await db.$transaction(async (tx) => {
    // Serialise concurrent setup attempts so two people can't both become server admin.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(780215)::text`;
    if (await tx.user.count({ where: { role: "SERVER_ADMIN" } })) return "taken" as const;
    if (await tx.user.findUnique({ where: { email } })) return "exists" as const;
    return tx.user.create({ data: { name, email, passwordHash, role: "SERVER_ADMIN" } });
  });
  if (result === "taken") redirect("/login");
  if (result === "exists") return { ...keep, error: "That email already has an account." };

  await db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  await createSession(result.id);
  redirect("/server");
}
