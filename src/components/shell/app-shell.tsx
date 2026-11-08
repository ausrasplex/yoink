import type { Role } from "@/lib/format";
import { listNotifications } from "@/lib/notifications";
import { getShellInfo } from "@/lib/user-data";
import { MobileNav, SidebarNav } from "./nav";
import { Brand, TopBar } from "./topbar";

type ShellUser = { id: string; name: string; email: string; role: Role; avatar?: string | null };

export async function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const [info, notifications] = await Promise.all([
    getShellInfo(user.id),
    user.role === "SERVER_ADMIN" ? null : listNotifications(user.id), // the server admin doesn't bid
  ]);
  return (
    // Full-width frame: the sidebar sits on the left edge; the top bar and page share one centred content container.
    <div className="min-h-dvh w-full lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/70 px-6 py-8 lg:flex">
        <div className="mb-10"><Brand name={info.name} logo={info.logo} logoWide={info.logoWide} /></div>
        <div className="flex-1 overflow-y-auto"><SidebarNav role={user.role} /></div>
      </aside>
      {/* overflow-x-clip: if anything is ever too wide, clip it here instead of widening the whole page on phones
          (a wider page also drags the fixed bottom nav off-screen) */}
      <div className="min-w-0 flex-1 overflow-x-clip">
        <div className="mx-auto w-full max-w-7xl">
          <TopBar brand={info.name} logo={info.logo} logoWide={info.logoWide} name={user.name} email={user.email} avatar={user.avatar ?? null} role={user.role} notifications={notifications} />
          <main className="px-4 pb-28 pt-2 lg:px-10 lg:pb-12">{children}</main>
        </div>
      </div>
      <MobileNav role={user.role} alert={info.outbid > 0} />
    </div>
  );
}

/** Page heading. `icon`: the page's Lucide icon (match its menu item), shown on the left. */
export function PageTitle({ children, sub, action, icon }: { children: React.ReactNode; sub?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink [&>svg]:size-6 [&>svg]:shrink-0">{icon}{children}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
