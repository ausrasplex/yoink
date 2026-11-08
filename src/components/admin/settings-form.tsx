"use client";

import { useActionState, useId } from "react";
import { FormActions } from "@/components/form-actions";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettingsAction } from "@/app/admin/actions";

/** The auction's name. (Bidding windows are set per item, on each item's page.) */
export function SettingsForm({ head, name }: { head: SectionHead; name: string }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  const id = useId();
  const status = state?.error
    ? <span className="min-w-0 text-sm text-destructive [overflow-wrap:anywhere]">{state.error}</span>
    : state?.saved ? <span className="text-sm text-green-700">Saved</span> : null;
  const a = { form: id, pending, label: "Save settings", status };

  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Auction name</Label>
        <Input id="name" name="name" defaultValue={name} />
      </div>
      <FormActions where="footer" className="sm:col-span-2" {...a} />
    </form>
    </SectionCard>
  );
}
