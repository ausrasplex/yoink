import Link from "next/link";
import { cn } from "@/lib/utils";

export function FilterChips({ base, current, q, options }: {
  base: string; current: string; q?: string; options: { value: string; label: string; count?: number; icon?: React.ReactNode }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const params = new URLSearchParams();
        if (o.value !== "all") params.set("filter", o.value);
        if (q) params.set("q", q);
        const active = current === o.value;
        return (
          <Link
            key={o.value}
            href={`${base}${params.size ? `?${params}` : ""}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active ? "bg-ink text-white" : "bg-white text-ink hover:bg-white/70",
            )}
          >
            {o.icon}{o.label}{o.count !== undefined && <span className={cn("ml-2 text-xs", active ? "text-white/60" : "text-muted-foreground")}>{o.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
