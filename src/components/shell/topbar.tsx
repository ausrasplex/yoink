"use client";

import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { BrandLockup } from "@/components/brand-mark";
import { NotificationBell } from "@/components/shell/notification-bell";
import type { NotificationRow } from "@/lib/notifications";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/actions";
import type { Role } from "@/lib/format";

export function Brand({ name, logo, logoWide }: { name: string; logo: string | null; logoWide: string | null }) {
  return (
    <Link href="/" className="flex min-w-0 items-center font-extrabold tracking-tight text-ink">
      <BrandLockup name={name} logo={logo} logoWide={logoWide} nameClassName="text-base" />
    </Link>
  );
}

export function TopBar(p: {
  brand: string; logo: string | null; logoWide: string | null; name: string; email: string; avatar: string | null; role: Role;
  notifications: { unread: number; items: NotificationRow[] } | null; // bidders only
}) {
  const bidder = p.role !== "SERVER_ADMIN"; // the server admin has no items to search or bids to watch
  return (
    <header className="flex items-center gap-3 px-4 py-4 lg:px-10 lg:py-6">
      <div className="min-w-0 lg:hidden"><Brand name={p.brand} logo={p.logo} logoWide={p.logoWide} /></div>
      {bidder && <form action="/items" method="get" role="search" className="relative ml-auto hidden max-w-sm flex-1 sm:block lg:ml-0">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          type="search"
          placeholder="Search items or lot number…"
          aria-label="Search items"
          className="h-11 w-full rounded-xl border border-transparent bg-white pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </form>}
      <div className="ml-auto flex items-center gap-2">
        {bidder && <>
        <Link href="/items" aria-label="Search" className="grid size-10 place-items-center rounded-full bg-white sm:hidden">
          <Search className="size-[18px]" />
        </Link>
        {p.notifications && <NotificationBell initial={p.notifications} />}
        </>}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Account menu">
            <UserAvatar name={p.name} avatar={p.avatar} className="size-10" textClassName="text-sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-bold">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.email}</p>
            </DropdownMenuLabel>
            {/* Pages live in the sidebar / bottom nav; the account menu only signs out. */}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logoutAction}>
                <button type="submit" className="flex w-full items-center gap-2"><LogOut className="size-4" /> Log out</button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
