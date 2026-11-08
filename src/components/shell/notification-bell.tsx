"use client";

import Link from "next/link";
import { Bell, CheckCheck, CircleSlash, Clock, Sparkles, Trophy, TrendingDown, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCopy } from "@/components/theme/theme-provider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationsReadAction } from "@/app/notifications/actions";
import { timeAgo } from "@/lib/devices";
import { money } from "@/lib/format";
import type { NotificationRow } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Feed = { unread: number; items: NotificationRow[] };
const POLL_MS = 30_000;

const KIND = {
  outbid: { key: "notifyOutbid", icon: TrendingDown, tone: "bg-peach text-ink" },
  won: { key: "notifyWon", icon: Trophy, tone: "bg-lime text-ink" },
  lost: { key: "notifyLost", icon: CircleSlash, tone: "bg-secondary text-muted-foreground" },
  endingSoon: { key: "notifyEndingSoon", icon: Clock, tone: "bg-lilac text-ink" },
  newItems: { key: "notifyNewItem", icon: Sparkles, tone: "bg-lilac text-ink" },
} as const;

/** Where a notification goes: its item, or the Items page for a roll-up of several new items. */
const hrefFor = (n: NotificationRow) => (n.lot === null ? "/items" : `/lot/${n.lot}`);
/** Wording key: a roll-up of several new items uses the plural line. */
const keyFor = (n: NotificationRow) => (n.type === "newItems" && n.lot === null ? "notifyNewItems" : (KIND[n.type] ?? KIND.outbid).key);

/**
 * Header bell: unread count + a dropdown of the newest notifications (outbid, won, didn't win). Each opens its item and
 * is marked read. Wording comes from the active theme. Refreshes every 30 s (while the tab is visible) and when opened.
 */
export function NotificationBell({ initial }: { initial: Feed }) {
  const t = useCopy();
  const [feed, setFeed] = useState<Feed>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) setFeed(await res.json());
    } catch { /* offline for a moment; try again next time */ }
  }, []);

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markRead = (id?: string) => {
    setFeed((f) => ({
      unread: id ? Math.max(0, f.unread - (f.items.find((n) => n.id === id && !n.read) ? 1 : 0)) : 0,
      items: f.items.map((n) => (!id || n.id === id ? { ...n, read: true } : n)),
    }));
    void markNotificationsReadAction(id);
  };

  const count = feed.unread > 9 ? "9+" : String(feed.unread);
  return (
    <DropdownMenu onOpenChange={(open) => { if (open) void refresh(); }}>
      <DropdownMenuTrigger
        aria-label={feed.unread ? `${t("notifyHeading")}: ${feed.unread} unread` : t("notifyHeading")}
        className="relative grid size-10 place-items-center rounded-full bg-white outline-none transition-colors hover:bg-white/70 focus-visible:ring-3 focus-visible:ring-ring/50">
        <Bell className="size-[18px]" />
        {feed.unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-white ring-2 ring-canvas">
            {count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-extrabold text-ink">{t("notifyHeading")}</DropdownMenuLabel>
          {feed.unread > 0 && (
            <button type="button" onClick={() => markRead()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-ink">
              <CheckCheck className="size-3.5" /> {t("notifyMarkAll")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-96 overflow-y-auto p-1.5">
          {feed.items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("notifyEmpty")}</p>
          ) : (
            feed.items.map((n) => {
              const k = KIND[n.type] ?? KIND.outbid;
              return (
                <DropdownMenuItem key={n.id} asChild className="items-start gap-3 rounded-md px-2.5 py-2.5">
                  <Link href={hrefFor(n)} onClick={() => !n.read && markRead(n.id)}>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", k.tone)}><k.icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm leading-snug [overflow-wrap:anywhere]", n.read ? "text-muted-foreground" : "font-semibold text-ink")}>
                        {t(keyFor(n), {
                          lot: n.lot ?? "", title: n.title, titles: n.title, count: n.count ?? 1, amount: n.amount === null ? "" : money(n.amount),
                        })}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground" suppressHydrationWarning>{timeAgo(new Date(n.createdAt))}</span>
                    </span>
                    {!n.read && <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive" />}
                  </Link>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="m-1.5 justify-center rounded-md text-sm font-semibold">
          <Link href="/bids"><Wallet className="size-4" /> My Bids</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
