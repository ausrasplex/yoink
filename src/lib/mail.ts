import "server-only";
import nodemailer from "nodemailer";
import { getAuction } from "@/lib/auction";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { brandName, money } from "@/lib/format";
import { themeCopy } from "@/lib/theme/active";

/**
 * Who decides what gets sent:
 *   - the Server Admin sets up the SMTP connection (Server page);
 *   - Admins choose whether emails go out at all (master switch) and which kinds (Auction setup → Notifications).
 * "test" is the Server Admin's own check of the connection, so it only needs SMTP.
 */
export type EmailKind = "outbid" | "passwordReset" | "invite" | "newItems" | "test";

type Switches = {
  smtpHost: string | null; smtpFrom: string | null;
  emailEnabled: boolean; notifyOutbid: boolean; emailPasswordReset: boolean; emailNewItems: boolean;
};
export type EmailStatus = "ready" | "noSmtp" | "off";

export function emailStatusOf(a: Switches, kind: EmailKind): EmailStatus {
  if (!a.smtpHost || !a.smtpFrom) return "noSmtp";
  if (kind === "test") return "ready";
  if (!a.emailEnabled) return "off";
  if (kind === "outbid" && !a.notifyOutbid) return "off";
  if (kind === "passwordReset" && !a.emailPasswordReset) return "off";
  if (kind === "newItems" && !a.emailNewItems) return "off";
  return "ready";
}

export async function emailStatus(kind: EmailKind): Promise<EmailStatus> {
  return emailStatusOf(await getAuction(), kind);
}

async function transportFromSettings(kind: EmailKind) {
  const a = await getAuction();
  if (emailStatusOf(a, kind) !== "ready" || !a.smtpHost || !a.smtpFrom) return null;
  return {
    auction: a,
    from: a.smtpFrom,
    transport: nodemailer.createTransport({
      host: a.smtpHost,
      port: a.smtpPort,
      secure: a.smtpSecure, // true = implicit TLS (465); false = STARTTLS when offered (587)
      auth: a.smtpUser ? { user: a.smtpUser, pass: a.smtpPassEnc ? decrypt(a.smtpPassEnc) : "" } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    }),
  };
}

