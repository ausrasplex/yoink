"use client";

import { KeyRound } from "lucide-react";
import { useActionState, useId } from "react";
import { FormActions } from "@/components/form-actions";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/app/actions";

export function PasswordCard({ head, updated }: { head: SectionHead; updated: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const id = useId();
  const a = { form: id, pending, label: "Update password", icon: <KeyRound /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} className="space-y-4">
      <input type="hidden" name="from" value="settings" />
      <div className="space-y-2">
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new">New password</Label>
          <Input id="new" name="new" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </div>
      </div>
      {state?.error && <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>}
      {updated && !state?.error && <p className="text-sm font-semibold text-green-700">Password updated. Other devices were signed out.</p>}
      <FormActions where="footer" {...a} />
    </form>
    </SectionCard>
  );
}
