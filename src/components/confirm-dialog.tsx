"use client";

import { TriangleAlert } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  /** Destructive (default): red confirm button. Use false for reversible actions. */
  destructive?: boolean;
};

/**
 * Themed replacement for window.confirm. Every destructive action goes through this:
 *   const [ask, confirmDialog] = useConfirm();
 *   if (!(await ask({ title: "Delete lot 4?", confirmLabel: "Delete" }))) return;
 *   …and render {confirmDialog} somewhere in the component.
 */
export function useConfirm(): [(o: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback((o: ConfirmOptions) => {
    resolver.current?.(false); // a second request cancels the first
    setOpts(o);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };
  const destructive = opts?.destructive ?? true;

  const dialog = (
    <Dialog open={!!opts} onOpenChange={(open) => { if (!open) close(false); }}>
      <DialogContent showCloseButton={false} className="rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="gap-3">
          {destructive && (
            <span className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive"><TriangleAlert className="size-5" /></span>
          )}
          <DialogTitle className="text-lg font-extrabold text-ink">{opts?.title}</DialogTitle>
          {opts?.description && <DialogDescription className="text-sm text-muted-foreground">{opts.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => close(false)} autoFocus>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={() => close(true)}>{opts?.confirmLabel ?? "Confirm"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return [ask, dialog];
}
