/**
 * Per-item listings (eBay-style): every item has its own bidding window, set by Admins.
 *
 *   scheduled  now < startsAt   — Users see "Starts in…", or nothing at all if hiddenUntilStart
 *   open       startsAt ≤ now < endsAt — bidding allowed
 *   ended      now ≥ endsAt     — highest bidder wins
 *
 * Pure helpers (no server-only imports) so client components can tick the phase over without a refresh.
 */

export type Phase = "scheduled" | "open" | "ended";

type Window = { startsAt: Date | string; endsAt: Date | string };
const ms = (d: Date | string) => (typeof d === "string" ? Date.parse(d) : d.getTime());

export function phaseOf(w: Window, now = Date.now()): Phase {
  if (now < ms(w.startsAt)) return "scheduled";
  return now < ms(w.endsAt) ? "open" : "ended";
}

/** Prisma `where` for items a User may see: everything except listings hidden until they start. */
export const visibleToUsers = (now = new Date()) => ({ OR: [{ hiddenUntilStart: false }, { startsAt: { lte: now } }] });

/** Prisma `where` for items open for bidding right now. */
export const openNow = (now = new Date()) => ({ startsAt: { lte: now }, endsAt: { gt: now } });

/** 93784000 → "1d 2h", 7380000 → "2h 3m", 185000 → "3m 5s". */
export function shortDuration(msLeft: number): string {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

/** Shown under countdowns: "Sat 15 Nov, 7:30 pm" in the venue's time zone. */
export function listingTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-AU", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    timeZone: process.env.NEXT_PUBLIC_TZ || "Australia/Melbourne",
  });
}

/** Default window for a new listing: opens now, ends in 7 days. */
export function defaultWindow(now = new Date()) {
  return { startsAt: now, endsAt: new Date(now.getTime() + 7 * 86_400_000) };
}
