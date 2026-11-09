// Themes: theme.json rules, dated switching, wording, and the zip installer's safety checks.  npm run test:unit
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { copyFor, DEFAULT_COPY } from "../../src/lib/theme/copy";
import { inWindow, themeSchema } from "../../src/lib/theme/schema";
import * as store from "../../src/lib/theme/store";

// Installed themes go to a throwaway folder; built-in ones are the real themes/ folder.
// (The store reads these when called, not when imported.)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "yoink-themes-"));
process.env.THEMES_DIR = tmp;
process.env.BUILTIN_THEMES_DIR = path.resolve("themes");

const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const zip = (files: Record<string, string | Uint8Array>) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === "string" ? strToU8(v) : v])));
const json = (o: object) => JSON.stringify(o);

test("date windows, including ones that wrap past New Year", () => {
  assert.ok(inWindow({ from: "12-01", to: "12-26" }, "12-25"));
  assert.ok(!inWindow({ from: "12-01", to: "12-26" }, "12-27"));
  assert.ok(inWindow({ from: "12-20", to: "01-05" }, "01-02"));
  assert.ok(inWindow({ from: "12-20", to: "01-05" }, "12-31"));
  assert.ok(!inWindow({ from: "12-20", to: "01-05" }, "06-01"));
});

test("theme.json validation", () => {
  assert.ok(themeSchema.safeParse({ name: "Minimal" }).success);
  assert.ok(!themeSchema.safeParse({ name: "X", colours: { ink: "red" } }).success);
  assert.ok(!themeSchema.safeParse({ name: "X", active: { from: "13-01", to: "12-01" } }).success);
  assert.ok(!themeSchema.safeParse({ name: "X", effect: "lasers" }).success);
  for (const effect of ["hearts", "bubbles", "stars", "fireworks"]) assert.ok(themeSchema.safeParse({ name: "X", effect }).success, effect);
  assert.equal(themeSchema.parse({ name: "X" }).celebration, "confetti"); // default burst
  assert.ok(themeSchema.safeParse({ name: "X", celebration: "hearts" }).success);
  assert.ok(!themeSchema.safeParse({ name: "X", celebration: "bats" }).success);
  assert.ok(!themeSchema.safeParse({ name: "X", copy: { notAKey: "hi" } }).success, "unknown wording keys are rejected");
  assert.ok(!themeSchema.safeParse({ name: "X", images: { icon: "../../etc/passwd.png" } }).success, "no paths in file names");
});

test("built-in themes are all valid", () => {
  const list = store.listThemes();
  for (const id of ["christmas", "halloween", "autumn", "britney"]) {
    const t = list.find((x) => x.id === id);
    assert.ok(t?.ok, `${id}: ${t && !t.ok ? t.error : "missing"}`);
  }
});

test("wording: defaults, placeholders and stable variants", () => {
  assert.equal(copyFor(undefined, "placeBid"), DEFAULT_COPY.placeBid);
  assert.equal(copyFor(undefined, "bidPlaced", { amount: "$50" }), "Bid of $50 placed");
  const table = { outbidTitle: ["A", "B", "C"] };
  const day = "2026-12-01";
  const first = copyFor(table, "outbidTitle", {}, day);
  for (let i = 0; i < 5; i++) assert.equal(copyFor(table, "outbidTitle", {}, day), first, "same pick all day");
  assert.ok(["A", "B", "C"].includes(first));
});

