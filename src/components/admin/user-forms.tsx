"use client";

import { useConfirm } from "@/components/confirm-dialog";
import { KeyRound, LockOpen, MonitorX, Save, Trash2, UserPlus } from "lucide-react";
import { useActionState, useId, useState, useTransition } from "react";
import { FormActions } from "@/components/form-actions";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createUserAction, deleteUserAction, resetPasswordAction, signOutEverywhereAction, unlockUserAction, updateUserAction,
  type UserState,
} from "@/app/admin/user-actions";

export function TempPassword({ email, password }: { email: string; password: string }) {
  return (
    <Alert>
      <AlertTitle>Temporary password for {email}</AlertTitle>
      <AlertDescription>
        <code className="select-all rounded bg-muted px-2 py-1 font-mono text-base">{password}</code>
        <span className="mt-2 block">
          Copy it now. It won&apos;t be shown again. They&apos;ll be asked to choose their own password when they sign in.
        </span>
      </AlertDescription>
    </Alert>
  );
}

/** roleChoice: the server admin editing an admin can turn them back into a user (removing admin access). */
function Fields({ u, roleChoice = false }: { u?: { name: string; email: string; shift: string | null; role: string }; roleChoice?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={u?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={u?.email} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shift">Shift</Label>
        <Input id="shift" name="shift" defaultValue={u?.shift ?? ""} maxLength={60} />
      </div>
      {roleChoice && (
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select name="role" defaultValue={u?.role ?? "ADMIN"}>
            <SelectTrigger id="role" className="h-11 w-full rounded-xl bg-white"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">User (remove admin access)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export function AddUserForm({ head }: { head: SectionHead }) {
  const [state, action, pending] = useActionState(createUserAction, undefined);
  const id = useId();
  const a = { form: id, pending, label: "Add user", pendingLabel: "Adding…", icon: <UserPlus /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} key={state?.tempPassword} className="space-y-4">
      <Fields />
      <div className="space-y-2">
        <Label htmlFor="password">Password <span className="text-muted-foreground">(leave blank to generate one)</span></Label>
        <Input id="password" name="password" type="text" autoComplete="off" minLength={8} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.tempPassword && state.email && <TempPassword email={state.email} password={state.tempPassword} />}
      <FormActions where="footer" {...a} />
    </form>
    </SectionCard>
  );
}

export function EditUserForm({
  user, locked, hasBids, sessions, roleChoice = false,
}: {
  user: { id: string; name: string; email: string; shift: string | null; role: string; mustChangePassword: boolean };
  locked: boolean; hasBids: boolean; sessions: number; roleChoice?: boolean;
}) {
  const [state, action, pending] = useActionState(updateUserAction.bind(null, user.id), undefined);
  const [reset, setReset] = useState<UserState>();
  const [note, setNote] = useState<string>();
  const [busy, start] = useTransition();
  const [ask, confirmDialog] = useConfirm();

  return (
    <div className="space-y-6">
      {confirmDialog}
      <form action={action} className="space-y-4">
        <Fields u={user} roleChoice={roleChoice} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}><Save /> {pending ? "Saving…" : "Save changes"}</Button>
          {state?.saved && <span className="text-sm text-green-700">Saved</span>}
          {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
        </div>
      </form>

      <div className="space-y-3 border-t pt-4">
        <h2 className="font-medium">Password &amp; access</h2>
        {user.mustChangePassword && (
          <p className="text-sm text-muted-foreground">Hasn&apos;t replaced their temporary password yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy}
            onClick={async () => {
              if (!(await ask({ title: `Reset ${user.name}'s password?`, description: "They get a temporary password and are signed out on every device.", confirmLabel: "Reset password" }))) return;
              start(async () => { setNote(undefined); setReset(await resetPasswordAction(user.id)); });
            }}>
            <KeyRound /> Reset password
          </Button>
          <Button variant="outline" disabled={busy || sessions === 0}
            onClick={() => start(async () => { const r = await signOutEverywhereAction(user.id); setNote(r?.message ?? r?.error); })}>
            <MonitorX /> Sign out of all devices{sessions > 0 ? ` (${sessions})` : ""}
          </Button>
          {locked && (
            <Button variant="outline" disabled={busy}
              onClick={() => start(async () => { const r = await unlockUserAction(user.id); setNote(r?.message ?? r?.error); })}>
              <LockOpen /> Unlock account
            </Button>
          )}
        </div>
        {reset?.tempPassword && reset.email && <TempPassword email={reset.email} password={reset.tempPassword} />}
        {reset?.error && <p className="text-sm text-destructive">{reset.error}</p>}
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>

      <div className="space-y-2 border-t pt-4">
        <Button variant="destructive" disabled={busy || hasBids}
          onClick={async () => {
            if (await ask({ title: `Delete ${user.name}?`, description: "Their account is removed and they're signed out. This can't be undone.", confirmLabel: "Delete account" })) {
              start(async () => { const r = await deleteUserAction(user.id); if (r?.error) setNote(r.error); });
            }
          }}>
          <Trash2 /> Delete account
        </Button>
        {hasBids && <p className="text-sm text-muted-foreground">Accounts that have placed bids can&apos;t be deleted.</p>}
      </div>
    </div>
  );
}
