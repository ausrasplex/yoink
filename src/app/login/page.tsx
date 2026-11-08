import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { getUser, hasServerAdmin, safeNext } from "@/lib/auth";
import { getAuction } from "@/lib/auction";
import { brandName } from "@/lib/format";
import { emailStatus } from "@/lib/mail";
import { loginAction } from "@/app/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (!(await hasServerAdmin())) redirect("/setup"); // new install: the server admin is created first
  if (await getUser()) redirect(next);
  const auction = await getAuction();
  return (
    <AuthShell>
      <AuthForm mode="login" action={loginAction} next={next} canReset={(await emailStatus("passwordReset")) === "ready"} brand={brandName(auction)} slogan={auction.appSlogan} />
    </AuthShell>
  );
}
