import { chromium } from "playwright";
const B = process.env.BASE_URL ?? "http://localhost:3000";
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const br = await chromium.launch();
// non-admin blocked
let ctx = await br.newContext(); let p = await ctx.newPage();
await p.goto(B + "/login"); await p.getByLabel("Email").fill("alyssa@example.com"); await p.getByLabel("Password").fill("demo-password-1");
await p.getByRole("button", { name: "Sign in" }).click(); await p.waitForURL(B + "/");
await p.goto(B + "/admin/history"); ok(new URL(p.url()).pathname === "/", "user redirected from /admin/history");
await ctx.close();
// admin
ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); p = await ctx.newPage();
await p.goto(B + "/login"); await p.getByLabel("Email").fill("admin@example.com"); await p.getByLabel("Password").fill("change-me-please");
await p.getByRole("button", { name: "Sign in" }).click(); await p.waitForTimeout(1500);
if (p.url().includes("/account/password")) { console.log("needs pw change at", p.url()); }
await p.goto(B + "/admin/history");
ok(await p.getByRole("heading", { name: "Bid history" }).isVisible(), "history page renders");
const all = await p.locator("tbody tr").count(); ok(all > 1, `rows shown (${all})`);
await p.getByRole("link", { name: "Bid history" }).first().waitFor();
await p.goto(B + "/admin");
await p.getByRole("link", { name: "Bid history for lot 1" }).click(); await p.waitForURL(/lot=1/);
const rows = await p.locator("tbody tr").count();
const lots = await p.locator("tbody tr td:nth-child(2) a").allTextContents();
ok(rows >= 1 && lots.every((t) => t === "Lot 1"), `filtered to lot 1 (${rows} rows)`);
ok(await p.getByText("Leading").count() === 1, "exactly one Leading bid for the lot");
await p.screenshot({ path: "shots/history.png" });
await p.goto(B + "/admin/users");
await p.getByRole("link", { name: "Manage Alyssa Moore" }).hover(); await p.waitForTimeout(600);
ok(await p.getByRole("tooltip").count() > 0, "tooltip shows on icon hover");
ok(await p.locator("tbody").getByText("Manage").count() === 0, "no visible 'Manage' text");
await p.screenshot({ path: "shots/users-icons.png" });
await p.goto(B + "/admin"); await p.screenshot({ path: "shots/admin-icons.png" });
await br.close();
