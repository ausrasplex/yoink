import { AuthShell } from "@/components/auth-shell";
import { AcceptInviteForm } from "@/components/invite-forms";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sha256 } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer" }; // keep the token out of Referer headers

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.invite.findUnique({ where: { tokenHash: sha256(token) } });
  if (!invite || invite.expiresAt < new Date()) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Invite expired</CardTitle>
            <CardDescription>This invite has expired or was already used. Ask the server admin to send a new one.</CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }
  return <AuthShell><AcceptInviteForm token={token} email={invite.email} name={invite.name} /></AuthShell>;
}
