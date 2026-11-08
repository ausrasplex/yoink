"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useConfirm, type ConfirmOptions } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

/**
 * Round "bin" button pinned to the bottom-right of an avatar or logo. Wrap the image in a `relative` element.
 * Asks first (themed confirm), then removes straight away.
 */
export function RemoveImageButton({ label, confirm, onRemove, className }: {
  label: string; confirm: ConfirmOptions; onRemove: () => unknown | Promise<unknown>; className?: string;
}) {
  const [ask, confirmDialog] = useConfirm();
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" aria-label={label} title={label} disabled={pending}
        onClick={async () => { if (await ask(confirm)) start(async () => { await onRemove(); }); }}
        className={cn(
          "absolute -bottom-1.5 -right-1.5 grid size-7 place-items-center rounded-full bg-white text-destructive shadow-md ring-1 ring-border transition-colors",
          "hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-destructive/40 disabled:opacity-50",
          className,
        )}>
        <Trash2 className="size-3.5" />
      </button>
      {confirmDialog}
    </>
  );
}
