"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes, Gavel, History, LayoutGrid, QrCode, Server, CircleUser, SlidersHorizontal, UserRoundStar, Users, Wallet, type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Item = { href: string; label: string; icon: LucideIcon; match?: (p: string) => boolean };

const userItems: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutGrid, match: (p) => p === "/" },
  { href: "/items", label: "Items", icon: Gavel, match: (p) => p.startsWith("/items") || p.startsWith("/lot") },
  { href: "/bids", label: "My Bids", icon: Wallet },
  { href: "/settings", label: "Account", icon: CircleUser },
];

/** Admin pages: the desktop sidebar's ADMIN group, and on phones/tablets the profile menu (see TopBar). */
export const adminItems: Item[] = [
  { href: "/admin", label: "Manage Items", icon: Boxes, match: (p) => p === "/admin" || p.startsWith("/admin/items") },
  { href: "/admin/history", label: "Bid History", icon: History },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/qr", label: "QR Codes", icon: QrCode },
  { href: "/admin/settings", label: "Settings", icon: SlidersHorizontal },
];

/** The everyday menu; without the Items page when this person can't browse (Users, with the Admins' switch off). */
const everyday = (browse: boolean) => (browse ? userItems : userItems.filter((i) => i.href !== "/items"));

const isActive = (item: Item, path: string) => (item.match ? item.match(path) : path.startsWith(item.href));

function Group({ items, path }: { items: Item[]; path: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isActive(item, path);
        return (
          <li key={item.href} className="relative">
            {active && <span className="absolute -left-6 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-ink" />}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active ? "font-bold text-ink" : "font-medium text-muted-foreground hover:bg-white/70 hover:text-ink",
              )}
            >
              <item.icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// The server admin only looks after the app itself, so it gets its own short menu.
const serverItems: Item[] = [
  { href: "/server", label: "Server", icon: Server, match: (p) => p === "/server" },
  { href: "/server/admins", label: "Admins", icon: UserRoundStar },
  { href: "/settings", label: "Account", icon: CircleUser },
];

export function SidebarNav({ role, browse }: { role: Role; browse: boolean }) {
  const path = usePathname();
  if (role === "SERVER_ADMIN") {
    return <nav><Group items={serverItems} path={path} /></nav>;
  }
  return (
    <nav className="space-y-8">
      <Group items={everyday(browse)} path={path} />
      {role === "ADMIN" && (
        <div className="space-y-2">
          <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">Admin</p>
          <Group items={adminItems} path={path} />
        </div>
      )}
    </nav>
  );
}

export function MobileNav({ role, alert, browse }: { role: Role; alert: boolean; browse: boolean }) {
  const path = usePathname();
  // The bar keeps the everyday pages; Admins reach the admin pages from the profile menu (TopBar) on phones.
  const items = role === "SERVER_ADMIN" ? serverItems : everyday(browse);
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-full bg-ink p-1.5 shadow-lg lg:hidden" aria-label="Main">
      {/* p-1.5 on the bar + justify-between: the gap at each end matches the gap above and below the buttons */}
      <ul className="flex items-center justify-between">
        {items.map((item) => {
          const active = isActive(item, path);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors",
                  active ? "bg-lime px-4 text-ink" : "w-11 text-white/70",
                )}
              >
                <item.icon className="size-5" />
                {active && <span className="max-[359px]:sr-only">{item.label}</span>}
                {item.href === "/bids" && alert && !active && (
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-peach ring-2 ring-ink" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
