import { chromium, devices } from "playwright";
const B = process.env.BASE_URL ?? "http://localhost:3000";
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const br = await chromium.launch();
const mk = async (opts = { viewport: { width: 1280, height: 900 } }) => { const ctx = await br.newContext(opts); return { ctx, page: await ctx.newPage() }; };
async function login(page, email, pw) {
  await page.goto(B + "/login"); await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
}
async function setSwitch(loc, on) { const cur = (await loc.getAttribute("aria-checked")) === "true"; if (cur !== on) await loc.click(); }

// ---------- roles ----------
const alyssa = await mk(); const A = alyssa.page;
await login(A, "alyssa@example.com", "demo-password-1"); await A.waitForURL(B + "/");
ok(await A.getByText("Admin", { exact: true }).count() === 0, "User sees no Admin section in the sidebar");
for (const path of ["/admin", "/admin/users", "/admin/settings", "/admin/qr", "/admin/items/new"]) {
  await A.goto(B + path); ok(new URL(A.url()).pathname === "/", `User redirected away from ${path}`);
}
ok((await A.request.get(B + "/admin/export", { maxRedirects: 0 })).status() !== 200, "User can't download admin export");
await A.getByRole("button", { name: "Account menu" }).click();
ok(await A.getByRole("menuitem").count() === 1, "Avatar menu only offers Log out");
await A.keyboard.press("Escape");

const admin = await mk(); const AD = admin.page;
await login(AD, "admin@example.com", "change-me-please"); await AD.waitForURL(B + "/");
ok(await AD.getByText("Admin", { exact: true }).first().isVisible(), "Admin sees the Admin section");
await AD.goto(B + "/admin"); ok(new URL(AD.url()).pathname === "/admin", "Admin can open /admin");

// ---------- bidding + outbid alert on the new UI ----------
await A.goto(B + "/lot/4");
await A.getByRole("button", { name: "Place bid" }).click();
await A.getByText("You're the highest bidder").waitFor();
ok(true, "User places the minimum bid and leads");
const jordan = await mk(); await login(jordan.page, "jordan@example.com", "demo-password-1"); await jordan.page.waitForURL(B + "/");
await jordan.page.goto(B + "/lot/4");
await jordan.page.getByLabel(/Your bid/).fill("50"); await jordan.page.getByRole("button", { name: "Place bid" }).click();
await jordan.page.getByText("You're the highest bidder").waitFor();
await A.getByText("You've been outbid").waitFor({ timeout: 8000 });
ok(true, "Alyssa's open page flips to Outbid within the poll interval");
await A.goto(B + "/bids");
ok(await A.getByRole("link", { name: /Craft beer hamper/ }).getByText("Outbid").isVisible(), "My bids lists the item as Outbid");
ok(await A.getByRole("link", { name: "You have been outbid" }).isVisible(), "Bell shows the outbid alert");

// ---------- search & filters ----------
await A.goto(B + "/items?q=guitar");
ok(await A.getByRole("link", { name: /Lot \d+/ }).count() === 1, "Search narrows to one item");
await A.goto(B + "/items?filter=outbid");
ok(await A.getByRole("link", { name: /Lot \d+/ }).count() >= 1, "Outbid filter works");

