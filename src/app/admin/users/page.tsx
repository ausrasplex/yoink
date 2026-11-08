import { UserPlus, Pencil, Lock, KeyRound, Users } from "lucide-react";
import { IconLink } from "@/components/icon-action";
import { AddUserForm } from "@/components/admin/user-forms";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { FilterTable, type FilterRow } from "@/components/filter-table";
import { getAuction } from "@/lib/auction";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const [users, auction] = await Promise.all([
    db.user.findMany({ where: { role: "USER" }, orderBy: { name: "asc" }, include: { _count: { select: { bids: true } } } }),
    getAuction(),
  ]);
  const locks = await db.loginAttempt.findMany({
    where: { key: { in: users.map((u) => `email:${u.email}`) }, lockedUntil: { gt: new Date() } },
    select: { key: true },
  });
  const locked = new Set(locks.map((l) => l.key));

  const rows: FilterRow[] = users.map((u) => {
    const isLocked = locked.has(`email:${u.email}`);
    return {
      id: u.id,
      values: {
        user: `${u.name} ${u.email}`, shift: u.shift ?? "",
        status: isLocked ? "Locked" : u.mustChangePassword ? "Temp password" : "OK",
        bids: u._count.bids,
      },
      cells: {
        user: (
          <div className="flex items-center gap-3">
            <UserAvatar name={u.name} avatar={u.avatar} className="size-10" textClassName="text-xs" />
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{u.name}</p>
              <p className="max-w-56 truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        ),
        shift: u.shift ?? <span className="text-muted-foreground">—</span>,
        status: (
          <span className="space-x-1 whitespace-nowrap">
            {isLocked && <Badge variant="destructive"><Lock /> Locked</Badge>}
            {u.mustChangePassword && <Badge variant="peach"><KeyRound /> Temp password</Badge>}
          </span>
        ),
        bids: <span className="tabular-nums">{u._count.bids}</span>,
        actions: <IconLink href={`/admin/users/${u.id}`} label={`Manage ${u.name}`}><Pencil /></IconLink>,
      },
    };
  });

  return (
    <AppShell user={me}>
      <PageTitle icon={<Users />} sub={`${users.length} account${users.length === 1 ? "" : "s"}. Bidder accounts. Admins are invited by the server admin.`}>Users</PageTitle>

      <div className="mb-8">
        <AddUserForm
          head={{
            icon: <UserPlus className="size-5" />,
            title: "Add a user",
            desc: auction.registrationOpen
              ? "Guests can also register themselves (change this under Settings)."
              : "Self-registration is off, so this is the only way to create accounts.",
          }}
        />
      </div>

      <div className="rounded-3xl bg-white p-3">
        <FilterTable
          label="Users"
          rows={rows}
          columns={[
            { id: "user", header: "User" },
            { id: "shift", header: "Shift" },
            { id: "status", header: "Status", options: ["Locked", "Temp password", "OK"] },
            { id: "bids", header: "Bids", align: "right" },
            { id: "actions", header: "", align: "right" },
          ]}
          empty="No users yet."
        />
      </div>
    </AppShell>
  );
}
