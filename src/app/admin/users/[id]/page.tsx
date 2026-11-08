import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { EditUserForm } from "@/components/admin/user-forms";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const user = await db.user.findUnique({
    where: { id: (await params).id },
    include: { _count: { select: { bids: true, sessions: true } } },
  });
  if (!user || user.role !== "USER") notFound(); // admins are managed by the server admin
  const lock = await db.loginAttempt.findFirst({ where: { key: `email:${user.email}`, lockedUntil: { gt: new Date() } } });

  return (
    <AppShell user={me}>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> Users
      </Link>
      <PageTitle icon={<UserRound />} sub={`${user._count.bids} bids · signed in on ${user._count.sessions} device${user._count.sessions === 1 ? "" : "s"}`}>{user.name}</PageTitle>
      <div className="rounded-3xl bg-white p-6">
        <EditUserForm
          user={{ id: user.id, name: user.name, email: user.email, shift: user.shift, role: user.role, mustChangePassword: user.mustChangePassword }}
          locked={!!lock}
          hasBids={user._count.bids > 0}
          sessions={user._count.sessions}
        />
      </div>
    </AppShell>
  );
}
