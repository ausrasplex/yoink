"use client";

import { Send } from "lucide-react";
import { useActionState, useId, useState, useTransition } from "react";
import { Check, Status } from "@/components/admin/settings-sections";
import { BrandMark } from "@/components/brand-mark";
import { FormActions } from "@/components/form-actions";
import { RemoveImageButton } from "@/components/remove-image-button";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import { removeAppLogoAction, removeAppLogoWideAction, saveBrandingAction, saveSmtpAction, saveThemeAction, testEmailAction, type SettingsState } from "@/app/server/actions";
import { THEMES, type ThemeId } from "@/lib/themes";

const IMAGE_TYPES = "image/svg+xml,.svg,.svgz,image/png,image/jpeg,image/webp";

export function BrandingForm({ head, appName, appSlogan, auctionName, logo, logoWide }: {
  head: SectionHead; appName: string | null; appSlogan: string | null; auctionName: string; logo: string | null; logoWide: string | null;
}) {
  const [state, action, pending] = useActionState(saveBrandingAction, undefined);
  const id = useId();
  const a = { form: id, pending, status: <Status state={state} /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="appName">App name</Label>
        <Input id="appName" name="appName" defaultValue={appName ?? ""} maxLength={80} placeholder={auctionName} />
        <p className="text-xs text-muted-foreground">
          Shown in the sidebar, sign-in screens, browser tab and emails. Leave blank to use the auction name ({auctionName}).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="appSlogan">Slogan <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="appSlogan" name="appSlogan" defaultValue={appSlogan ?? ""} maxLength={120} placeholder="e.g. Bid big, give bigger." />
        <p className="text-xs text-muted-foreground">
          A short line shown under the name on the sign-in screens, as their big headline, and as the description in link previews.
        </p>
      </div>
      <div className="grid gap-6 border-t pt-5 lg:grid-cols-2">
        {/* Icon (square): browser tab, home-screen and compact spots. */}
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          <div className="relative">
            <BrandMark logo={logo} className="size-14" />
            {logo && (
              <RemoveImageButton
                label="Remove icon"
                confirm={{ title: "Remove the app icon?", description: "The default Yoink icon is shown instead, including in the browser tab.", confirmLabel: "Remove icon" }}
                onRemove={removeAppLogoAction}
              />
            )}
          </div>
          <div className="w-full min-w-0 space-y-2 sm:w-auto">
            <Label htmlFor="appLogo" className="block leading-snug">
              Icon (square) <span className="block font-normal text-muted-foreground">SVG, PNG, JPEG or WebP, under 2 MB. Browser tab and next to the name.</span>
            </Label>
            <FileInput id="appLogo" name="appLogo" accept={IMAGE_TYPES} className="sm:w-72" placeholder={logo ? "Choose a new icon" : undefined} />
          </div>
        </div>
        {/* Logo (landscape): replaces icon + name where there's room. */}
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          <div className="relative grid h-14 w-40 place-items-center rounded-xl border border-dashed border-border bg-canvas px-2">
            {logoWide ? (
              // eslint-disable-next-line @next/next/no-img-element -- small preview from our own route
              <img src={`/brand/wordmark?v=${logoWide}`} alt="Landscape logo" className="max-h-11 max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">No landscape logo</span>
            )}
            {logoWide && (
              <RemoveImageButton
                label="Remove landscape logo"
                confirm={{ title: "Remove the landscape logo?", description: "The icon and app name are shown instead.", confirmLabel: "Remove logo" }}
                onRemove={removeAppLogoWideAction}
              />
            )}
          </div>
          <div className="w-full min-w-0 space-y-2 sm:w-auto">
            <Label htmlFor="appLogoWide" className="block leading-snug">
              Logo (landscape) <span className="block font-normal text-muted-foreground">Optional. Wide logo with the name in it; replaces icon + name in the sidebar, top bar and sign-in screens.</span>
            </Label>
            <FileInput id="appLogoWide" name="appLogoWide" accept={IMAGE_TYPES} className="sm:w-72" placeholder={logoWide ? "Choose a new logo" : undefined} />
          </div>
        </div>
      </div>
      <FormActions where="footer" {...a} />
    </form>
    </SectionCard>
  );
}

type Smtp = {
  smtpHost: string | null; smtpPort: number; smtpSecure: boolean; smtpUser: string | null;
  smtpFrom: string | null; hasPassword: boolean; adminEmail: string;
};

export function SmtpForm({ head, ...p }: Smtp & { head: SectionHead }) {
  const [state, action, pending] = useActionState(saveSmtpAction, undefined);
  const [testState, setTest] = useState<SettingsState>();
  const [testing, startTest] = useTransition();
  const id = useId();
  const a = { form: id, pending, status: <Status state={state} /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <div className="space-y-4">
      <form id={id} action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="smtpHost">SMTP host</Label>
            <Input id="smtpHost" name="smtpHost" defaultValue={p.smtpHost ?? ""} placeholder="smtp.example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPort">Port</Label>
            <Input id="smtpPort" name="smtpPort" type="number" defaultValue={p.smtpPort} />
          </div>
        </div>
        <Check name="smtpSecure" defaultChecked={p.smtpSecure} label="Use implicit TLS (port 465)" hint="Leave off for port 587 / STARTTLS." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtpUser">Username</Label>
            <Input id="smtpUser" name="smtpUser" defaultValue={p.smtpUser ?? ""} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPass">Password</Label>
            <Input id="smtpPass" name="smtpPass" type="password" autoComplete="new-password"
              placeholder={p.hasPassword ? "•••••••• (saved — leave blank to keep)" : ""} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtpFrom">From address</Label>
          <Input id="smtpFrom" name="smtpFrom" defaultValue={p.smtpFrom ?? ""} placeholder="Auction <auction@example.com>" />
        </div>
        <FormActions where="footer" {...a} />
      </form>
      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button variant="outline" disabled={testing}
          onClick={() => startTest(async () => { setTest(undefined); setTest(await testEmailAction()); })}>
          <Send /> {testing ? "Sending…" : "Send test email"}
        </Button>
        <Status state={testState} />
        <span className="min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">To {p.adminEmail}, using the saved settings.</span>
      </div>
    </div>
    </SectionCard>
  );
}

export function ThemeForm({ head, theme }: { head: SectionHead; theme: ThemeId }) {
  const [state, action, pending] = useActionState(saveThemeAction, undefined);
  const id = useId();
  const a = { form: id, pending, status: <Status state={state} /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} className="space-y-4">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Theme</legend>
        {(Object.entries(THEMES) as [ThemeId, (typeof THEMES)[ThemeId]][]).map(([value, t]) => (
          <label key={value}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 has-[:checked]:border-ink has-[:checked]:bg-lilac/30">
            <input type="radio" name="theme" value={value} defaultChecked={value === theme} className="mt-1 size-4 accent-ink" />
            <span className="min-w-0">
              <span className="block font-bold text-ink">{t.label}</span>
              <span className="block text-sm text-muted-foreground">{t.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <FormActions where="footer" {...a} />
    </form>
    </SectionCard>
  );
}
