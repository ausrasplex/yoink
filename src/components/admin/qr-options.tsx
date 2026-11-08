"use client";

import { QRCodeSVG } from "qrcode.react";
import { useActionState, useEffect, useId, useState } from "react";
import { Status } from "@/components/admin/settings-sections";
import { FormActions } from "@/components/form-actions";
import { RemoveImageButton } from "@/components/remove-image-button";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import { removeQrLogoAction, saveQrAction } from "@/app/admin/settings-actions";

const COLOURS = [["#2a2742", "Navy"], ["#000000", "Black"], ["#4c3a9e", "Purple"], ["#0f5132", "Green"]];

/**
 * Admin: QR logo + colour, with a live demo code. The demo follows the colour picker and a newly chosen logo file
 * straight away (before saving), and shows the saved logo once uploaded.
 * `logo`: the saved logo as a data URI; `demoUrl`: what the demo code encodes.
 */
export function QrOptions({ head, color, logo, demoUrl }: { head: SectionHead; color: string; logo: string | null; demoUrl: string }) {
  const [state, action, pending] = useActionState(saveQrAction, undefined);
  const id = useId();
  const a = { form: id, pending, status: <Status state={state} /> };
  const [colour, setColour] = useState(color);
  // A chosen-but-unsaved file previews in the demo. It's tied to the saved logo it was picked over,
  // so once the page refreshes with the uploaded logo the preview falls back to the real thing.
  const [picked, setPicked] = useState<{ url: string; over: string | null } | null>(null);
  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url); }, [picked]);
  const preview = picked && picked.over === logo ? picked.url : logo;

  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <form id={id} action={action} className="space-y-5">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
            {logo && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI thumbnail */}
                <img src={logo} alt="Current QR logo" className="size-14 rounded-xl border bg-white object-contain p-1" />
                <RemoveImageButton
                  label="Remove QR logo"
                  confirm={{ title: "Remove the QR logo?", description: "Codes go back to plain, without a centre logo.", confirmLabel: "Remove logo" }}
                  onRemove={removeQrLogoAction}
                />
              </div>
            )}
            <div className="w-full min-w-0 space-y-2 sm:w-auto">
              <Label htmlFor="logo" className="block leading-snug">
                {logo ? "Replace logo" : "Logo in the centre"}{" "}
                <span className="block font-normal text-muted-foreground sm:inline">(SVG, PNG, JPEG or WebP, square works best)</span>
              </Label>
              <FileInput id="logo" name="logo" accept="image/svg+xml,.svg,.svgz,image/png,image/jpeg,image/webp" className="sm:w-80"
                onFiles={(files) => {
                  const f = files[0];
                  setPicked(f ? { url: URL.createObjectURL(f), over: logo } : null);
                }} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qrColor">Code colour</Label>
            <div className="flex items-center gap-2">
              <input id="qrColor" name="qrColor" type="color" value={colour} onChange={(e) => setColour(e.target.value)} list="qr-colours"
                className="h-10 w-14 cursor-pointer rounded-xl border bg-white p-1" />
              <datalist id="qr-colours">{COLOURS.map(([v, l]) => <option key={v} value={v} label={l} />)}</datalist>
            </div>
          </div>
          <FormActions where="footer" {...a} />
          <p className="text-xs text-muted-foreground">Keep the colour dark against white so phones can still scan it. After changing either, test-scan one printed code.</p>
        </form>

        <figure className="flex flex-col items-center gap-2 justify-self-center rounded-2xl bg-canvas p-4 md:justify-self-end">
          <div className="rounded-xl bg-white p-2">
            <QRCodeSVG value={demoUrl} size={168} marginSize={2} level={preview ? "H" : "M"} fgColor={colour}
              imageSettings={preview ? { src: preview, height: 40, width: 40, excavate: true } : undefined} />
          </div>
          <figcaption className="text-center text-xs text-muted-foreground">
            Demo code{picked && picked.over === logo ? " · not saved yet" : ""}
          </figcaption>
        </figure>
      </div>
    </SectionCard>
  );
}
