// Regenerates every icon size from assets/yoink-icon.png (the source artwork). Run: node assets/make-icons.mjs
import fs from "node:fs";
import sharp from "sharp";

const src = new URL("./yoink-icon.png", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const png = (size) => sharp(src).resize(size, size, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer();

const out = {
  "unraid/icon.png": 512,           // Unraid template icon
  "public/brand-default.png": 256,  // in-app logo until a Branding logo is uploaded
  "public/icon-512.png": 512,       // browser / PWA
  "public/icon-192.png": 192,
};
for (const [file, size] of Object.entries(out)) fs.writeFileSync(file, await png(size));

// Full-bleed versions for home screens: the artwork on a square of its own navy, no transparent corners.
// - maskable (Android installs): the launcher crops it to its own shape (circle, squircle…), so the artwork is shrunk
//   to keep everything inside the central "safe zone" (a circle 80% of the width).
// - apple-touch-icon (iOS rounds the corners itself and would fill transparent ones with black).
const NAVY = { r: 40, g: 31, b: 70, alpha: 1 }; // the icon's background colour
const onNavy = async (size, scale) => {
  const inner = Math.round(size * scale);
  let art = await sharp(src).resize(inner, inner, { kernel: "lanczos3" }).png().toBuffer();
  if (inner > size) { // scaled past the edges: keep the middle
    const off = Math.floor((inner - size) / 2);
    art = await sharp(art).extract({ left: off, top: off, width: size, height: size }).png().toBuffer();
  }
  return sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: art, gravity: "centre" }]).png({ compressionLevel: 9 }).toBuffer();
};
const fullBleed = {
  "public/icon-maskable-512.png": [512, 0.86],
  "public/icon-maskable-192.png": [192, 0.86],
  "public/apple-touch-icon.png": [180, 1.04], // slightly larger so the artwork's own rounded corners fall outside
};
for (const [file, [size, scale]] of Object.entries(fullBleed)) fs.writeFileSync(file, await onNavy(size, scale));

// favicon.ico with 16, 32 and 48 px images (PNG-encoded entries, supported by every current browser).
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s; e[1] = s; e[2] = 0; e[3] = 0; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(images[i].length, 8); e.writeUInt32LE(offset, 12); offset += images[i].length;
  return e;
});
fs.writeFileSync("public/favicon.ico", Buffer.concat([header, ...dir, ...images]));
console.log("icons written:", [...Object.keys(out), ...Object.keys(fullBleed), "public/favicon.ico"].join(", "));
