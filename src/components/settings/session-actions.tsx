"use client";

import { useConfirm } from "@/components/confirm-dialog";
import { LogOut, MonitorX } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeOtherSessionsAction, revokeSessionAction, signOutAllDevicesAction } from "@/app/settings/actions";

export function RevokeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => revokeSessionAction(id))}>
      <LogOut /> {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}

export function RevokeOthersButton() {
  const [pending, start] = useTransition();
  const [ask, confirmDialog] = useConfirm();
  return (
    <>
      <Button variant="outline" disabled={pending}
        onClick={async () => {
          if (await ask({ title: "Sign out all other devices?", description: "Everywhere else you're signed in will need to sign in again. This device stays signed in.", confirmLabel: "Sign out others" })) start(() => revokeOtherSessionsAction());
        }}>
        <MonitorX /> {pending ? "Working…" : "Sign out all other devices"}
      </Button>
      {confirmDialog}
    </>
  );
}

export function SignOutAllButton() {
  const [pending, start] = useTransition();
  const [ask, confirmDialog] = useConfirm();
  return (
    <>
      <Button variant="destructive" disabled={pending}
        onClick={async () => {
          if (await ask({ title: "Sign out of every device?", description: "Including this one. You'll need to sign in again everywhere.", confirmLabel: "Sign out everywhere" })) start(() => signOutAllDevicesAction());
        }}>
        <LogOut /> {pending ? "Signing out…" : "Sign out all devices"}
      </Button>
      {confirmDialog}
    </>
  );
}
