"use client";

import { useConfirm } from "@/components/confirm-dialog";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { FilterTable, type FilterColumn, type FilterRow } from "@/components/filter-table";
import { Button } from "@/components/ui/button";
import { deleteArchivedItemsAction } from "@/app/admin/actions";

/** Admin: ended listings, with checkboxes to delete several at once. */
export function ArchiveTable({ rows, columns, empty }: { rows: FilterRow[]; columns: FilterColumn[]; empty: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const [ask, confirmDialog] = useConfirm();
  const n = selected.size;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 px-2 pt-1">
        <Button variant="destructive" disabled={n === 0 || pending}
          onClick={async () => {
            if (!(await ask({
              title: `Delete ${n} archived item${n === 1 ? "" : "s"}?`,
              description: "Their bids and photos are deleted too. This can't be undone. Export the CSV first if you need a record.",
              confirmLabel: `Delete ${n} item${n === 1 ? "" : "s"}`,
            }))) return;
            start(async () => {
              setError(undefined);
              const res = await deleteArchivedItemsAction([...selected]);
              if (res?.error) setError(res.error);
              else setSelected(new Set());
            });
          }}>
          <Trash2 /> {pending ? "Deleting…" : n ? `Delete selected (${n})` : "Delete selected"}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
        <span className="text-xs text-muted-foreground">Tip: export the CSV first if you need a record of winners.</span>
      </div>
      {confirmDialog}
      <FilterTable label="Archived items" rows={rows} columns={columns} empty={empty} selected={selected} onSelectedChange={setSelected} />
    </div>
  );
}
