"use client";

import { Clock, Hourglass, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { phaseOf, shortDuration } from "@/lib/listing";
import { cn } from "@/lib/utils";

/** Current time, re-rendering every second, so listings flip from "Starts in" to open to "Ended" on their own. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Big days/hrs/min/sec countdown (for dark ink panels). */
export function Countdown({ to }: { to: string }) {
  const now = useNow();
  const t = parts(Date.parse(to) - now);
  const cells = [["d", "days"], ["h", "hrs"], ["m", "min"], ["s", "sec"]] as const;
  return (
    <div className="flex gap-2" suppressHydrationWarning>
      {cells.map(([k, label]) => (
        <div key={k} className="min-w-14 flex-1 rounded-2xl bg-white/10 px-2 py-3 text-center">
          <p className="text-2xl font-extrabold tabular-nums" suppressHydrationWarning>{String(t[k]).padStart(2, "0")}</p>
          <p className="text-[11px] uppercase tracking-wider text-white/60">{label}</p>
        </div>
      ))}
    </div>
  );
}

/** Compact pill for item cards and lists: "Ends in 2d 4h" / "Starts in 3h 10m" / "Ended". */
export function ListingClock({ startsAt, endsAt, className }: { startsAt: string; endsAt: string; className?: string }) {
  const now = useNow();
  const phase = phaseOf({ startsAt, endsAt }, now);
  const soon = phase === "open" && Date.parse(endsAt) - now < 3600_000;
  const [Icon, text, tone] =
    phase === "scheduled" ? [Hourglass, `Starts in ${shortDuration(Date.parse(startsAt) - now)}`, "bg-lilac text-ink"]
    : phase === "open" ? [Clock, `Ends in ${shortDuration(Date.parse(endsAt) - now)}`, soon ? "bg-peach text-ink" : "bg-secondary text-muted-foreground"]
    : [Lock, "Ended", "bg-ink text-white"];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", tone, className)} suppressHydrationWarning>
      <Icon className="size-3.5 shrink-0" />
      <span suppressHydrationWarning>{text}</span>
    </span>
  );
}
