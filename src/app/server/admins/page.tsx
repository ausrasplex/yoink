import { Clock, KeyRound, Lock, MailPlus, Pencil, ShieldCheck, UserRoundStar } from "lucide-react";
import { IconLink } from "@/components/icon-action";
import { InviteAdminForm, RevokeInviteButton } from "@/components/invite-forms";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { FilterTable, type FilterRow } from "@/components/filter-table";
import { requireServerAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailStatus } from "@/lib/mail";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });

export default async function AdminsPage() {
  const me = await requireServerAdmin();
  const [admins, invites, mail] = await Promise.all([
    db.user.findMany({ where: { role: "ADMIN" }, orderBy: { name: "asc" } }),
    db.invite.findMany({ where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
    emailStatus("invite"),
  ]);
  const locks = await db.loginAttempt.findMany({
    where: { key: { in: admins.map((u) => `email:${u.email}`) }, lockedUntil: { gt: new Date() } },
    select: { key: true },
  });
  const locked = new Set(locks.map((l) => l.key));

  const rows: FilterRow[] = admins.map((u) => {
    const isLocked = locked.has(`email:${u.email}`);
    return {
      id: u.id,
      values: { admin: `${u.name} ${u.email}`, status: isLocked ? "Locked" : u.mustChangePassword ? "Temp password" : "OK" },
      cells: {
        admin: (
          <div className="flex items-center gap-3">
            <UserAvatar name={u.name} avatar={u.avatar} className="size-10" textClassName="text-xs" />
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{u.name}</p>
              <p className="max-w-56 truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
          </div>
        ),
        status: (
          <span className="space-x-1 whitespace-nowrap">
            <Badge variant="lilac"><ShieldCheck /> Admin</Badge>
            {isLocked && <Badge variant="destructive"><Lock /> Locked</Badge>}
            {u.mustChangePassword && <Badge variant="peach"><KeyRound /> Temp password</Badge>}
          </span>
        ),
        actions: <IconLink href={`/server/admins/${u.id}`} label={`Manage ${u.name}`}><Pencil /></IconLink>,
      },
    };
  });

  return (
    <AppShell user={me}>
      <PageTitle icon={<UserRoundStar />} sub={`${admins.length} admin${admins.length === 1 ? "" : "s"}. Admins run the auction: items, users, bids and QR codes.`}>Admins</PageTitle>
      <div className="grid grid-cols-1 gap-6">
        <InviteAdminForm
          mailReady={mail === "ready"}
          head={{
            icon: <MailPlus className="size-5" />,
            title: "Invite an admin",
            desc: mail === "ready"
              ? "They'll get an email with a link to choose their password."
              : mail === "off"
                ? "Admins have turned emails off, so you'll get a link to send them yourself."
                : "Email isn't set up yet, so you'll get a link to send them yourself. Set up SMTP on the Server page to email invites.",
          }}
        >
          {invites.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-2 text-sm font-bold text-ink">Pending invites</h3>
              <ul className="divide-y">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2">
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{i.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{i.email} · expires {fmt(i.expiresAt)}</p>
                    </div>
                    <RevokeInviteButton id={i.id} email={i.email} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </InviteAdminForm>

        <div className="rounded-3xl bg-white p-3">
          <FilterTable
            label="Admins"
            rows={rows}
            columns={[
              { id: "admin", header: "Admin" },
              { id: "status", header: "Status", options: ["Locked", "Temp password", "OK"] },
              { id: "actions", header: "", align: "right" },
            ]}
            empty="No admins yet. Invite someone above to start running the auction."
          />
        </div>
      </div>
    </AppShell>
  );
}
