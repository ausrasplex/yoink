"use client";

import { useConfirm } from "@/components/confirm-dialog";
import { Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeField } from "@/components/admin/date-time-field";
import { deleteImageAction, deleteItemAction, saveItemAction } from "@/app/admin/actions";

type Item = {
  id: string; title: string; description: string; startingBid: number; minIncrement: number;
  currentBid: number | null; images: { id: string; filename: string }[];
  startsAt: string; endsAt: string; hiddenUntilStart: boolean;
};

const VISIBILITY = [
  { value: "visible", label: "Visible, starts in…", hint: "Users can see it before it opens, with a countdown to the start." },
  { value: "hidden", label: "Hidden until it starts", hint: "Users can't see it (lists, search or its QR code) until it opens." },
] as const;

/** `defaults`: the bidding window to prefill for a new listing (now → +7 days, worked out on the server). */
export function ItemForm({ item, defaults }: { item?: Item; defaults: { startsAt: string; endsAt: string } }) {
  const [state, action, pending] = useActionState(saveItemAction.bind(null, item?.id ?? null), undefined);
  const [ask, confirmDialog] = useConfirm();

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={item?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={5} defaultValue={item?.description} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startingBid">Starting bid ($)</Label>
            <Input id="startingBid" name="startingBid" type="number" min={0} defaultValue={item?.startingBid ?? 10} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minIncrement">Minimum increment ($)</Label>
            <Input id="minIncrement" name="minIncrement" type="number" min={1} defaultValue={item?.minIncrement ?? 5} required />
          </div>
        </div>
        <fieldset className="space-y-4 rounded-2xl border border-border p-4">
          <legend className="px-1 text-sm font-bold text-ink">Listing</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField name="startsAt" label="Starts" defaultValue={item?.startsAt ?? defaults.startsAt} />
            <DateTimeField name="endsAt" label="Ends" defaultValue={item?.endsAt ?? defaults.endsAt} />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">In your local time. Bids are accepted from the start time until the end time.</p>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Before it starts">
            {VISIBILITY.map((v) => (
              <label key={v.value}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3 has-[:checked]:border-ink has-[:checked]:bg-lilac/30">
                <input type="radio" name="hiddenUntilStart" value={v.value} required className="mt-1 size-4 accent-ink"
                  defaultChecked={(item?.hiddenUntilStart ? "hidden" : "visible") === v.value} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{v.label}</span>
                  <span className="block text-xs text-muted-foreground">{v.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="images">Add photos</Label>
          <FileInput id="images" name="images" accept="image/jpeg,image/png,image/webp" multiple />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}><Save /> {pending ? "Saving…" : item ? "Save changes" : "Create item"}</Button>
          {state?.saved && <span className="text-sm text-green-700">Saved</span>}
          {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
        </div>
      </form>

      {item && item.images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {item.images.map((img) => (
            <div key={img.id} className="space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <Image src={`/uploads/${img.filename}`} alt="" fill unoptimized className="object-cover" />
              </div>
              <Button variant="outline" size="sm" className="w-full"
                onClick={async () => { if (await ask({ title: "Remove this photo?", description: "It's deleted from the server straight away.", confirmLabel: "Remove photo" })) deleteImageAction(img.id); }}>
                <Trash2 /> Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {item && (
        <Button
          variant="destructive"
          onClick={async () => {
            const ok = await ask({
              title: `Delete ${item.title}?`,
              description: item.currentBid !== null
                ? "This item has bids. Deleting it removes the item, all of its bids and its photos. This can't be undone."
                : "The item and its photos are deleted. This can't be undone.",
              confirmLabel: "Delete item",
            });
            if (ok) deleteItemAction(item.id);
          }}
        >
          <Trash2 /> Delete item
        </Button>
      )}
      {confirmDialog}
    </div>
  );
}
