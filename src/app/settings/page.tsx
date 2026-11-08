import { KeyRound, Monitor, MonitorSmartphone, Smartphone, UserRound, CircleUser, Mail } from "lucide-react";
import { RevokeButton, RevokeOthersButton, SignOutAllButton } from "@/components/settings/session-actions";
import { ProfileForm } from "@/components/settings/profile-form";
import { AvatarPicker } from "@/components/settings/avatar-picker";
import { DigestToggle } from "@/components/settings/digest-toggle";
import { emailStatus } from "@/lib/mail";
import { SectionCard } from "@/components/section-card";
import { PasswordCard } from "@/components/settings/password-card";
import { RoleBadge } from "@/components/role-badge";
import { Badge } from "@/components/ui/badge";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { describeDevice, timeAgo } from "@/lib/devices";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const session = await requireUser("/settings");
  const { updated } = await searchParams;
  const [user, sessions] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: session.id } }),
    db.session.findMany({ where: { userId: session.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
  ]);
  const others = sessions.filter((s) => s.id !== session.sessionId);
  const digestReady = await emailStatus("newItems");

  const profileHead = { icon: <UserRound className="size-5" />, title: "Profile" };
  const profileIntro = (
    <div className="flex items-start gap-4">
      <AvatarPicker name={user.name} avatar={user.avatar} />
      <div className="min-w-0 pt-3">
        <p className="flex flex-wrap items-center gap-2 text-lg font-extrabold text-ink">
          {user.name}
          <RoleBadge role={user.role} />
        </p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        {user.shift && <p className="text-sm text-muted-foreground">Shift: {user.shift}</p>}
      </div>
    </div>
  );

  return (
    <AppShell user={session}>
      <PageTitle icon={<CircleUser />} sub="Your profile, password, emails and signed-in devices.">Account</PageTitle>
      <div className="grid grid-cols-1 gap-6">
        {/* Only the server admin edits their own details; everyone else asks an organiser. */}
        {user.role === "SERVER_ADMIN" ? (
          <ProfileForm head={profileHead} intro={profileIntro} name={user.name} email={user.email} />
        ) : (
          <SectionCard {...profileHead}>
            {profileIntro}
            <p className="mt-4 text-xs text-muted-foreground">To change your name, email or shift, ask an organiser.</p>
          </SectionCard>
        )}

        {user.role === "USER" && (
          <SectionCard icon={<Mail className="size-5" />} title="Emails">
            <DigestToggle on={user.emailDigest} available={digestReady === "ready"} />
          </SectionCard>
        )}

        <PasswordCard head={{ icon: <KeyRound className="size-5" />, title: "Password", desc: "Changing it signs you out everywhere else." }} updated={updated === "1"} />

        <SectionCard
          icon={<MonitorSmartphone className="size-5" />}
          title="Where you're signed in"
          desc="Devices that currently have access to your account. Sign out any you don't recognise."
          action={
            <div className="flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap">
              <SignOutAllButton />
              {others.length > 0 && <RevokeOthersButton />}
            </div>
          }
        >
          <ul className="divide-y divide-border">
            {sessions.map((s) => {
              const d = describeDevice(s.userAgent);
              const current = s.id === session.sessionId;
              const Icon = d.mobile ? Smartphone : Monitor;
              return (
                <li key={s.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${current ? "bg-lime" : "bg-secondary"}`}><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                      {d.label}
                      {current && <Badge variant="lime"><Monitor /> This device</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {s.ip && s.ip !== "unknown" ? `${s.ip} · ` : ""}
                      {current ? "Active now" : `Active ${timeAgo(s.lastSeenAt)}`} · signed in {s.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {!current && <RevokeButton id={s.id} />}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
