"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, FilterX, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Data table: click a column header to sort it A→Z, again for Z→A, a third time back to the default order.
 * Above the table: one search box (matches any column) and a dropdown for each column with fixed options (e.g. status).
 * Cells are rendered on the server and passed in; sorting/searching use each row's plain `values`
 * (or `sort` values where display text doesn't sort well, e.g. dates).
 */
export type FilterColumn = {
  id: string;
  header: string;
  /** Default true. Turn off for action columns. */
  sortable?: boolean;
  /** Fixed values to filter by in a dropdown above the table. */
  options?: string[];
  align?: "right";
  className?: string;
};
export type FilterRow = {
  id: string;
  values: Record<string, string | number | null>;
  sort?: Record<string, string | number | null>;
  cells: Record<string, React.ReactNode>;
};
type Sort = { id: string; dir: "asc" | "desc" } | null;
const ALL = "__all"; // Radix Select items can't use an empty value

const compare = (a: string | number | null, b: string | number | null) => {
  if (a === null || a === "") return b === null || b === "" ? 0 : 1; // blanks last either way
  if (b === null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
};

export function FilterTable({ columns, rows, empty = "Nothing here yet.", selected, onSelectedChange, label = "Table", searchPlaceholder = "Search…" }: {
  columns: FilterColumn[];
  rows: FilterRow[];
  empty?: React.ReactNode;
  /** Pass both to show a checkbox column (selection is kept by the caller). */
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  label?: string;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<Sort>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) =>
      (!q || columns.some((c) => String(r.values[c.id] ?? "").toLowerCase().includes(q)))
      && columns.every((c) => !c.options || !picks[c.id] || String(r.values[c.id] ?? "") === picks[c.id]));
    if (!sort) return list;
    const key = (r: FilterRow) => r.sort?.[sort.id] ?? r.values[sort.id] ?? null;
    return [...list].sort((a, b) => {
      const c = compare(key(a), key(b));
      // keep blanks last in both directions
      const blank = key(a) === null || key(a) === "" || key(b) === null || key(b) === "";
      return sort.dir === "asc" || blank ? c : -c;
    });
  }, [rows, columns, query, picks, sort]);

  const cycle = (id: string) =>
    setSort((s) => (s?.id !== id ? { id, dir: "asc" } : s.dir === "asc" ? { id, dir: "desc" } : null));
  const active = !!query.trim() || Object.values(picks).some(Boolean);
  const selectable = !!selected && !!onSelectedChange;
  const allShownSelected = selectable && shown.length > 0 && shown.every((r) => selected.has(r.id));
  const toggle = (ids: string[], on: boolean) => {
    if (!selectable) return;
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onSelectedChange(next);
  };
  const colSpan = columns.length + (selectable ? 1 : 0);
  const control = "h-10 rounded-xl border border-transparent bg-secondary px-4 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-2 pt-1">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label={`Search ${label.toLowerCase()}`} placeholder={searchPlaceholder} value={query}
            onChange={(e) => setQuery(e.target.value)} className={cn(control, "w-full pl-10")} />
        </div>
        {columns.filter((c) => c.options).map((c) => (
          <Select key={c.id} value={picks[c.id] || ALL} onValueChange={(v) => setPicks({ ...picks, [c.id]: v === ALL ? "" : v })}>
            <SelectTrigger variant="soft" aria-label={`Filter by ${c.header.toLowerCase()}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{c.header}: all</SelectItem>
              {c.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        {active && <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setPicks({}); }}><FilterX /> Clear</Button>}
        <span className="ml-auto text-xs text-muted-foreground">
          {active ? `Showing ${shown.length} of ${rows.length}` : `${rows.length} row${rows.length === 1 ? "" : "s"}`}
        </span>
      </div>
      <Table aria-label={label}>
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            {selectable && (
              <TableHead className="w-10">
                <input type="checkbox" aria-label="Select all shown rows" className="size-4 accent-ink" checked={allShownSelected}
                  onChange={(e) => toggle(shown.map((r) => r.id), e.target.checked)} />
              </TableHead>
            )}
            {columns.map((c) => {
              const dir = sort?.id === c.id ? sort.dir : null;
              const canSort = c.sortable !== false && !!c.header;
              const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
              return (
                <TableHead key={c.id} className={cn(c.align === "right" && "text-right", c.className)}
                  aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : canSort ? "none" : undefined}>
                  {canSort ? (
                    <button type="button" onClick={() => cycle(c.id)}
                      title={dir === "asc" ? "Sorted A to Z — click for Z to A" : dir === "desc" ? "Sorted Z to A — click for the default order" : "Click to sort A to Z"}
                      className={cn("-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:text-ink", dir && "text-ink", c.align === "right" && "flex-row-reverse")}>
                      {c.header}
                      <Icon className={cn("size-3.5", !dir && "opacity-40")} />
                    </button>
                  ) : c.header}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((r) => (
            <TableRow key={r.id} className="border-border/60" data-state={selected?.has(r.id) ? "selected" : undefined}>
              {selectable && (
                <TableCell className="w-10">
                  <input type="checkbox" aria-label="Select row" className="size-4 accent-ink" checked={selected.has(r.id)}
                    onChange={(e) => toggle([r.id], e.target.checked)} />
                </TableCell>
              )}
              {columns.map((c) => (
                <TableCell key={c.id} className={cn(c.align === "right" && "text-right", c.className)}>{r.cells[c.id]}</TableCell>
              ))}
            </TableRow>
          ))}
          {shown.length === 0 && (
            <TableRow><TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">{active ? "Nothing matches these filters." : empty}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
