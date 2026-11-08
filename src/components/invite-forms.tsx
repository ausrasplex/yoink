"use client";

import { MailPlus, Trash2 } from "lucide-react";
import { useActionState, useId, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { FormActions } from "@/components/form-actions";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInviteAction, revokeInviteAction } from "@/app/server/admin-actions";
import { acceptInviteAction } from "@/app/invite/[token]/actions";

/** children: shown under the form inside the same card (the pending invites list). */
export function InviteAdminForm({ head, mailReady, children }: { head: SectionHead; mailReady: boolean; children?: React.ReactNode }) {
  const [state, action, pending] = useActionState(createInviteAction, undefined);
  const id = useId();
  const a = { form: id, pending, label: "Invite admin", pendingLabel: "Inviting…", icon: <MailPlus /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} key={state?.link ?? state?.promoted} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" name="name" required maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" required />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.promoted && <p className="text-sm text-green-700">{state.promoted}</p>}
      {state?.link && (
        <Alert>
          <AlertTitle>
            {state.emailed ? `Invite emailed to ${state.email}` : `Invite created for ${state.email}`}
          </AlertTitle>
          <AlertDescription>
            {!state.emailed && (
              <span className="mb-2 block">
                {mailReady ? `The email couldn't be sent (${state.mailError}). ` : `No email was sent (${state.mailError ?? "email isn't available"}). `}
                Send them this link yourself:
              </span>
            )}
            <code className="block select-all break-all rounded bg-muted px-2 py-1 font-mono text-xs">{state.link}</code>
            <span className="mt-2 block">It works once and expires in 7 days. Copy it now; it won&apos;t be shown again.</span>
            {state.linkWarning && <span className="mt-2 block font-semibold text-destructive">{state.linkWarning}</span>}
          </AlertDescription>
        </Alert>
      )}
      <FormActions where="footer" {...a} />
    </form>
    {children}
    </SectionCard>
  );
}

export function RevokeInviteButton({ id, email }: { id: string; email: string }) {
  const [busy, start] = useTransition();
  const [ask, confirmDialog] = useConfirm();
  return (
    <>
      <Button
        variant="ghost" size="icon" aria-label={`Cancel invite for ${email}`} title="Cancel invite" disabled={busy}
        onClick={async () => {
          if (await ask({ title: "Cancel this invite?", description: `The link sent to ${email} will stop working.`, confirmLabel: "Cancel invite" })) start(() => revokeInviteAction(id));
        }}
      >
        <Trash2 />
      </Button>
      {confirmDialog}
    </>
  );
}

export function AcceptInviteForm({ token, email, name }: { token: string; email: string; name: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction.bind(null, token), undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>You&apos;re invited to be an admin</CardTitle>
        <CardDescription>Choose a password to finish setting up your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly disabled autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={state?.name ?? name} autoComplete="name" required maxLength={80} />
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
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Create admin account"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
