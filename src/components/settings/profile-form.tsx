"use client";

import { useActionState, useId, useState } from "react";
import { FormActions } from "@/components/form-actions";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/app/settings/actions";

/** Server admin only: nobody else manages this account, so they edit their own name and email. */
/** intro: shown above the form inside the card (the avatar and role). */
export function ProfileForm({ head, intro, name, email }: { head: SectionHead; intro: React.ReactNode; name: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  const id = useId();
  const status = state?.error
    ? <span className="min-w-0 text-sm text-destructive [overflow-wrap:anywhere]">{state.error}</span>
    : state?.saved ? <span className="text-sm text-green-700">Saved</span> : null;
  const a = { form: id, pending, status };
  const saved = state?.saved ? state.email : email;
  const [typed, setTyped] = useState(email);
  const emailChanging = typed.trim().toLowerCase() !== saved;
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    {intro}
    <form id={id} action={action} className="mt-6 space-y-4 border-t pt-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input id="profile-name" name="name" defaultValue={state?.name ?? name} required maxLength={80} autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" name="email" type="email" defaultValue={state?.email ?? email} required autoComplete="email"
            onChange={(e) => setTyped(e.target.value)} />
        </div>
      </div>
      {emailChanging && (
        <div className="space-y-2">
          <Label htmlFor="profile-password">Current password <span className="font-normal text-muted-foreground">(needed to change your email)</span></Label>
          <Input id="profile-password" name="password" type="password" autoComplete="current-password" required />
        </div>
      )}
      <FormActions where="footer" {...a} />
    </form>
    </SectionCard>
  );
}
