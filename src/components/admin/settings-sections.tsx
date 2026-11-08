"use client";

import { useActionState, useId, useState } from "react";
import { FormActions } from "@/components/form-actions";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  saveAccessAction, saveNotificationsAction, saveTermsAction, type SettingsState,
} from "@/app/admin/settings-actions";

export function Status({ state }: { state: SettingsState }) {
  if (state?.error) return <span className="min-w-0 text-sm text-destructive [overflow-wrap:anywhere]">{state.error}</span>;
  if (state?.saved) return <span className="text-sm text-green-700">Saved</span>;
  if (state?.message) return <span className="min-w-0 text-sm text-green-700 [overflow-wrap:anywhere]">{state.message}</span>;
  return null;
}

export function Check({ name, defaultChecked, label, hint }: { name: string; defaultChecked: boolean; label: string; hint?: string }) {
  const id = `sw-${name}`;
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} name={name} defaultChecked={defaultChecked} className="mt-0.5" />
      <Label htmlFor={id} className="block text-sm font-medium leading-snug">
        {label}
        {hint && <span className="mt-0.5 block font-normal text-muted-foreground">{hint}</span>}
      </Label>
    </div>
  );
}

export function AccessForm(p: { head: SectionHead; registrationOpen: boolean; maxLoginAttempts: number; lockoutMinutes: number }) {
  const [state, action, pending] = useActionState(saveAccessAction, undefined);
  const id = useId();
  const a = { form: id, pending, status: <Status state={state} /> };
  return (
    <SectionCard {...p.head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} className="space-y-4">
      <Check
        name="registrationOpen"
        defaultChecked={p.registrationOpen}
        label="Allow guests to register themselves"
        hint="Turn off to make accounts admin-only (add people on the Users page)."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="maxLoginAttempts">Failed logins before lockout</Label>
          <Input id="maxLoginAttempts" name="maxLoginAttempts" type="number" min={1} max={50} defaultValue={p.maxLoginAttempts} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lockoutMinutes">Lockout length (minutes)</Label>
          <Input id="lockoutMinutes" name="lockoutMinutes" type="number" min={1} max={1440} defaultValue={p.lockoutMinutes} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Counted per email address, and per network address at five times this limit. The count resets after the same number of
        minutes, or on a successful sign-in. Admins can unlock someone early from the Users page.
      </p>
      <FormActions where="footer" {...a} />
    </form>
    </SectionCard>
  );
}

export function TermsForm({ head, terms }: { head: SectionHead; terms: string }) {
  const [state, action, pending] = useActionState(saveTermsAction, undefined);
  const id = useId();
  const a = { form: id, pending, status: <Status state={state} /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="terms">Shown on every item page</Label>
        <Textarea id="terms" name="terms" rows={6} defaultValue={terms} maxLength={10000}
          placeholder="e.g. All proceeds go to… Winners must collect and pay by… All sales are final." />
      </div>
      <FormActions where="footer" {...a} />
    </form>
    </SectionCard>
  );
}

/** Admin: the email master switch and each kind of email. SMTP itself is the Server Admin's. */
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString("en-AU", { hour: "numeric" });

export function NotificationsForm({ head, emailEnabled, notifyOutbid, emailPasswordReset, emailNewItems, digestHour, mailReady }: {
  head: SectionHead; emailEnabled: boolean; notifyOutbid: boolean; emailPasswordReset: boolean;
  emailNewItems: boolean; digestHour: number; mailReady: boolean;
}) {
  const [state, action, pending] = useActionState(saveNotificationsAction, undefined);
  const [master, setMaster] = useState(emailEnabled);
  const id = useId();
  const a = { form: id, pending, status: <Status state={state} /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} className="space-y-4">
      {!mailReady && (
        <p className="rounded-2xl bg-peach/60 px-4 py-3 text-sm text-ink">
          Email isn&apos;t set up on this server yet, so nothing will be sent. Ask the server admin to set up SMTP.
        </p>
      )}
      <div className="flex items-start gap-3">
        <Switch id="sw-emailEnabled" name="emailEnabled" checked={master} onCheckedChange={setMaster} className="mt-0.5" />
        <Label htmlFor="sw-emailEnabled" className="block text-sm font-medium leading-snug">
          Send emails
          <span className="mt-0.5 block font-normal text-muted-foreground">
            Turn off to stop every email from the app, including password resets and admin invites (the server admin then
            gets a link to share by hand).
          </span>
        </Label>
      </div>
      <fieldset disabled={!master} className="space-y-4 border-l-2 border-border pl-4 disabled:opacity-50">
        <legend className="sr-only">Which emails</legend>
        <Check name="notifyOutbid" defaultChecked={notifyOutbid} label="Outbid emails"
          hint="When someone outbids a person, with a link back to the item." />
        <Check name="emailPasswordReset" defaultChecked={emailPasswordReset} label="Password reset emails"
          hint={'Powers "Forgot password?" on the sign-in page. Off hides the link; people ask an admin to reset it instead.'} />
        <Check name="emailNewItems" defaultChecked={emailNewItems} label="Daily new items email"
          hint="One email a day to every user listing the items added since the last one (skipped when there's nothing new). Users can opt out in their settings." />
        <div className="flex flex-wrap items-center gap-2 pl-12">
          <Label htmlFor="digestHour" className="text-sm font-medium">Send at</Label>
          <Select name="digestHour" defaultValue={String(digestHour)}>
            <SelectTrigger id="digestHour" size="sm"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {Array.from({ length: 24 }, (_, h) => <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">venue time</span>
        </div>
      </fieldset>
      {/* A disabled fieldset doesn't submit its switches; keep their saved values when the master switch is off. */}
      {!master && notifyOutbid && <input type="hidden" name="notifyOutbid" value="on" />}
      {!master && emailPasswordReset && <input type="hidden" name="emailPasswordReset" value="on" />}
      {!master && emailNewItems && <input type="hidden" name="emailNewItems" value="on" />}
      {!master && <input type="hidden" name="digestHour" value={digestHour} />}
      <FormActions where="footer" {...a} />
    </form>
    </SectionCard>
  );
}
