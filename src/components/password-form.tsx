"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/app/actions";

export function PasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{forced ? "Choose a new password" : "Change password"}</CardTitle>
          <CardDescription>
            {forced
              ? "You're using a temporary password. Set your own to continue."
              : "You'll be signed out on any other devices."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">{forced ? "Temporary password" : "Current password"}</Label>
              <Input id="current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input id="new" name="new" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {state?.error && (
              <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving…" : "Save password"}
            </Button>
            {!forced && (
              <p className="text-center text-sm">
                <Link href="/" className="text-muted-foreground underline underline-offset-4">Cancel</Link>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </>
  );
}
