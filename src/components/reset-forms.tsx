"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestResetAction, resetPasswordAction } from "@/app/reset-actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestResetAction, undefined);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a link to choose a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          {state?.sent ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  If an account exists for that address, a reset link is on its way. It expires in 1 hour.
                </AlertDescription>
              </Alert>
              <Link href="/login" className="block text-center text-sm underline underline-offset-4">Back to sign in</Link>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
              <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
              <Link href="/login" className="block text-center text-sm text-muted-foreground underline underline-offset-4">Back to sign in</Link>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, token), undefined);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>You&apos;ll be signed in once it&apos;s saved.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input id="new" name="new" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {state.error}{" "}
                  {state.error.includes("Request a new one") && (
                    <Link href="/forgot-password" className="underline underline-offset-4">Request a new link</Link>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save password"}</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
