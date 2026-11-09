"use client";

import Link from "next/link";
import { Download, LogOut, Search } from "lucide-react";
import { useInstallMode } from "@/components/install/install-ui";
import { startInstall } from "@/components/install/install-store";
import { BrandLockup } from "@/components/brand-mark";
import { adminItems } from "@/components/shell/nav";
import { NotificationBell } from "@/components/shell/notification-bell";
import type { NotificationRow } from "@/lib/notifications";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/actions";
import type { Role } from "@/lib/format";

export function Brand({ name, logo, logoWide, center = false }: { name: string; logo: string | null; logoWide: string | null; center?: boolean }) {
  return (
    <Link href="/" className={`flex min-w-0 items-center font-extrabold tracking-tight text-ink ${center ? "justify-center" : ""}`}>
      <BrandLockup name={name} logo={logo} logoWide={logoWide} nameClassName="text-base" center={center} />
    </Link>
  );
}

export function TopBar(p: {
  brand: string; logo: string | null; logoWide: string | null; name: string; email: string; avatar: string | null; role: Role;
  notifications: { unread: number; items: NotificationRow[] } | null; // bidders only
}) {
  const installMode = useInstallMode();
  const bidder = p.role !== "SERVER_ADMIN"; // the server admin has no items to search or bids to watch
  return (
    // AppShell makes this sticky (full-width strip: semi-opaque, blurred, line underneath).
    <header className="flex items-center gap-3 px-4 py-3 lg:px-10 lg:py-4">
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
          {/* Phones: same size as the notifications panel (1.5rem in from each edge); from sm up, a 15rem menu. */}
          <DropdownMenuContent align="end" collisionPadding={24} className="w-[calc(100vw-3rem)] sm:w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-bold">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.email}</p>
            </DropdownMenuLabel>
            {/* Desktop: pages live in the sidebar, so this menu only logs out. Phones/tablets: the bottom bar keeps the
                everyday pages and the admin pages live here (lg:hidden). */}
            {p.role === "ADMIN" && (
              <div className="lg:hidden">
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Admin</DropdownMenuLabel>
                {adminItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild className="gap-3 py-2.5">
                    <Link href={item.href}><item.icon className="size-4" /> {item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
            <DropdownMenuSeparator />
            {/* Phones/tablets that can install it and aren't in the installed app already */}
            {installMode && (
              <DropdownMenuItem className="gap-3 py-2.5" onSelect={() => { void startInstall(); }}>
                <Download className="size-4" /> Install app
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild className="py-2.5">
              <form action={logoutAction}>
                <button type="submit" className="flex w-full items-center gap-3"><LogOut className="size-4" /> Log out</button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
