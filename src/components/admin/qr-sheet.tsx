"use client";

import { CheckSquare, Printer, Square } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Admin: every item's QR code as a selectable card. "Print selected" prints only the chosen codes
 * (unselected cards are hidden in the print layout), across as many pages as they need.
 */
export function QrSheet({ items, base, color, logo }: {
  items: { lot: number; title: string; code: string }[]; base: string; color: string; logo: string | null;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const n = selected.size;
  const toggle = (lot: number) => {
    const next = new Set(selected);
    if (next.has(lot)) next.delete(lot);
    else next.add(lot);
    setSelected(next);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" onClick={() => setSelected(new Set(items.map((i) => i.lot)))} disabled={n === items.length || !items.length}>
          <CheckSquare /> Select all
        </Button>
        <Button variant="ghost" onClick={() => setSelected(new Set())} disabled={n === 0}><Square /> Clear</Button>
        <span className="text-sm text-muted-foreground">{n} of {items.length} selected</span>
        <Button className="ml-auto" onClick={() => window.print()} disabled={n === 0}>
          <Printer /> {n ? `Print selected (${n})` : "Print selected"}
        </Button>
      </div>
      {items.length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-sm text-muted-foreground">No items yet.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
        {items.map((i) => {
          const on = selected.has(i.lot);
          return (
            <label key={i.lot}
              className={cn(
                "relative flex cursor-pointer break-inside-avoid flex-col items-center gap-2 rounded-3xl border-2 bg-white p-5 text-center transition-colors print:rounded-lg print:border",
                on ? "border-ink" : "border-transparent hover:border-border",
                !on && "print:hidden",
              )}>
              <input type="checkbox" checked={on} onChange={() => toggle(i.lot)} aria-label={`Select lot ${i.lot}`}
                className="absolute left-4 top-4 size-5 accent-ink print:hidden" />
              <QRCodeSVG value={`${base}/i/${i.code}`} size={160} marginSize={2} level={logo ? "H" : "M"} fgColor={color}
                imageSettings={logo ? { src: logo, height: 38, width: 38, excavate: true } : undefined} />
              <p className="text-lg font-extrabold text-ink">Lot {i.lot}</p>
              <p className="text-sm text-muted-foreground">{i.title}</p>
            </label>
          );
        })}
      </div>
    </>
  );
}
