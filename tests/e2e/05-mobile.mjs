import { chromium, devices } from "playwright";
const B = process.env.BASE_URL ?? "http://localhost:3000";
const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) process.exitCode = 1; };
const br = await chromium.launch();
for (const [name, dev] of [["iPhone 13", devices["iPhone 13"]], ["small 320px", { viewport: { width: 320, height: 640 } }]]) {
  const ctx = await br.newContext(dev); const p = await ctx.newPage();
  await p.goto(B + "/login"); await p.getByLabel("Email").fill("alyssa@example.com"); await p.getByLabel("Password").fill("brand-new-pass-9");
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.waitForURL(B + "/");
  ok(await p.getByRole("navigation", { name: "Main" }).isVisible(), `${name}: bottom nav visible`);
  ok(!(await p.locator("aside").first().isVisible()), `${name}: sidebar hidden`);
  for (const path of ["/", "/items", "/lot/1", "/bids", "/settings"]) {
    await p.goto(B + path); await p.waitForTimeout(300);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(wide <= 1, `${name}: no horizontal scroll on ${path} (overflow ${wide}px)`);
  }
}
await br.close();