test("installer rejects unsafe or broken zips", () => {
  const ok = { name: "Party" };
  assert.throws(() => store.installThemeZip(zip({ "party/../../evil.png": PNG, "party/theme.json": json(ok) })), /sub-folders|folder/);
  assert.throws(() => store.installThemeZip(zip({ "party/a/b.png": PNG, "party/theme.json": json(ok) })), /sub-folders/);
  assert.throws(() => store.installThemeZip(zip({ "party/hack.js": "alert(1)", "party/theme.json": json(ok) })), /only images/);
  assert.throws(() => store.installThemeZip(zip({ "party/fake.png": "not a png", "party/theme.json": json(ok) })), /isn't a real PNG/);
  assert.throws(() => store.installThemeZip(zip({ "party/theme.json": json({ name: "P", images: { icon: "icon.png" } }) })), /isn't in the zip/);
  assert.throws(() => store.installThemeZip(zip({ "party/icon.png": PNG })), /needs a theme.json/);
  assert.throws(() => store.installThemeZip(zip({ "yoink/theme.json": json(ok) })), /built-in default/);
  assert.throws(() => store.installThemeZip(strToU8("not a zip")), /valid .zip/);
});

test("installer: install, list, preview, replace and delete", () => {
  const id = store.installThemeZip(zip({
    "party/theme.json": json({ name: "Party", effect: "confetti", images: { icon: "icon.png" }, copy: { placeBid: "Party on" } }),
    "party/icon.png": PNG,
    "party/logo.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><rect width="10" height="10"/></svg>`,
  }));
  assert.equal(id, "party");
  const svg = fs.readFileSync(path.join(tmp, "party", "logo.svg"), "utf8");
  assert.doesNotMatch(svg, /script|onload|alert/, "SVGs are sanitised on install");
  const t = store.listThemes().find((x) => x.id === "party");
  assert.ok(t?.ok && t.source === "installed");

  const active = store.activeTheme("auto", "party"); // preview wins
  assert.equal(active.id, "party");
  assert.equal(active.effect, "confetti");
  assert.match(active.images.icon!, /^\/theme-assets\/party\/icon\.png\?v=/);
  assert.equal(copyFor(active.copy, "placeBid"), "Party on");
  assert.equal(store.readAsset("party", "../theme.json"), null, "assets can't escape the folder");
  assert.ok(store.readAsset("party", "icon.png"));

  assert.ok(store.deleteInstalledTheme("party"));
  assert.ok(!store.listThemes().some((x) => x.id === "party"));
  assert.ok(!store.deleteInstalledTheme("christmas"), "built-in themes can't be deleted");
});

test("automatic mode picks the dated theme for today, else the default", () => {
  assert.equal(store.pickTheme("auto", null, new Date("2026-12-24T12:00:00+11:00")).id, "christmas");
  assert.equal(store.pickTheme("auto", null, new Date("2026-10-31T12:00:00+11:00")).id, "halloween");
  assert.equal(store.pickTheme("auto", null, new Date("2026-07-01T12:00:00+10:00")).id, "yoink");
  assert.equal(store.pickTheme("britney", null, new Date("2026-12-24T12:00:00+11:00")).id, "britney", "a chosen theme stays on");
});

// ---- the guides stay in step with the code ----
test("both guides document every wording key", () => {
  const { COPY_KEYS } = require("../../src/lib/theme/copy") as typeof import("../../src/lib/theme/copy");
  for (const file of ["themes/THEMES.md", "themes/AI-THEME-GUIDE.md"]) {
    const text = fs.readFileSync(file, "utf8");
    const missing = COPY_KEYS.filter((k) => !text.includes(`\`${k}\``));
    assert.deepEqual(missing, [], `${file} is missing: ${missing.join(", ")}`);
  }
});

test("theme.schema.json matches the app's rules (run npm run themes:schema)", () => {
  const { buildThemeJsonSchema } = require("../../scripts/theme-schema") as typeof import("../../scripts/theme-schema");
  assert.deepEqual(JSON.parse(fs.readFileSync("themes/theme.schema.json", "utf8")), JSON.parse(JSON.stringify(buildThemeJsonSchema())));
});

test("the AI guide's complete example is a valid theme", () => {
  const { sanitizeSvg } = require("../../src/lib/svg") as typeof import("../../src/lib/svg");
  const guide = fs.readFileSync("themes/AI-THEME-GUIDE.md", "utf8");
  const example = guide.slice(guide.indexOf("## Example (complete)"));
  const json = example.match(/```json\n([\s\S]*?)```/)![1];
  const parsed = themeSchema.safeParse(JSON.parse(json));
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues[0]));
  const svg = example.match(/```svg\n([\s\S]*?)```/)![1];
  assert.match(sanitizeSvg(Buffer.from(svg)), /<path/, "example SVG survives the cleaner");
  // and the short example at the top of the guide too
  const top = guide.match(/```json\n([\s\S]*?)```/)![1];
  assert.ok(themeSchema.safeParse(JSON.parse(top)).success);
});

test("the starter template (with its guides) installs as-is", () => {
  const read = (f: string) => fs.readFileSync(path.join("themes", f), "utf8");
  const zipped = store.templateZip({ "README.md": read("THEMES.md"), "AI-THEME-GUIDE.md": read("AI-THEME-GUIDE.md"), "theme.schema.json": read("theme.schema.json") });
  const id = store.installThemeZip(zipped);
  assert.equal(id, "my-theme");
  assert.ok(store.listThemes().find((t) => t.id === "my-theme")?.ok);
  assert.equal(store.readAsset("my-theme", "AI-THEME-GUIDE.md"), null, "notes are kept but never served");
  store.deleteInstalledTheme("my-theme");
});
