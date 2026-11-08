import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/reset-forms";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sha256 } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer" }; // keep the token out of Referer headers

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reset = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!reset || reset.expiresAt < new Date()) {
    return (
      <AuthShell>
        <Card>
          <CardHeader>
            <CardTitle>Link expired</CardTitle>
            <CardDescription>
              This reset link has expired or was already used.{" "}
              <Link href="/forgot-password" className="underline underline-offset-4">Request a new one</Link>.
            </CardDescription>
          </CardHeader>
        </Card>
      </AuthShell>
    );
  }
  return <AuthShell><ResetForm token={token} /></AuthShell>;
}
