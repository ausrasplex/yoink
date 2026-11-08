import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRoundStar } from "lucide-react";
import { EditUserForm } from "@/components/admin/user-forms";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { requireServerAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireServerAdmin();
  const user = await db.user.findUnique({
    where: { id: (await params).id },
    include: { _count: { select: { bids: true, sessions: true } } },
  });
  if (!user || user.role !== "ADMIN") notFound();
  const lock = await db.loginAttempt.findFirst({ where: { key: `email:${user.email}`, lockedUntil: { gt: new Date() } } });

  return (
    <AppShell user={me}>
      <Link href="/server/admins" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> Admins
      </Link>
      <PageTitle icon={<UserRoundStar />} sub={`Signed in on ${user._count.sessions} device${user._count.sessions === 1 ? "" : "s"}`}>{user.name}</PageTitle>
      <div className="rounded-3xl bg-white p-6">
        <EditUserForm
          user={{ id: user.id, name: user.name, email: user.email, shift: user.shift, role: user.role, mustChangePassword: user.mustChangePassword }}
          locked={!!lock}
          hasBids={user._count.bids > 0}
          sessions={user._count.sessions}
          roleChoice
        />
      </div>
    </AppShell>
  );
}
