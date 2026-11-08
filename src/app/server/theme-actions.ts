"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireServerAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PREVIEW_COOKIE } from "@/lib/theme/active";
import { deleteInstalledTheme, installThemeZip, listThemes, ThemeError } from "@/lib/theme/store";

// Themes are managed by the Server Admin (later: Admins too — widen requireThemeManager).
const requireThemeManager = requireServerAdmin;

export type ThemeState = { error?: string; message?: string } | undefined;

const refresh = () => revalidatePath("/", "layout");

/** "auto" (switch by each theme's dates) or a theme id to keep on all the time. */
export async function setThemeModeAction(mode: string): Promise<ThemeState> {
  await requireThemeManager();
  if (mode !== "auto" && !listThemes().some((t) => t.id === mode && t.ok)) return { error: "That theme isn't available." };
  await db.auction.upsert({ where: { id: 1 }, update: { theme: mode }, create: { id: 1, theme: mode } });
  refresh();
  return { message: "Saved" };
}

/** Try a theme in this browser only. */
export async function previewThemeAction(id: string): Promise<ThemeState> {
  await requireThemeManager();
  if (!listThemes().some((t) => t.id === id && t.ok)) return { error: "That theme isn't available." };
  (await cookies()).set(PREVIEW_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 4 });
  refresh();
  return {};
}

/** Ends a preview. Anyone can end their own preview (it only affects their browser). */
export async function stopThemePreviewAction(): Promise<void> {
  (await cookies()).delete(PREVIEW_COOKIE);
  refresh();
}

export async function installThemeAction(_: ThemeState, form: FormData): Promise<ThemeState> {
  await requireThemeManager();
  const file = form.get("theme");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a theme .zip first." };
  try {
    const id = installThemeZip(new Uint8Array(await file.arrayBuffer()));
    refresh();
    const t = listThemes().find((x) => x.id === id);
    return { message: `Installed "${t && t.ok ? t.theme.name : id}".` };
  } catch (e) {
    if (e instanceof ThemeError) return { error: e.message };
    console.error("[themes] install failed:", e);
    return { error: "Couldn't install that theme." };
  }
}

export async function deleteThemeAction(id: string): Promise<ThemeState> {
  await requireThemeManager();
  if (!deleteInstalledTheme(id)) return { error: "Only installed themes can be deleted." };
  const a = await db.auction.findUnique({ where: { id: 1 }, select: { theme: true } });
  // If it was the chosen theme and no built-in copy remains, fall back to Automatic.
  if (a?.theme === id && !listThemes().some((t) => t.id === id && t.ok)) await db.auction.update({ where: { id: 1 }, data: { theme: "auto" } });
  refresh();
  return { message: "Deleted" };
}
