"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireServerAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { sendTestEmail } from "@/lib/mail";
import { isThemeId } from "@/lib/themes";
import { deleteImageFile, saveLogo } from "@/lib/uploads";

// Server admin only: settings that keep the app running (branding, email), not auction content.

export type SettingsState = { error?: string; saved?: boolean; message?: string } | undefined;

async function update(data: Parameters<typeof db.auction.update>[0]["data"]) {
  await db.auction.upsert({ where: { id: 1 }, update: data, create: { id: 1 } });
  revalidatePath("/", "layout");
}

const smtpSchema = z.object({
  smtpHost: z.string().trim().max(255),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpUser: z.string().trim().max(255),
  smtpFrom: z.string().trim().max(255),
});

export async function saveSmtpAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireServerAdmin();
  const parsed = smtpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check the SMTP host, port and addresses." };
  const { smtpHost, smtpPort, smtpUser, smtpFrom } = parsed.data;
  if (smtpHost && !smtpFrom.includes("@")) return { error: "Enter a From address (e.g. Auction <auction@example.com>)." };

  const newPass = String(form.get("smtpPass") ?? "");
  let smtpPassEnc: string | null | undefined; // undefined = leave unchanged
  try {
    if (!smtpUser) smtpPassEnc = null; // no username -> no auth -> drop any stored password
    else if (newPass) smtpPassEnc = encrypt(newPass);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't encrypt the password." };
  }

  await update({
    smtpHost: smtpHost || null,
    smtpPort,
    smtpSecure: form.get("smtpSecure") === "on",
    smtpUser: smtpUser || null,
    smtpFrom: smtpFrom || null,
    ...(smtpPassEnc !== undefined ? { smtpPassEnc } : {}),
  });
  return { saved: true };
}

export async function testEmailAction(): Promise<SettingsState> {
  const admin = await requireServerAdmin();
  const res = await sendTestEmail(admin.email);
  return res.ok ? { message: `Test email sent to ${admin.email}.` } : { error: res.error };
}

const brandingSchema = z.object({ appName: z.string().trim().max(80, "Keep the name under 80 characters.") });

/** Server admin: the name and logo shown in the sidebar, sign-in screens, browser tab and emails. */
export async function saveBrandingAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireServerAdmin();
  const parsed = brandingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const current = await db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const data: { appName: string | null; appLogo?: string | null } = { appName: parsed.data.appName || null };

  const file = form.get("appLogo");
  if (file instanceof File && file.size > 0) {
    try {
      data.appLogo = await saveLogo(file);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed." };
    }
  } else if (form.get("removeAppLogo") === "on") {
    data.appLogo = null;
  }
  await update(data);
  if (data.appLogo !== undefined && current.appLogo) await deleteImageFile(current.appLogo);
  return { saved: true };
}

/** Server admin: the app theme (wording now, styling later — see src/lib/themes.ts). */
export async function saveThemeAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireServerAdmin();
  const theme = form.get("theme");
  if (!isThemeId(theme)) return { error: "Pick a theme." };
  await update({ theme });
  return { saved: true };
}

/** Server admin: remove the app logo (the bin button on the Branding logo). */
export async function removeAppLogoAction(): Promise<void> {
  await requireServerAdmin();
  const current = await db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  if (!current.appLogo) return;
  await update({ appLogo: null });
  await deleteImageFile(current.appLogo);
}
