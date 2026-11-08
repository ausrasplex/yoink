"use client";

import { Archive, PackageCheck, Undo2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setArchivedAction, setClaimedAction } from "@/app/bids/actions";

/**
 * My Bids, on an ended item: "Claimed" if you won it (you've collected it), "Archive" if you didn't.
 * Either moves it to the Archived tab; "Undo" there moves it back.
 */
export function ClaimButton({ lot, won, archived }: { lot: number; won: boolean; archived: boolean }) {
  const [pending, start] = useTransition();
  const run = () => start(async () => {
    const r = won ? await setClaimedAction(lot, !archived) : await setArchivedAction(lot, !archived);
    if (r.error) toast.error(r.error);
    else toast.success(archived ? `Lot ${lot} moved back to My Bids` : won ? `Lot ${lot} marked as claimed` : `Lot ${lot} archived`);
  });
  if (archived) return <Button size="sm" variant="ghost" disabled={pending} onClick={run}><Undo2 /> Undo</Button>;
  return won
    ? (
      <Button size="sm" variant="lime" disabled={pending} onClick={run} title="Collected it? Mark it as claimed"
        className="bg-ink text-lime hover:bg-lime hover:text-ink hover:shadow-md hover:shadow-ink/20">
        <PackageCheck /> {pending ? "Saving…" : "Claimed?"}
      </Button>
    )
    : <Button size="sm" variant="outline" disabled={pending} onClick={run}><Archive /> {pending ? "Saving…" : "Archive"}</Button>;
}
