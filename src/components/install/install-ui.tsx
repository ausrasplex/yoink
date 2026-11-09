"use client";

import { Copy, Download, Ellipsis, ExternalLink, Share, SquarePlus, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { closeInstallDialog, installStore, startInstall } from "./install-store";

/** What "Install app" would do here (null: hide the button). */
export function useInstallMode() {
  return useSyncExternalStore(installStore.subscribe, installStore.get, installStore.server).mode;
}

type Step = { icon: React.ReactNode; text: React.ReactNode };

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3 text-left">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
          <span className="min-w-0 pt-0.5 text-sm text-ink">
            {s.text}
            {s.icon && <span className="ml-1.5 inline-grid size-6 translate-y-1.5 place-items-center rounded-md bg-muted text-ink [&>svg]:size-4">{s.icon}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

const b = (t: string) => <span className="font-bold">{t}</span>;

/** The steps dialog for iPhone/iPad and in-app browsers. Mounted once, in the root layout. */
export function InstallDialog({ name }: { name: string }) {
  const { dialog } = useSyncExternalStore(installStore.subscribe, installStore.get, installStore.server);
  const [copied, setCopied] = useState(false);

  const content =
    dialog === "in-app" ? {
      title: `Open ${name} in your browser first`,
      desc: "Apps like Messenger, Instagram and Facebook open links in their own browser, which can't add apps to your home screen.",
      steps: [
        { icon: <Ellipsis />, text: <>Tap the {b("menu")} button in the top or bottom corner</> },
        { icon: <ExternalLink />, text: <>Choose {b("Open in browser")} (or {b("Open in Safari")} / {b("Open in Chrome")})</> },
        { icon: <Download />, text: <>In the browser, tap {b("Install app")} again</> },
      ],
    } : dialog === "ios-chrome" ? {
      title: `Add ${name} to your Home Screen`,
      desc: "Then it opens full screen from its own icon, like any other app.",
      steps: [
        { icon: <Share />, text: <>Tap the {b("Share")} button in the address bar, top right</> },
        { icon: <SquarePlus />, text: <>Tap {b("Add to Home Screen")} (scroll down if you don&apos;t see it)</> },
        { icon: null, text: <>Tap {b("Add")}, then open {name} from your Home Screen</> },
      ],
    } : {
      title: `Add ${name} to your Home Screen`,
      desc: "Then it opens full screen from its own icon, like any other app.",
      steps: [
        { icon: <Share />, text: <>Tap the {b("Share")} button in Safari (bottom of the screen on iPhone, top on iPad)</> },
        { icon: <SquarePlus />, text: <>Scroll down and tap {b("Add to Home Screen")}</> },
        { icon: null, text: <>Tap {b("Add")}, then open {name} from your Home Screen</> },
      ],
    };

  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.origin); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <Dialog open={!!dialog} onOpenChange={(o) => { if (!o) closeInstallDialog(); }}>
      <DialogContent className="rounded-3xl p-6 sm:max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-extrabold text-ink">{content.title}</DialogTitle>
          <DialogDescription>{content.desc}</DialogDescription>
        </DialogHeader>
        <Steps steps={content.steps} />
        <DialogFooter className="mt-2 gap-2 sm:justify-end">
          {dialog === "in-app" && (
            <Button variant="outline" onClick={copy}><Copy /> {copied ? "Link copied" : "Copy link"}</Button>
          )}
          <Button onClick={closeInstallDialog}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- dashboard card: hidden for good on this device once dismissed (a per-device nicety in localStorage)
const DISMISS_KEY = "yoink-install-card-dismissed";
const dismissListeners = new Set<() => void>();
const dismissedStore = {
  subscribe(l: () => void) { dismissListeners.add(l); return () => { dismissListeners.delete(l); }; },
  get() { try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; } },
  server: () => true, // render nothing on the server; decide in the browser
};

/** "Install {name} on this phone" card. Only on phones/tablets that can install, not inside the installed app. */
export function InstallCard({ name, icon }: { name: string; icon: string }) {
  const mode = useInstallMode();
  const dismissed = useSyncExternalStore(dismissedStore.subscribe, dismissedStore.get, dismissedStore.server);
  if (!mode || dismissed) return null;
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    dismissListeners.forEach((l) => l());
  };
  return (
    // Phones: icon, text and ✕ on one row, a full-width Install button under them. Wider: all on one row.
    <section className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-3 rounded-3xl bg-white p-4 sm:flex-nowrap sm:gap-4 sm:p-5">
      {/* eslint-disable-next-line @next/next/no-img-element -- the app icon, our own small image */}
      <img src={icon} alt="" className="size-12 shrink-0 rounded-xl object-contain" />
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug text-ink">Install {name} on this {/iPad|Macintosh/.test(navigator.userAgent) ? "tablet" : "phone"}</p>
        <p className="text-sm text-muted-foreground">Open it from your home screen, full screen, like any other app.</p>
      </div>
      <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Hide this" className="order-none -mr-1 -mt-1 shrink-0 self-start rounded-full sm:order-last sm:mt-0 sm:self-center">
        <X />
      </Button>
      <Button onClick={startInstall} className="w-full shrink-0 sm:w-auto"><Download /> Install</Button>
    </section>
  );
}
