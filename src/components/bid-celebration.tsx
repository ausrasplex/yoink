"use client";

import { Crown } from "lucide-react";
import { useCopy } from "@/components/theme/theme-provider";
import type { CopyVars } from "@/lib/theme/copy";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type Celebration = { amount: string; lot: number; title: string; first: string };

/**
 * Shown after a bid that makes you the highest bidder. All its wording comes from the active theme
 * (bidDialogTitle, bidPlaced, bidDialogBody, bidDialogButton — see themes/THEMES.md).
 */
export function BidCelebration({ open, data, onClose }: { open: boolean; data: Celebration | null; onClose: () => void }) {
  const t = useCopy();
  // `data` stays set after closing, so the text doesn't blank out during the close animation.
  const vars: CopyVars = data ? { amount: data.amount, lot: data.lot, title: data.title, first: data.first } : {};
  return (
    <Dialog open={open && !!data} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent showCloseButton={false} className="rounded-2xl p-6 text-center sm:max-w-sm">
        <DialogHeader className="items-center gap-3 sm:text-center">
          <span className="grid size-16 place-items-center rounded-full bg-lime text-ink shadow-lg shadow-lime/40">
            <Crown className="size-8" />
          </span>
          <DialogTitle className="text-2xl font-extrabold text-ink">{t("bidDialogTitle", vars)}</DialogTitle>
          <p className="text-sm font-bold text-ink/70">{t("bidPlaced", vars)}</p>
          <DialogDescription className="text-sm text-muted-foreground">{t("bidDialogBody", vars)}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 sm:justify-center">
          <Button className="w-full sm:w-auto" onClick={onClose} autoFocus>{t("bidDialogButton", vars)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
