"use client";

import { Send } from "lucide-react";
import { useActionState, useId, useState, useTransition } from "react";
import { Check, Status } from "@/components/admin/settings-sections";
import { FormActions } from "@/components/form-actions";
import { RemoveImageButton } from "@/components/remove-image-button";
import { SectionCard, type SectionHead } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import { removeBrandImageAction, saveBrandingAction, saveSmtpAction, testEmailAction, type SettingsState } from "@/app/server/actions";

const IMAGE_TYPES = "image/svg+xml,.svg,.svgz,image/png,image/jpeg,image/webp";

type BrandSlot = { field: "appLogo" | "appLogoDark" | "appLogoWide" | "appLogoWideDark"; url: string | null };

/** One Branding image: preview (on a navy tile for the dark-background versions), picker and bin button. */
function BrandImageSlot({ field, url, label, hint, dark, wide, fallback }: BrandSlot & {
  label: string; hint: string; dark?: boolean; wide?: boolean; fallback: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
      <div className={`relative grid h-14 place-items-center rounded-xl border px-2 ${wide ? "w-40" : "w-14"} ${dark ? "border-ink bg-ink" : "border-dashed border-border bg-canvas"}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- small preview from our own route
          <img src={url} alt={label} className="max-h-11 max-w-full object-contain" />
        ) : (
          <span className={`text-center text-[11px] leading-tight ${dark ? "text-white/60" : "text-muted-foreground"}`}>{fallback}</span>
        )}
        {url && (
          <RemoveImageButton
            label={`Remove ${label.toLowerCase()}`}
            confirm={{ title: `Remove the ${label.toLowerCase()}?`, description: hint, confirmLabel: "Remove" }}
            onRemove={() => removeBrandImageAction(field)}
          />
        )}
      </div>
      <div className="w-full min-w-0 space-y-2 sm:w-auto">
        <Label htmlFor={field} className="block leading-snug">{label}</Label>
        <FileInput id={field} name={field} accept={IMAGE_TYPES} className="sm:w-64" placeholder={url ? "Choose a replacement" : undefined} />
      </div>
    </div>
  );
}

export function BrandingForm({ head, appName, appSlogan, logo, logoWide, logoDark, logoWideDark }: {
  head: SectionHead; appName: string | null; appSlogan: string | null;
  logo: string | null; logoWide: string | null; logoDark: string | null; logoWideDark: string | null;
}) {
  const [state, action, pending] = useActionState(saveBrandingAction, undefined);
  const id = useId();
  const a = { form: id, pending, status: <Status state={state} /> };
  return (
    <SectionCard {...head} action={<FormActions where="header" {...a} />}>
    <form id={id} action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="appName">App name</Label>
        <Input id="appName" name="appName" defaultValue={appName ?? ""} maxLength={80} placeholder="Yoink" />
        <p className="text-xs text-muted-foreground">
          Shown in the sidebar, sign-in screens, browser tab and emails. Leave blank to use &ldquo;Yoink&rdquo;.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="appSlogan">Slogan <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="appSlogan" name="appSlogan" defaultValue={appSlogan ?? ""} maxLength={120} placeholder="e.g. Bid big, give bigger." />
        <p className="text-xs text-muted-foreground">
          A short line shown under the name on the sign-in screens, as their big headline, and as the description in link previews.
        </p>
      </div>
      <div className="space-y-5 border-t pt-5">
        <p className="text-sm text-muted-foreground">
          SVG, PNG, JPEG or WebP, under 2 MB. The <span className="font-semibold text-ink">icon</span> is square (browser tab, next to
          the name); the <span className="font-semibold text-ink">logo</span> is landscape with the name in it and replaces icon + name.
          Upload a version <span className="font-semibold text-ink">for dark backgrounds</span> (such as the desktop sign-in panel) if
          yours doesn&apos;t show up on navy; otherwise the light-background one is used everywhere.
        </p>
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
          <BrandImageSlot field="appLogo" url={logo} label="Icon, for light backgrounds" fallback="Default"
            hint="The default Yoink icon is shown instead, including in the browser tab." />
          <BrandImageSlot field="appLogoDark" url={logoDark} label="Icon, for dark backgrounds" dark fallback="Uses the light one"
            hint="The icon for light backgrounds is used on dark ones too." />
          <BrandImageSlot field="appLogoWide" url={logoWide} label="Logo, for light backgrounds" wide fallback="None: icon + name"
            hint="The icon and app name are shown instead." />
          <BrandImageSlot field="appLogoWideDark" url={logoWideDark} label="Logo, for dark backgrounds" wide dark fallback="Uses the light one"
            hint="The logo for light backgrounds is used on dark ones too." />
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

