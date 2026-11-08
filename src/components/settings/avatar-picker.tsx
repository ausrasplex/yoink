"use client";

import { Camera } from "lucide-react";
import { startTransition, useActionState, useRef } from "react";
import { RemoveImageButton } from "@/components/remove-image-button";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { updateAvatarAction } from "@/app/settings/actions";

/** Profile picture: picking a file uploads it straight away; the bin on its corner removes it. */
export function AvatarPicker({ name, avatar }: { name: string; avatar: string | null }) {
  const [state, action, pending] = useActionState(updateAvatarAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <UserAvatar name={name} avatar={avatar} className="size-16" textClassName="text-xl font-extrabold" />
        {avatar && !pending && (
          <RemoveImageButton
            label="Remove profile picture"
            confirm={{ title: "Remove your profile picture?", description: "Your initials are shown instead.", confirmLabel: "Remove picture" }}
            onRemove={() => { const fd = new FormData(); fd.set("remove", "1"); startTransition(() => action(fd)); }}
          />
        )}
      </div>
      <form ref={form} action={action}>
        <input ref={file} type="file" name="avatar" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1}
          aria-label="Profile picture" onChange={() => form.current?.requestSubmit()} />
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => file.current?.click()}>
          <Camera /> {pending ? "Saving…" : avatar ? "Change" : "Add photo"}
        </Button>
      </form>
      {state?.error && <p className="max-w-40 text-center text-xs text-destructive">{state.error}</p>}
    </div>
  );
}
