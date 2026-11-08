import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@/lib/format";
import { clientIp } from "@/lib/ratelimit";

const COOKIE = "session";
const TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Only allow same-site relative redirects. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  // Only a hash is stored, so a DB leak does not expose usable session tokens.
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const ip = await clientIp();
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt, userAgent, ip } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE !== "false",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true, mustChangePassword: true, avatar: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  // Keep "last active" fresh for the Settings > devices list without writing on every request.
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return { ...session.user, sessionId: session.id };
});

/** The only pages the server admin uses: the server area and their own account. Everything else is auction content. */
const SERVER_ADMIN_PATHS = ["/server", "/settings", "/account/password"];
const serverAdminMayOpen = (path: string) => SERVER_ADMIN_PATHS.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));

/** Redirects to /login (remembering where the user was headed, e.g. a scanned lot) if not signed in. */
export async function requireUser(next = "/") {
  const user = await getUser();
  if (!user) {
    // A brand-new install has no accounts yet: the first thing anyone sees is "Create the server admin".
    if (!(await hasServerAdmin())) redirect("/setup");
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  // Temporary passwords (admin-created / reset accounts) must be replaced before anything else.
  if (user.mustChangePassword && next !== "/account/password") redirect("/account/password");
  // The server admin keeps the app running; it doesn't browse, bid or manage auction content.
  if (user.role === "SERVER_ADMIN" && !serverAdminMayOpen(next)) redirect("/server");
  return user;
}

/** Auction admins: items, users, bid history, QR codes, auction setup. */
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** Server settings (branding, SMTP) and managing admins. */
export async function requireServerAdmin() {
  const user = await requireUser("/server");
  if (user.role !== "SERVER_ADMIN") redirect(user.role === "ADMIN" ? "/admin" : "/");
  return user;
}

/** Either kind of manager: used by the account actions shared by the Users and Admins pages. */
export async function requireManager() {
  const user = await requireUser("/server"); // allowed for the server admin; others are checked below
  if (user.role === "USER") redirect("/");
  return user;
}

/** False until /setup creates the server admin, which is always the first account. */
export const hasServerAdmin = cache(async () => (await db.user.count({ where: { role: "SERVER_ADMIN" } })) > 0);

/** Admins manage users; the server admin manages admins. Nobody manages the server admin from these pages. */
export function canManageUser(me: { role: Role }, target: { role: Role }) {
  return (me.role === "ADMIN" && target.role === "USER") || (me.role === "SERVER_ADMIN" && target.role === "ADMIN");
}
