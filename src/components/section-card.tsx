import { cn } from "@/lib/utils";

export type SectionHead = { icon?: React.ReactNode; title: string; badge?: React.ReactNode; desc?: React.ReactNode };

/** White card with a heading; `action` sits to the right of the heading (it wraps under it on narrow screens). Give `action` lg:shrink-0. */
export function SectionCard({ icon, title, badge, desc, action, children, className }: SectionHead & {
  action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("rounded-3xl bg-white p-6", className)}>
      {/* lg: one row — the title block takes the remaining width (its description wraps) and the action stays beside the title */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 lg:flex-nowrap">
        <div className="min-w-0 lg:flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-extrabold text-ink">{icon}{title} {badge}</h2>
          {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
