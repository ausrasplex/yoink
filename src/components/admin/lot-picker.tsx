"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "all";

/** Admin: Bid history's item filter. Choosing an item shows its bids straight away. */
export function LotPicker({ items, value }: { items: { lot: number; title: string }[]; value: number | null }) {
  const router = useRouter();
  return (
    <Select value={value === null ? ALL : String(value)}
      onValueChange={(v) => router.push(v === ALL ? "/admin/history" : `/admin/history?lot=${v}`)}>
      <SelectTrigger id="lot" className="max-w-full sm:min-w-64"><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={ALL}>All items</SelectItem>
        {items.map((i) => <SelectItem key={i.lot} value={String(i.lot)}>Lot {i.lot} · {i.title}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
