import Link from "next/link";
import { Search, X } from "lucide-react";

/** GET form so it works without JS. Hidden inputs carry any other params (e.g. filter) through. */
export function SearchBox({ action, q, hidden, placeholder }: {
  action: string; q: string; hidden?: Record<string, string>; placeholder: string;
}) {
  const clear = new URLSearchParams(hidden);
  return (
    <form action={action} method="get" role="search" className="relative w-full sm:max-w-sm">
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name="q" type="search" defaultValue={q} placeholder={placeholder} aria-label={placeholder} maxLength={80}
        className="h-11 w-full rounded-xl border border-transparent bg-white pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {q && (
        <Link href={`${action}${clear.size ? `?${clear}` : ""}`} aria-label="Clear search"
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </Link>
      )}
    </form>
  );
}
