/**
 * "Install app" for phones and tablets, shared by the dashboard card and the profile-menu item.
 *
 * - Android browsers (Chrome, Edge, Samsung Internet) fire `beforeinstallprompt` when the app can be installed: we keep
 *   it and our button opens the browser's real install prompt. Not fired once it's installed, or in browsers that
 *   can't install (then there's no button).
 * - iPhone/iPad: no web API can start "Add to Home Screen", so the button opens a dialog with the steps.
 * - In-app browsers (Messenger, Instagram, Facebook…) can't install at all: the dialog says to open it in the browser.
 * - Opened from the home screen already (standalone): nothing to offer.
 *
 * The listener is attached when this module first loads in the browser (the root layout mounts InstallDialog), so the
 * event isn't missed if it fires before the card or menu renders.
 */

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** What tapping "Install app" does on this device, or null when there's nothing to offer. */
export type InstallMode = "prompt" | "ios" | "ios-chrome" | "in-app" | null;
type State = { mode: InstallMode; dialog: "ios" | "ios-chrome" | "in-app" | null };

let deferred: PromptEvent | null = null;
const SERVER: State = { mode: null, dialog: null }; // one object: useSyncExternalStore needs a stable snapshot
let state: State = SERVER;
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };

function detect(): InstallMode {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) return null; // already the app
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS says "Mac"
  const android = /Android/.test(ua);
  if (!ios && !android) return null; // phones and tablets only
  if (/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\/|MicroMessenger|Snapchat|TikTok|; wv\)/.test(ua)) return "in-app";
  if (deferred) return "prompt";
  if (ios) return /CriOS/.test(ua) ? "ios-chrome" : "ios";
  return null; // Android without the event: already installed, or this browser can't install
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep it for our button instead of the browser's own mini-bar
    deferred = e as PromptEvent;
    set({ mode: detect() });
  });
  window.addEventListener("appinstalled", () => { deferred = null; set({ mode: null, dialog: null }); });
  queueMicrotask(() => set({ mode: detect() }));
}

export const installStore = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  get: () => state,
  server: (): State => SERVER,
};

/** What the Install button does. */
export async function startInstall() {
  const mode = state.mode;
  if (mode === "prompt" && deferred) {
    const e = deferred;
    deferred = null; // a prompt can only be shown once
    await e.prompt();
    const { outcome } = await e.userChoice;
    set({ mode: outcome === "accepted" ? null : detect() });
    return;
  }
  if (mode === "ios" || mode === "ios-chrome" || mode === "in-app") set({ dialog: mode });
}

export const closeInstallDialog = () => set({ dialog: null });
