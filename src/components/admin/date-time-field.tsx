"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Themed date + time picker (replaces the browser's datetime-local). Works in the admin's own time zone and submits
 * the exact instant as ISO/UTC in a hidden field named `name`. The visible value only renders on the client, since the
 * server can't know the browser's time zone.
 */

const subscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false);

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 00–55

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) =>
  d.toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** 42 dates (6 weeks, Monday first) covering the month of `year`/`month`. */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}

export function DateTimeField({ name, label, defaultValue, hint }: { name: string; label: string; defaultValue: string; hint?: string }) {
  const isClient = useIsClient();
  const [picked, setPicked] = useState<Date | null>(null);
  const value = picked ?? new Date(defaultValue);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const shown = view ?? { y: value.getFullYear(), m: value.getMonth() };
  const today = new Date();
  const id = `dt-${name}`;

  const set = (d: Date) => setPicked(new Date(d));
  const withTime = (h24: number, min: number) => { const d = new Date(value); d.setHours(h24, min, 0, 0); set(d); };
  const hour12 = value.getHours() % 12 || 12;
  const pm = value.getHours() >= 12;
  const to24 = (h12: number, isPm: boolean) => (h12 % 12) + (isPm ? 12 : 0);
  const minutes = MINUTES.includes(value.getMinutes()) ? MINUTES : [...MINUTES, value.getMinutes()].sort((a, b) => a - b);
  const step = (delta: number) => {
    const d = new Date(shown.y, shown.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const pill = (active: boolean) =>
    cn("rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors",
      active ? "bg-ink text-white" : "text-ink hover:bg-secondary");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setView(null); }}>
        <PopoverTrigger asChild>
          <button id={id} type="button"
            className="flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-white px-3 text-left text-sm text-ink outline-none transition-colors hover:border-ink/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=open]:border-ink">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate" suppressHydrationWarning>{isClient ? fmt(value) : " "}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(22rem,calc(100vw-2rem))]">
          {/* month */}
          <div className="mb-2 flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon" aria-label="Previous month" onClick={() => step(-1)}><ChevronLeft /></Button>
            <p className="text-sm font-extrabold">
              {new Date(shown.y, shown.m, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
            </p>
            <Button type="button" variant="ghost" size="icon" aria-label="Next month" onClick={() => step(1)}><ChevronRight /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Choose a date">
            {WEEKDAYS.map((w) => <span key={w} className="pb-1 text-[11px] font-bold uppercase text-muted-foreground">{w}</span>)}
            {monthGrid(shown.y, shown.m).map((d) => {
              const selected = sameDay(d, value);
              const outside = d.getMonth() !== shown.m;
              return (
                <button key={d.toISOString()} type="button" aria-label={d.toLocaleDateString("en-AU", { dateStyle: "full" })} aria-pressed={selected}
                  onClick={() => { const n = new Date(value); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); set(n); setView(null); }}
                  className={cn(
                    "grid aspect-square place-items-center rounded-lg text-sm font-semibold tabular-nums transition-colors",
                    selected ? "bg-ink text-white" : outside ? "text-muted-foreground/50 hover:bg-secondary" : "text-ink hover:bg-lilac/50",
                    !selected && sameDay(d, today) && "ring-2 ring-lime ring-inset",
                  )}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* time */}
          <div className="mt-4 border-t pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time</p>
              <div className="flex rounded-full bg-secondary p-0.5" role="radiogroup" aria-label="AM or PM">
                {[false, true].map((isPm) => (
                  <button key={String(isPm)} type="button" role="radio" aria-checked={pm === isPm}
                    onClick={() => withTime(to24(hour12, isPm), value.getMinutes())} className={pill(pm === isPm)}>
                    {isPm ? "PM" : "AM"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2">
              <span className="pt-1 text-xs font-semibold text-muted-foreground">Hour</span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Hour">
                {HOURS.map((h) => (
                  <button key={h} type="button" role="radio" aria-checked={h === hour12}
                    onClick={() => withTime(to24(h, pm), value.getMinutes())} className={pill(h === hour12)}>{h}</button>
                ))}
              </div>
              <span className="pt-1 text-xs font-semibold text-muted-foreground">Min</span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Minute">
                {minutes.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={m === value.getMinutes()}
                    onClick={() => withTime(value.getHours(), m)} className={pill(m === value.getMinutes())}>:{pad(m)}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { const n = new Date(); n.setSeconds(0, 0); set(n); setView(null); }}>Now</Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={isClient ? value.toISOString() : defaultValue} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
