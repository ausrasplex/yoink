// Per-item listing rules (src/lib/listing.ts):  npm run test:unit
import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultWindow, phaseOf, shortDuration, visibleToUsers } from "../../src/lib/listing";

const at = (iso: string) => Date.parse(iso);
const w = { startsAt: "2026-11-10T09:00:00.000Z", endsAt: "2026-11-12T09:00:00.000Z" };

test("phase follows the item's own window (start inclusive, end exclusive)", () => {
  assert.equal(phaseOf(w, at("2026-11-10T08:59:59.999Z")), "scheduled");
  assert.equal(phaseOf(w, at("2026-11-10T09:00:00.000Z")), "open");
  assert.equal(phaseOf(w, at("2026-11-12T08:59:59.999Z")), "open");
  assert.equal(phaseOf(w, at("2026-11-12T09:00:00.000Z")), "ended");
  assert.equal(phaseOf({ startsAt: new Date(w.startsAt), endsAt: new Date(w.endsAt) }, at("2026-11-11T00:00:00Z")), "open");
});

test("Users never see listings hidden until they start", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  assert.deepEqual(visibleToUsers(now), { OR: [{ hiddenUntilStart: false }, { startsAt: { lte: now } }] });
});

test("new listings default to now → 7 days", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const d = defaultWindow(now);
  assert.equal(d.startsAt.toISOString(), "2026-11-08T12:00:00.000Z");
  assert.equal(d.endsAt.toISOString(), "2026-11-15T12:00:00.000Z");
});

test("short durations", () => {
  assert.equal(shortDuration(93_784_000), "1d 2h");
  assert.equal(shortDuration(7_380_000), "2h 3m");
  assert.equal(shortDuration(185_000), "3m 5s");
  assert.equal(shortDuration(-5_000), "0m 0s");
});
