"use client";

import { Server } from "lucide-react";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setupAction } from "@/app/setup/actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create the server admin</CardTitle>
        <CardDescription>
          This is the first account on this server. It looks after the server (name, logo, email) and invites the admins who run the auction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" autoComplete="name" defaultValue={state?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
          <Button type="submit" className="w-full" disabled={pending}><Server /> {pending ? "Creating…" : "Create server admin"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
