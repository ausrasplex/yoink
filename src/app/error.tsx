"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { unstable_isUnrecognizedActionError as isStaleAction } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const KEY = "yoink-stale-reload";

/**
 * App-wide error screen. One case is handled by itself: a page opened before the server was updated still points its
 * forms at the old build's server actions, which the new build doesn't know ("Server Action … was not found"). Reloading
 * fetches the current page, so we do that once automatically instead of leaving a dead "couldn't load" screen.
 */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const stale = isStaleAction(error);

  useEffect(() => {
    if (!stale) return;
    let last = 0;
    try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch {}
    if (Date.now() - last < 30_000) return; // already reloaded just now: show the screen rather than loop
    try { sessionStorage.setItem(KEY, String(Date.now())); } catch {}
    window.location.reload();
  }, [stale]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 text-center">
        <TriangleAlert className="mx-auto size-8 text-ink" />
        <h1 className="text-xl font-extrabold text-ink">{stale ? "The app was just updated" : "Something went wrong"}</h1>
        <p className="text-sm text-muted-foreground">
          {stale
            ? "This page was opened before the update. Reload it and try again; anything you typed on it needs entering again."
            : "This page couldn't load. Try again, or reload the page."}
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => (stale ? window.location.reload() : retry())}><RefreshCw /> {stale ? "Reload" : "Try again"}</Button>
        </div>
      </div>
    </div>
  );
}
