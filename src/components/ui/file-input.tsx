"use client";

import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Themed file picker (the browser's own "Choose File / No file chosen" control doesn't line up with our fields).
 * A real <input type="file"> carries the files, so it submits with its form as usual; this only replaces how it looks.
 */
export function FileInput({ id, name, accept, multiple, onFiles, className, placeholder }: {
  id: string; name: string; accept?: string; multiple?: boolean;
  onFiles?: (files: File[]) => void; className?: string; placeholder?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);

  // React resets forms after a server action; clear the shown file name with it.
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const clear = () => setNames([]);
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  const label = names.length === 0 ? (placeholder ?? (multiple ? "No files chosen" : "No file chosen"))
    : names.length === 1 ? names[0] : `${names.length} files chosen`;

  return (
    <label htmlFor={id}
      className={cn(
        "flex h-11 w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-input bg-white pr-3 pl-1.5 text-sm transition-colors hover:border-ink/40",
        "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
        className,
      )}>
      <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-3 font-semibold text-ink">
        <Upload className="size-4" /> {multiple ? "Choose files" : "Choose file"}
      </span>
      <span className={cn("min-w-0 truncate", names.length ? "text-ink" : "text-muted-foreground")} title={names.join(", ")}>{label}</span>
      <input ref={input} id={id} name={name} type="file" accept={accept} multiple={multiple} className="sr-only"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          setNames(files.map((f) => f.name));
          onFiles?.(files);
        }} />
    </label>
  );
}
