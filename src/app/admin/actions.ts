"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteImageFile, saveImage } from "@/lib/uploads";

export type AdminState = { error?: string; saved?: boolean } | undefined;

const instant = (label: string) =>
  z.string({ error: `Set the ${label} time.` }).min(1, `Set the ${label} time.`)
    .transform((v) => new Date(v)).refine((d) => !Number.isNaN(d.getTime()), `The ${label} time isn't valid.`);

// Each item is its own listing: the form sends the bidding window as ISO instants (converted from the admin's local time).
const itemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(5000).default(""),
  startingBid: z.coerce.number().int().min(0, "Starting bid must be 0 or more").max(1_000_000),
  minIncrement: z.coerce.number().int().min(1, "Increment must be at least 1").max(100_000),
  startsAt: instant("start"),
  endsAt: instant("end"),
  hiddenUntilStart: z.enum(["visible", "hidden"]).transform((v) => v === "hidden"),
}).refine((d) => d.endsAt > d.startsAt, { message: "The end time must be after the start time." });

export async function saveItemAction(id: string | null, _: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = itemSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const names: string[] = [];
  try {
    for (const f of files) names.push(await saveImage(f));
  } catch (e) {
    await Promise.all(names.map(deleteImageFile));
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  let itemId = id;
  if (id) {
    const updated = await db.item.updateMany({ where: { id }, data: parsed.data });
    if (updated.count === 0) return { error: "Item not found." };
  } else {
    itemId = (await db.item.create({ data: parsed.data })).id;
  }

  if (names.length) {
    const count = await db.itemImage.count({ where: { itemId: itemId! } });
    await db.itemImage.createMany({
      data: names.map((filename, i) => ({ itemId: itemId!, filename, position: count + i })),
    });
  }
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/items/${itemId}`);
  return { saved: true };
}

export async function deleteImageAction(imageId: string) {
  await requireAdmin();
  const img = await db.itemImage.delete({ where: { id: imageId } }).catch(() => null);
  if (img) await deleteImageFile(img.filename);
  revalidatePath("/", "layout");
}

export async function deleteItemAction(id: string) {
  await requireAdmin();
  const images = await db.itemImage.findMany({ where: { itemId: id } });
  await db.item.delete({ where: { id } }).catch(() => null);
  await Promise.all(images.map((i) => deleteImageFile(i.filename)));
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function saveSettingsAction(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim().slice(0, 80) || "Silent Auction";
  await db.auction.upsert({ where: { id: 1 }, update: { name }, create: { id: 1, name } });
  revalidatePath("/", "layout");
  return { saved: true };
}

/** Admin: delete archived (ended) listings in bulk. Anything not ended yet is left alone. */
export async function deleteArchivedItemsAction(ids: string[]): Promise<AdminState> {
  await requireAdmin();
  const list = ids.filter((id) => typeof id === "string").slice(0, 500);
  if (!list.length) return { error: "Select at least one item." };
  const now = new Date();
  const items = await db.item.findMany({ where: { id: { in: list }, endsAt: { lte: now } }, select: { id: true, images: { select: { filename: true } } } });
  await db.item.deleteMany({ where: { id: { in: items.map((i) => i.id) }, endsAt: { lte: now } } }); // bids and image rows cascade
  await Promise.all(items.flatMap((i) => i.images.map((img) => deleteImageFile(img.filename))));
  revalidatePath("/", "layout");
  return items.length < list.length ? { error: "Some items hadn't ended, so they weren't deleted." } : { saved: true };
}
