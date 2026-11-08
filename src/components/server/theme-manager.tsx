"use client";

import { AlertTriangle, CalendarDays, Download, Eye, FileDown, Package, Sparkles, Trash2, Type, Upload } from "lucide-react";
import { useActionState, useId, useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteThemeAction, installThemeAction, previewThemeAction, setThemeModeAction } from "@/app/server/theme-actions";

export type ThemeCard = {
  id: string; name: string; description?: string; source: "default" | "built-in" | "installed"; replacesBuiltIn: boolean;
  ok: boolean; error?: string; dates?: string; effect: string; font: boolean; swatches: string[];
};

const EFFECT_LABEL: Record<string, string> = { none: "No effect", snow: "Snow", leaves: "Falling leaves", bats: "Bats", confetti: "Confetti" };

/** Server Admin: choose how themes switch, preview, install (.zip), download and delete them. */
export function ThemeManager({ themes, mode, showingId, reason }: { themes: ThemeCard[]; mode: string; showingId: string; reason: string }) {
  const [ask, confirmDialog] = useConfirm();
  const [busy, start] = useTransition();
  const [state, install, installing] = useActionState(installThemeAction, undefined);
  const formId = useId();
  const valid = themes.filter((t) => t.ok);
  const showing = themes.find((t) => t.id === showingId);

  const run = (p: Promise<{ error?: string; message?: string } | undefined | void>) =>
    start(async () => {
      const r = await p;
      if (r?.error) toast.error(r.error);
      else if (r?.message) toast.success(r.message);
    });

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* how themes switch */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="space-y-2">
          <Label htmlFor="themeMode">When to show</Label>
          <Select value={mode} onValueChange={(v) => run(setThemeModeAction(v))} disabled={busy}>
            <SelectTrigger id="themeMode" className="min-w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatic (by each theme&apos;s dates)</SelectItem>
              {valid.map((t) => <SelectItem key={t.id} value={t.id}>Always: {t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="pb-2.5 text-sm text-muted-foreground">
          Showing now: <span className="font-bold text-ink">{showing?.name ?? "Yoink"}</span> <span>({reason})</span>
        </p>
      </div>

      {/* themes */}
      <ul className="grid gap-3 md:grid-cols-2">
        {themes.map((t) => (
          <li key={t.id} className={`flex flex-col gap-3 rounded-2xl border p-4 ${t.id === showingId ? "border-ink" : "border-border"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-extrabold text-ink">{t.name}</p>
              {t.id === showingId && <Badge variant="lime">Showing now</Badge>}
              {t.source === "default" ? <Badge variant="secondary">Default</Badge>
                : t.source === "built-in" ? <Badge variant="secondary">Built-in</Badge>
                : <Badge variant="lilac"><Package /> {t.replacesBuiltIn ? "Installed (replaces built-in)" : "Installed"}</Badge>}
            </div>
            {t.ok ? (
              <>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {t.swatches.length > 0 && (
                    <span className="flex gap-1" aria-label="Colours">
                      {t.swatches.map((c) => <span key={c} className="size-4 rounded-full ring-1 ring-border" style={{ background: c }} />)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {t.dates ?? "No dates (choose it to use it)"}</span>
                  <span className="inline-flex items-center gap-1"><Sparkles className="size-3.5" /> {EFFECT_LABEL[t.effect] ?? t.effect}</span>
                  {t.font && <span className="inline-flex items-center gap-1"><Type className="size-3.5" /> Own font</span>}
                </div>
              </>
            ) : (
              <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <span className="[overflow-wrap:anywhere]">{t.error}</span>
              </p>
            )}
            <div className="mt-auto flex flex-wrap gap-2">
              {t.ok && t.source !== "default" && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run(previewThemeAction(t.id))}><Eye /> Preview</Button>
              )}
              {t.source !== "default" && (
                <Button size="sm" variant="ghost" asChild><a href={`/server/themes/${t.id}/download`}><Download /> Download</a></Button>
              )}
              {t.source === "installed" && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}
                  onClick={async () => {
                    const ok = await ask({
                      title: `Delete the ${t.name} theme?`,
                      description: t.replacesBuiltIn ? "The built-in version of this theme comes back." : "Its folder is removed from the server.",
                      confirmLabel: "Delete theme",
                    });
                    if (ok) run(deleteThemeAction(t.id));
                  }}>
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* install */}
      <form id={formId} action={install} className="space-y-3 border-t pt-5">
        <Label htmlFor="theme-zip" className="block leading-snug">
          Install a theme <span className="block font-normal text-muted-foreground">A .zip with a theme.json plus its images and font. Installing a theme with the same name replaces it.</span>
        </Label>
        <div className="flex flex-wrap items-center gap-3">
          <FileInput id="theme-zip" name="theme" accept=".zip,application/zip" className="sm:w-80" placeholder="Choose a theme .zip" />
          <Button type="submit" disabled={installing}><Upload /> {installing ? "Installing…" : "Install"}</Button>
          <Button variant="ghost" asChild><a href="/server/themes/template"><FileDown /> Starter template</a></Button>
        </div>
        {state?.error && <p className="text-sm text-destructive [overflow-wrap:anywhere]">{state.error}</p>}
        {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
      </form>
    </div>
  );
}
