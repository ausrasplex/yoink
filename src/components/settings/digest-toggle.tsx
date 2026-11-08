"use client";

import { useOptimistic, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setDigestAction } from "@/app/settings/actions";

/** Users: the daily "new items" email. Saves as soon as it's switched. */
export function DigestToggle({ on, available }: { on: boolean; available: boolean }) {
  const [value, setValue] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <div className="flex items-start gap-3">
      <Switch id="sw-digest" checked={value} className="mt-0.5"
        onCheckedChange={(next) => start(async () => { setValue(next); await setDigestAction(next); })} />
      <Label htmlFor="sw-digest" className="block text-sm font-medium leading-snug">
        Daily new items email
        <span className="mt-0.5 block font-normal text-muted-foreground">
          {available ? "One email a day listing items added since the last one." : "Organisers haven't turned this email on yet; your choice is saved for when they do."}
        </span>
      </Label>
    </div>
  );
}
