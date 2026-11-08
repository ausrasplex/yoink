import { BellRing, Gavel, ScrollText, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AccessForm, NotificationsForm, TermsForm } from "@/components/admin/settings-sections";
import { SettingsForm } from "@/components/admin/settings-form";
import { AppShell, PageTitle } from "@/components/shell/app-shell";
import { getAuction } from "@/lib/auction";
import { requireAdmin } from "@/lib/auth";
import { mailIsConfigured } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAdmin();
  const [a, mailReady] = await Promise.all([getAuction(), mailIsConfigured()]);
  return (
    <AppShell user={user}>
      <PageTitle icon={<SlidersHorizontal />} sub="Everything that controls how the auction runs.">Auction Setup</PageTitle>
      <div className="grid grid-cols-1 gap-6">
        <SettingsForm
          head={{ icon: <Gavel className="size-5" />, title: "Auction", desc: "Each item's bidding window is set on the item itself (Manage Items)." }}
          name={a.name}
        />
        <AccessForm
          head={{ icon: <ShieldCheck className="size-5" />, title: "Registration & login security" }}
          registrationOpen={a.registrationOpen} maxLoginAttempts={a.maxLoginAttempts} lockoutMinutes={a.lockoutMinutes}
        />
        <NotificationsForm
          head={{ icon: <BellRing className="size-5" />, title: "Emails", desc: "Which emails the app sends. The server admin looks after the email connection itself." }}
          emailEnabled={a.emailEnabled} notifyOutbid={a.notifyOutbid} emailPasswordReset={a.emailPasswordReset}
          emailNewItems={a.emailNewItems} digestHour={a.digestHour} mailReady={mailReady}
        />
        <TermsForm head={{ icon: <ScrollText className="size-5" />, title: "Terms & conditions", desc: "Displayed on every item page." }} terms={a.terms} />
      </div>
    </AppShell>
  );
}
