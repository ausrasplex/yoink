// Server admin: separate from admins, only server settings + managing admins.
// Needs SA_EMAIL / SA_PASSWORD for the server admin (what you entered at /setup).
import { chromium } from "playwright";
const B = process.env.BASE_URL ?? "http://localhost:3000";
const SA_EMAIL = process.env.SA_EMAIL, SA_PASSWORD = process.env.SA_PASSWORD;
if (!SA_EMAIL || !SA_PASSWORD) { console.log("SKIP 06-server-admin: set SA_EMAIL and SA_PASSWORD"); process.exit(0); }
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const br = await chromium.launch();
const mk = async () => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); return { ctx, page: await ctx.newPage() }; };
async function login(page, email, pw) {
  await page.goto(B + "/login"); await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
}
const path = (p) => new URL(p.url()).pathname;

const probe = await mk(); await probe.page.goto(B + "/setup");
ok(path(probe.page) === "/login", "/setup is closed once a server admin exists");

const sa = await mk(); const S = sa.page;
await login(S, SA_EMAIL, SA_PASSWORD); await S.waitForURL(B + "/server");
ok(true, "Server admin lands on /server after sign-in");
for (const p of ["/", "/items", "/bids", "/lot/1", "/admin", "/admin/users", "/admin/settings", "/admin/qr"]) {
  await S.goto(B + p); ok(path(S) === "/server", `Server admin is kept out of ${p}`);
}
ok((await S.request.get(B + "/admin/export", { maxRedirects: 0 })).status() !== 200, "Server admin can't download the CSV export");
await S.goto(B + "/settings"); ok(path(S) === "/settings", "Server admin can open their own account settings");
await S.goto(B + "/server");
ok(await S.getByRole("searchbox", { name: "Search items" }).count() === 0, "No item search for the server admin");
ok(await S.getByRole("heading", { name: "Email (SMTP)" }).isVisible(), "SMTP lives on the Server page");

// branding
await S.getByLabel("App name").fill("Yoink Test"); await S.locator("section", { has: S.locator("#appName") }).getByRole("button", { name: "Save" }).click();
await S.locator("section", { has: S.locator("#appName") }).getByText("Saved").waitFor();
const guest = await mk(); await guest.page.goto(B + "/login");
ok(await guest.page.getByText("Yoink Test").first().isVisible(), "App name shows on the sign-in screen");
ok((await guest.page.title()) === "Yoink Test", "App name is the browser tab title");
await S.getByLabel("App name").fill(""); await S.locator("section", { has: S.locator("#appName") }).getByRole("button", { name: "Save" }).click();
await S.locator("section", { has: S.locator("#appName") }).getByText("Saved").waitFor();

// invite an admin (no SMTP needed: the link is shown)
const email = `e2e-admin-${Date.now()}@example.com`;
await S.goto(B + "/server/admins");
await S.getByLabel("Name").fill("E2E Admin"); await S.getByLabel("Email").fill(email);
await S.getByRole("button", { name: "Invite admin" }).click();
const link = (await S.locator("code").filter({ hasText: "/invite/" }).first().textContent())?.trim();
ok(!!link, "Invite link is shown to the server admin");
const inv = await mk(); await inv.page.goto(link.replace(/^https?:\/\/[^/]+/, B));
await inv.page.getByLabel("Password", { exact: true }).fill("invited-pass-1"); await inv.page.getByLabel("Confirm password").fill("invited-pass-1");
await inv.page.getByRole("button", { name: "Create admin account" }).click(); await inv.page.waitForURL(B + "/admin");
ok(true, "Accepting the invite creates an admin and opens /admin");
const reuse = await mk(); await reuse.page.goto(link.replace(/^https?:\/\/[^/]+/, B));
ok(await reuse.page.getByText("Invite expired").isVisible(), "Invite links work once");

// remove admin access
await S.goto(B + "/server/admins");
await S.getByRole("row", { name: /E2E Admin/ }).getByRole("link", { name: "Manage" }).click();
await S.locator("#role").click(); await S.getByRole("option", { name: /User/ }).click();
await S.getByRole("button", { name: "Save changes" }).click(); await S.waitForURL(B + "/server/admins");
ok(await S.getByRole("row", { name: /E2E Admin/ }).count() === 0, "Removing admin access takes them off the Admins list");
await inv.page.goto(B + "/admin"); ok(path(inv.page) === "/login", "…and signs them out");
await br.close();
