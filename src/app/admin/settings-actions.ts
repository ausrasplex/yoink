"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteImageFile, saveLogo } from "@/lib/uploads";

export type SettingsState = { error?: string; saved?: boolean; message?: string } | undefined;

async function update(data: Parameters<typeof db.auction.update>[0]["data"]) {
  await db.auction.upsert({ where: { id: 1 }, update: data, create: { id: 1 } });
  revalidatePath("/", "layout");
}

const accessSchema = z.object({
  maxLoginAttempts: z.coerce.number().int().min(1, "Allow at least 1 attempt").max(50),
  lockoutMinutes: z.coerce.number().int().min(1, "Lockout must be at least 1 minute").max(1440),
});

export async function saveAccessAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = accessSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await update({ ...parsed.data, registrationOpen: form.get("registrationOpen") === "on" });
  return { saved: true };
}

/**
 * Admin: which emails the app sends. They go out through the Server Admin's SMTP connection; this only decides
 * whether they're sent. emailEnabled is the master switch (off = nothing is sent, whatever the others say).
 */
export async function saveNotificationsAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  await update({
    emailEnabled: form.get("emailEnabled") === "on",
    notifyOutbid: form.get("notifyOutbid") === "on",
    emailPasswordReset: form.get("emailPasswordReset") === "on",
    emailNewItems: form.get("emailNewItems") === "on",
    digestHour: Math.min(23, Math.max(0, Number.parseInt(String(form.get("digestHour") ?? "9"), 10) || 0)),
  });
  return { saved: true };
}

export async function saveTermsAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const terms = String(form.get("terms") ?? "").trim();
  if (terms.length > 10_000) return { error: "Terms must be under 10,000 characters." };
  await update({ terms });
  return { saved: true };
}

const qrSchema = z.object({ qrColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour.") });

export async function saveQrAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = qrSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const current = await db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const data: { qrColor: string; qrLogo?: string | null } = { qrColor: parsed.data.qrColor.toLowerCase() };

  const file = form.get("logo");
  if (file instanceof File && file.size > 0) {
    try {
      data.qrLogo = await saveLogo(file);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed." };
    }
  } else if (form.get("removeLogo") === "on") {
    data.qrLogo = null;
  }
  await update(data);
  if (data.qrLogo !== undefined && current.qrLogo) await deleteImageFile(current.qrLogo);
  return { saved: true };
}

/** Admin: remove the QR centre logo (the bin button on the logo). */
export async function removeQrLogoAction(): Promise<void> {
  await requireAdmin();
  const current = await db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!current.qrLogo) return;
  await update({ qrLogo: null });
  await deleteImageFile(current.qrLogo);
}