export async function sendTestEmail(to: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const t = await transportFromSettings("test");
    if (!t) return { ok: false, error: "Enter and save the SMTP host and From address first." };
    await t.transport.sendMail({
      from: t.from, to,
      subject: `${brandName(t.auction)}: test email`,
      text: "SMTP is working. Emails from the app will be sent from this address.",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send." };
  }
}

export async function sendOutbidEmail(p: { userId: string; lot: number; title: string; amount: number; minBid: number; endsAt: Date }) {
  try {
    const t = await transportFromSettings("outbid");
    const say = await themeCopy();
    if (!t) return;
    const user = await db.user.findUnique({ where: { id: p.userId }, select: { name: true, email: true } });
    if (!user) return;
    const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
    const link = `${base}/lot/${p.lot}`;
    const ends = `\nBidding on this item closes ${p.endsAt.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: process.env.TZ || "Australia/Melbourne" })}.\n`;
    await t.transport.sendMail({
      from: t.from,
      to: user.email,
      subject: say("outbidEmailSubject", { lot: p.lot, title: p.title, amount: money(p.amount), minBid: money(p.minBid), name: user.name }),
      text:
        `Hi ${user.name},\n\n` +
        `${say("outbidEmailBody", { lot: p.lot, title: p.title, amount: money(p.amount), minBid: money(p.minBid), name: user.name })}\n` +
        `To take the lead again you'll need to bid at least ${money(p.minBid)}.\n${ends}\n` +
        `${link}\n\n${brandName(t.auction)}`,
    });
  } catch (e) {
    // Never let a mail problem affect bidding.
    console.error("[mail] outbid notification failed:", e instanceof Error ? e.message : e);
  }
}

/** True when the SMTP connection is set up (whatever Admins have switched on or off). */
export async function mailIsConfigured() {
  const a = await getAuction();
  return !!(a.smtpHost && a.smtpFrom);
}

export async function sendPasswordResetEmail(p: { to: string; name: string; token: string; minutes: number }) {
  try {
    const t = await transportFromSettings("passwordReset");
    if (!t) return;
    const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
    await t.transport.sendMail({
      from: t.from,
      to: p.to,
      subject: `Reset your ${brandName(t.auction)} password`,
      text:
        `Hi ${p.name},\n\n` +
        `Use this link to choose a new password. It works once and expires in ${p.minutes} minutes:\n\n` +
        `${base}/reset-password/${p.token}\n\n` +
        `If you didn't ask for this, you can ignore this email; your password hasn't changed.\n\n${brandName(t.auction)}`,
    });
  } catch (e) {
    console.error("[mail] password reset email failed:", e instanceof Error ? e.message : e);
  }
}

/** Invite to become an admin. Returns whether it was sent so the server admin knows to share the link by hand. */
export async function sendInviteEmail(p: { to: string; name: string; link: string; days: number; invitedBy: string }) {
  try {
    const status = await emailStatus("invite");
    if (status !== "ready") return { ok: false as const, error: status === "off" ? "Admins have turned emails off." : "Email isn't set up." };
    const t = await transportFromSettings("invite");
    if (!t) return { ok: false as const, error: "Email isn't set up." };
    const app = brandName(t.auction);
    await t.transport.sendMail({
      from: t.from,
      to: p.to,
      subject: `You're invited to be an admin on ${app}`,
      text:
        `Hi ${p.name},\n\n` +
        `${p.invitedBy} has invited you to help run ${app} as an admin.\n` +
        `Use this link to choose your password. It works once and expires in ${p.days} days:\n\n` +
        `${p.link}\n\n` +
        `If you weren't expecting this, you can ignore this email.\n\n${app}`,
    });
    return { ok: true as const };
  } catch (e) {
    console.error("[mail] invite email failed:", e instanceof Error ? e.message : e);
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to send." };
  }
}

export type DigestItem = { lot: number; title: string; price: number; noBids: boolean; startsAt: Date; endsAt: Date };

/**
 * Daily "new items" digest to every User who hasn't opted out. Sent one person at a time (each email is personal and has
 * its own settings link); a failure for one address is logged and doesn't stop the rest. Returns how many were sent.
 */
export async function sendNewItemsDigest(items: DigestItem[]): Promise<number> {
  const t = await transportFromSettings("newItems");
  const say = await themeCopy();
  if (!t || items.length === 0) return 0;
  const recipients = await db.user.findMany({ where: { role: "USER", emailDigest: true }, select: { name: true, email: true } });
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const app = brandName(t.auction);
  const tz = process.env.TZ || "Australia/Melbourne";
  const when = (d: Date) => d.toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: tz });
  const now = Date.now();
  const list = items
    .map((i) => [
      `• Lot ${i.lot}: ${i.title}`,
      `  ${i.noBids ? "Starting bid" : "Current bid"} ${money(i.price)} · ${i.startsAt.getTime() > now ? `opens ${when(i.startsAt)}` : "open now"} · ends ${when(i.endsAt)}`,
      `  ${base}/lot/${i.lot}`,
    ].join("\n"))
    .join("\n\n");
  let sent = 0;
  for (const r of recipients) {
    try {
      await t.transport.sendMail({
        from: t.from,
        to: r.email,
        subject: say("digestEmailSubject", { items: `${items.length} new item${items.length === 1 ? "" : "s"}`, count: items.length, auction: app, name: r.name }),
        text: [
          `Hi ${r.name},`, "",
          say("digestEmailIntro", { count: items.length, name: r.name }), "",
          list, "",
          `Don't want these? Turn off the daily email on your Account page: ${base}/settings`, "",
          app,
        ].join("\n"),
      });
      sent++;
    } catch (e) {
      console.error("[mail] digest to one recipient failed:", e instanceof Error ? e.message : e);
    }
  }
  return sent;
}
