import { headers } from "next/headers";
import { ChartColumn, CircleCheck, CircleAlert, Mail, Palette, Server, Sparkles } from "lucide-react";
import { BrandingForm, SmtpForm } from "@/components/server/server-forms";
import { ThemeManager, type ThemeCard } from "@/components/server/theme-manager";
import { SectionCard } from "@/components/section-card";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { getAuction } from "@/lib/auction";
import { requireServerAdmin } from "@/lib/auth";
import { bytes } from "@/lib/format";
import { listThemes, pickTheme } from "@/lib/theme/store";
import { appUrlMismatch } from "@/lib/qr";
import { getUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-canvas p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">{sub}</p>}
    </div>
  );
}

function EnvRow({ name, ok, value, hint }: { name: string; ok: boolean; value: string; hint?: string }) {
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon className={`mt-0.5 size-4 shrink-0 ${ok ? "text-green-700" : "text-destructive"}`} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink"><code>{name}</code></p>
        <p className="break-all text-sm text-muted-foreground">{value}</p>
        {hint && !ok && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </li>
  );
}

export default async function ServerSettingsPage() {
  const user = await requireServerAdmin();
  const [a, usage] = await Promise.all([getAuction(), getUsage()]);
  const showing = pickTheme(a.theme, null);
  const md = (v: string) => new Date(2000, Number(v.slice(0, 2)) - 1, Number(v.slice(3))).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  const themeCards: ThemeCard[] = listThemes().map((t) => t.ok
    ? {
        id: t.id, name: t.theme.name, description: t.theme.description, source: t.source, replacesBuiltIn: t.replacesBuiltIn, ok: true,
        dates: t.theme.active && `${md(t.theme.active.from)} – ${md(t.theme.active.to)} each year`,
        effect: t.theme.effect, font: !!t.theme.font, swatches: Object.values(t.theme.colours ?? {}),
      }
    : { id: t.id, name: t.id, source: t.source, replacesBuiltIn: t.replacesBuiltIn, ok: false, error: t.error, effect: "none", font: false, swatches: [] });
  const env = process.env;
  const mismatch = appUrlMismatch(await headers());
  const secretOk = !!env.APP_SECRET && env.APP_SECRET.length >= 16;

  return (
    <AppShell user={user}>
      <PageTitle icon={<Server />} sub="Settings that keep the app running. Auction content is managed by admins.">Server</PageTitle>
      <div className="grid grid-cols-1 gap-6">
        <SectionCard icon={<ChartColumn className="size-5" />} title="Usage" desc="Totals for this server, including storage on disk.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Items" value={usage.items.toLocaleString("en-AU")} />
            <Stat label="Users" value={usage.users.toLocaleString("en-AU")} />
            <Stat label="Admins" value={usage.admins.toLocaleString("en-AU")} />
            <Stat
              label="Storage"
              value={bytes(usage.total)}
              sub={`Uploads ${bytes(usage.uploads.bytes)} (${usage.uploads.files} file${usage.uploads.files === 1 ? "" : "s"}) · Database ${usage.database === null ? "unknown" : bytes(usage.database)}`}
            />
          </div>
        </SectionCard>
        <BrandingForm head={{ icon: <Palette className="size-5" />, title: "Branding" }} appName={a.appName} appSlogan={a.appSlogan} auctionName={a.name} logo={a.appLogo ? `/brand/logo?v=${a.appLogo}` : null} logoWide={a.appLogoWide ? `/brand/wordmark?v=${a.appLogoWide}` : null} />
        <SectionCard icon={<Sparkles className="size-5" />} title="Themes"
          desc="Seasonal looks and wording for everyone: colours, images, a font, an effect and fancy text for bids and emails. Preview only changes your own browser.">
          <ThemeManager themes={themeCards} mode={a.theme} showingId={showing.id}
            reason={a.theme !== "auto" ? "chosen to always show" : showing.theme.active ? "its dates include today" : "no dated theme today"} />
        </SectionCard>
        <SmtpForm
            head={{
              icon: <Mail className="size-5" />,
              title: "Email (SMTP)",
              desc: `Sends outbid notifications, "Forgot password" links and admin invites; admins choose which go out (Auction Setup → Emails).${!a.emailEnabled ? " Admins have currently turned all emails off." : ""}${!secretOk ? " Set APP_SECRET in the server environment before saving an SMTP password." : ""}`,
            }}
            smtpHost={a.smtpHost} smtpPort={a.smtpPort} smtpSecure={a.smtpSecure} smtpUser={a.smtpUser}
            smtpFrom={a.smtpFrom} hasPassword={!!a.smtpPassEnc} adminEmail={user.email}
        />
        <SectionCard icon={<Server className="size-5" />} title="Environment" desc="Read from the server's environment variables. Change them in .env (or docker-compose) and restart.">
          <ul className="divide-y">
            <EnvRow
              name="APP_URL"
              ok={!!env.APP_URL && !mismatch}
              value={env.APP_URL || "Not set — QR codes and email links use whatever address each request came in on."}
              hint={mismatch
                ? `You're using ${mismatch.current}, but QR codes, invite links and emails point at ${mismatch.appUrl}. Fix APP_URL (or open the app at that address) and restart.`
                : "Set it to the address guests will use, so printed QR codes and emailed links work."}
            />
            <EnvRow name="APP_SECRET" ok={secretOk} value={secretOk ? "Set" : "Missing or shorter than 16 characters"}
              hint="Needed to store the SMTP password. Changing it later means re-entering that password." />
            <EnvRow name="COOKIE_SECURE" ok value={env.COOKIE_SECURE === "false" ? "false — sign-in works over plain http (fine on a LAN, not on the internet)" : "true — sign-in requires HTTPS"} />
            <EnvRow name="ACCESS_CODE" ok value={env.ACCESS_CODE ? "Set — guests need the code to register" : "Not set — anyone can register while registration is open"} />
            <EnvRow name="UPLOAD_DIR" ok value={env.UPLOAD_DIR || "./data/uploads (default)"} />
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
