/**
 * Demo data for trying out the screens: `npm run seed:demo`.
 * Replaces all items, bids and user (bidder) accounts, and adds a demo admin. Do NOT run against a real event.
 * The server admin is left alone: create it first at /setup.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads");

// ---- tiny PNG generator: soft gradient with a big circle, in the app's palette ----
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const t = Buffer.from(type), len = Buffer.alloc(4), sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, sum]);
};
type RGB = [number, number, number];
function png(w: number, h: number, a: RGB, b: RGB, circle: RGB, cx: number, cy: number, r: number) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const t = (x / w + y / h) / 2;
      const d = Math.hypot(x - cx * w, y - cy * h) / (r * w);
      const inCircle = Math.min(1, Math.max(0, (1 - d) * 12)); // soft edge
      const o = y * (w * 3 + 1) + 1 + x * 3;
      for (let i = 0; i < 3; i++) {
        const base = a[i] + (b[i] - a[i]) * t;
        raw[o + i] = Math.round(base + (circle[i] - base) * inCircle);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}
const LILAC: RGB = [185, 164, 250], PEACH: RGB = [253, 223, 186], LIME: RGB = [233, 249, 76], INK: RGB = [42, 39, 66], PAPER: RGB = [244, 242, 250];
const palettes: [RGB, RGB, RGB][] = [
  [LILAC, PAPER, PEACH], [PEACH, PAPER, LILAC], [LIME, PAPER, LILAC], [PAPER, LILAC, LIME], [INK, LILAC, LIME], [PEACH, LIME, LILAC],
];
function saveImage(seed: number, variant: number): string {
  const [a, b, c] = palettes[(seed + variant) % palettes.length];
  const name = `${crypto.randomBytes(16).toString("hex")}.png`;
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, name), png(640, 480, a, b, c, 0.3 + 0.4 * ((seed + variant) % 3) / 2, 0.55, 0.28 + 0.04 * variant));
  return name;
}

// ---- data ----
const people = [
  { name: "Alyssa Moore", email: "alyssa@example.com", shift: "Day" },
  { name: "Jordan Lee", email: "jordan@example.com", shift: "Night" },
  { name: "Sam Patel", email: "sam@example.com", shift: "Afternoon" },
  { name: "Riley Chen", email: "riley@example.com", shift: "Day" },
];
const items = [
  { title: "Signed Collingwood guernsey", description: "Framed, authenticated and signed by the 2023 squad.\nComes with a certificate of authenticity.", start: 50, inc: 5, imgs: 2, bids: [[1, 55, 1300], [2, 60, 900], [0, 70, 500], [1, 75, 200], [0, 85, 20]] },
  { title: "Weekend away at Phillip Island", description: "Two nights for four in a beachfront cottage. Valid for 12 months, excluding school holidays.", start: 150, inc: 10, imgs: 2, bids: [[2, 160, 1200], [3, 180, 800], [2, 200, 300], [1, 220, 40]] },
  { title: "Handmade ceramic dinner set", description: "Twelve-piece stoneware set by a local potter. Dishwasher safe.", start: 40, inc: 5, imgs: 1, bids: [[3, 45, 600], [0, 55, 100]] },
  { title: "Craft beer hamper", description: "Twelve local craft beers, two glasses and a bottle opener.", start: 30, inc: 5, imgs: 1, bids: [] as number[][] },
  { title: "Dinner for two on Lygon Street", description: "Three courses with matched wines at a family-run Italian favourite.", start: 80, inc: 10, imgs: 1, bids: [[1, 80, 700], [0, 90, 400], [3, 100, 90]] },
  { title: "Electric guitar (Squier Strat)", description: "Sunburst finish, includes a padded gig bag and lead.", start: 120, inc: 10, imgs: 2, bids: [[2, 120, 1000]] },
  { title: "Framed local landscape painting", description: "Original oil on canvas, 60 × 90 cm, by a Yarra Valley artist.", start: 60, inc: 5, imgs: 1, bids: [] as number[][] },
  { title: "Power tool combo kit", description: "18V drill driver, impact driver, two batteries and a charger.", start: 100, inc: 10, imgs: 1, bids: [[3, 110, 1400], [1, 120, 1100], [3, 130, 60]] },
];

async function main() {
  await db.session.deleteMany({ where: { user: { role: "USER" } } });
  await db.item.deleteMany();
  await db.$executeRawUnsafe(`ALTER SEQUENCE "Item_lot_seq" RESTART WITH 1`); // demo lots start at 1
  await db.user.deleteMany({ where: { role: "USER" } });
  await db.loginAttempt.deleteMany();

  const hash = await bcrypt.hash("demo-password-1", 10);
  const users = [];
  for (const p of people) users.push(await db.user.create({ data: { ...p, passwordHash: hash } }));
  // Normally the server admin invites admins; the demo (and tests/e2e) needs one ready to go.
  const demoAdmin = await db.user.findUnique({ where: { email: "admin@example.com" } });
  if (demoAdmin?.role !== "SERVER_ADMIN") await db.user.upsert({
    where: { email: "admin@example.com" },
    update: { role: "ADMIN", passwordHash: await bcrypt.hash("change-me-please", 10), mustChangePassword: false },
    create: { email: "admin@example.com", name: "Demo Admin", role: "ADMIN", passwordHash: await bcrypt.hash("change-me-please", 10) },
  });

  await db.auction.upsert({
    where: { id: 1 },
    update: { appName: "Spring Charity Gala", registrationOpen: true, terms: "All proceeds support the local community hall.\nWinners must collect and pay on the night, or within 7 days.\nAll sales are final." },
    create: { id: 1 },
  });

  for (const [n, it] of items.entries()) {
    const item = await db.item.create({ data: {
      title: it.title, description: it.description, startingBid: it.start, minIncrement: it.inc,
      startsAt: new Date(Date.now() - 2 * 86_400_000), endsAt: new Date(Date.now() + (2 * 24 + 4) * 3600_000 + 17 * 60_000),
    } });
    for (let v = 0; v < it.imgs; v++) await db.itemImage.create({ data: { itemId: item.id, filename: saveImage(n, v), position: v } });
    let last: { u: string; amount: number } | null = null;
    for (const [ui, amount, minsAgo] of it.bids) {
      await db.bid.create({ data: { itemId: item.id, userId: users[ui].id, amount, createdAt: new Date(Date.now() - minsAgo * 60_000) } });
      last = { u: users[ui].id, amount };
    }
    if (last) await db.item.update({ where: { id: item.id }, data: { currentBid: last.amount, highBidderId: last.u } });
  }
  console.log(`Demo data ready. Users: alyssa@example.com / demo-password-1. Admin: admin@example.com / change-me-please.`);
}
main().finally(() => db.$disconnect());
