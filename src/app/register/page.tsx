import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth-form";
import { getUser, hasServerAdmin, safeNext } from "@/lib/auth";
import { getAuction } from "@/lib/auction";
import { registerAction } from "@/app/actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (!(await hasServerAdmin())) redirect("/setup"); // new install: the server admin is created first
  if (await getUser()) redirect(next);
  const auction = await getAuction();
  if (!auction.registrationOpen) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>{auction.name}</CardTitle>
            <CardDescription>
              Online registration is closed. Please ask an organiser to create your account, then{" "}
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline underline-offset-4">sign in</Link>.
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }
  return (
    <AuthShell>
      <AuthForm
        mode="register"
        action={registerAction}
        next={next}
        needsAccessCode={!!process.env.ACCESS_CODE}
        auctionName={auction.name}
      />
    </AuthShell>
  );
}