// ---------- settings: devices + password ----------
// start from a clean slate: earlier scripts may have left other Alyssa sessions behind
await A.goto(B + "/settings");
const others = A.getByRole("button", { name: "Sign out all other devices" });
if (await others.count()) { await others.click(); await others.waitFor({ state: "detached" }); }
const phone = await mk({ ...devices["iPhone 13"] });
await login(phone.page, "alyssa@example.com", "demo-password-1"); await phone.page.waitForURL(B + "/");
await A.goto(B + "/settings");
ok(await A.getByText("This device").isVisible() && await A.getByText(/on iOS/).isVisible(), "Settings lists this device and the phone session");
await A.getByRole("button", { name: "Sign out", exact: true }).click();
await A.getByText(/on iOS/).waitFor({ state: "detached" });
ok((await phone.ctx.request.get(B + "/api/lot/4/status")).status() === 401, "Revoking a device signs it out");
// other users' sessions can't be touched: admin's session id isn't revocable by Alyssa (action scoped to caller)
const phone2 = await mk({ ...devices["Pixel 7"] });
await login(phone2.page, "alyssa@example.com", "demo-password-1"); await phone2.page.waitForURL(B + "/");
await A.reload();
await A.getByRole("button", { name: "Sign out all other devices" }).click();
await A.getByRole("button", { name: "Sign out all other devices" }).waitFor({ state: "detached" });
ok((await phone2.ctx.request.get(B + "/api/lot/4/status")).status() === 401 && (await A.request.get(B + "/api/lot/4/status")).status() === 200, "Sign out all others keeps this device");
// password change
const third = await mk(); await login(third.page, "alyssa@example.com", "demo-password-1"); await third.page.waitForURL(B + "/");
await A.reload();
await A.getByLabel("Current password").fill("wrong"); await A.getByLabel("New password", { exact: true }).fill("brand-new-pass-9"); await A.getByLabel("Confirm new password").fill("brand-new-pass-9");
await A.getByRole("button", { name: "Update password" }).click();
await A.getByText("Current password is incorrect.").waitFor();
ok(true, "Wrong current password is rejected");
await A.getByLabel("Current password").fill("demo-password-1"); await A.getByLabel("New password", { exact: true }).fill("brand-new-pass-9"); await A.getByLabel("Confirm new password").fill("brand-new-pass-9");
await A.getByRole("button", { name: "Update password" }).click();
await A.waitForURL(/\/settings\?updated=1/); await A.getByText(/Password updated/).waitFor();
ok((await third.ctx.request.get(B + "/api/lot/4/status")).status() === 401, "Password change signs out other devices; this one stays signed in");
const again = await mk(); await login(again.page, "alyssa@example.com", "demo-password-1");
await again.page.getByText("Incorrect email or password.").waitFor(); ok(true, "Old password rejected");
await again.page.reload(); await login(again.page, "alyssa@example.com", "brand-new-pass-9"); await again.page.waitForURL(B + "/");
ok(true, "New password works");

// ---------- admin: no role changes (that's the server admin's job) + sign out everywhere ----------
const riley = await mk(); await login(riley.page, "riley@example.com", "demo-password-1"); await riley.page.waitForURL(B + "/");
await AD.goto(B + "/admin/users");
ok(await AD.getByRole("row", { name: /Demo Admin/ }).count() === 0, "Admins don't appear on the admin Users list");
await AD.getByRole("row", { name: /Riley Chen/ }).getByRole("link", { name: "Manage" }).click();
ok(await AD.locator("#role").count() === 0, "Admin's user form has no role picker");
const rileyPage = AD.url();
await AD.goto(B + "/server"); ok(new URL(AD.url()).pathname === "/admin", "Admin is redirected away from /server");
await AD.goto(rileyPage);
await AD.getByRole("button", { name: /Sign out of all devices/ }).click(); await AD.getByText(/Signed out of \d+ device/).waitFor();
ok((await riley.ctx.request.get(B + "/api/lot/4/status")).status() === 401, "Admin 'sign out of all devices' ends the user's sessions");

await AD.goto(B + "/admin/settings");
const sw = AD.getByRole("switch", { name: /Allow guests to register/ });
await setSwitch(sw, false);
await AD.locator("section", { has: AD.locator("#maxLoginAttempts") }).getByRole("button", { name: "Save" }).click();
await AD.locator("section", { has: AD.locator("#maxLoginAttempts") }).getByText("Saved").waitFor();
const g = await mk(); await g.page.goto(B + "/register");
ok(await g.page.getByText(/Online registration is closed/).isVisible(), "Registration switch turns self-registration off");
await setSwitch(sw, true);
await AD.locator("section", { has: AD.locator("#maxLoginAttempts") }).getByRole("button", { name: "Save" }).click();
await AD.locator("section", { has: AD.locator("#maxLoginAttempts") }).getByText("Saved").first().waitFor();
await g.page.reload(); ok(await g.page.getByLabel("Name").isVisible(), "…and back on again");

// ---------- mobile layout ----------
const m = await mk({ ...devices["iPhone 13"] }); await login(m.page, "alyssa@example.com", "brand-new-pass-9"); await m.page.waitForURL(B + "/");
ok(await m.page.getByRole("navigation", { name: "Main" }).isVisible(), "Mobile shows the bottom nav");
ok(!(await m.page.locator("aside").isVisible()), "Mobile hides the sidebar");
const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok(!overflow, "No horizontal page scroll on mobile dashboard");
await m.page.goto(B + "/lot/1");
ok(!(await m.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), "No horizontal scroll on mobile item page");
await br.close();
