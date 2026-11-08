"use client";

import { Eye, X } from "lucide-react";
import { useTransition } from "react";
import { stopThemePreviewAction } from "@/app/server/theme-actions";

/** Shown only in the browser that's previewing a theme (Server Admin's "Preview"). */
export function PreviewBanner({ name }: { name: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-ink px-4 py-2 text-sm font-semibold text-white print:hidden">
      <Eye className="size-4 shrink-0" /> <span className="truncate">Previewing the {name} theme (only you can see it)</span>
      <button type="button" disabled={pending} onClick={() => start(() => stopThemePreviewAction())}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs hover:bg-white/25">
        <X className="size-3.5" /> Stop preview
      </button>
    </div>
  );
}
