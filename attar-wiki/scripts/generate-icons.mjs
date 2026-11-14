// Generates PWA icons and iOS splash screens from public/brand/mark.svg.
// Usage: npm run icons
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/brand/mark.svg", import.meta.url));
const out = new URL("../public/icons/", import.meta.url);
const splashOut = new URL("../public/splash/", import.meta.url);
await mkdir(out, { recursive: true });
await mkdir(splashOut, { recursive: true });

const PARCHMENT = { r: 251, g: 246, b: 238, alpha: 1 };
const BARK = { r: 59, g: 36, b: 20, alpha: 1 };

for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(new URL(`icon-${size}.png`, out).pathname);
}
await sharp(svg).resize(180, 180).png().toFile(new URL("apple-touch-icon.png", out).pathname);
await sharp(svg).resize(32, 32).png().toFile(new URL("favicon-32.png", out).pathname);

// Maskable: mark at 70% on a full-bleed background (safe zone).
const inner = await sharp(svg).resize(358, 358).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: BARK } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(new URL("maskable-512.png", out).pathname);

// iOS splash screens (portrait) for common devices.
export const SPLASH = [
  [1290, 2796], // iPhone 15/16 Pro Max
  [1179, 2556], // iPhone 15/16 Pro
  [1170, 2532], // iPhone 12–14
  [1125, 2436], // iPhone X/XS/11 Pro
  [828, 1792], // iPhone XR/11
  [750, 1334], // iPhone SE
  [1640, 2360], // iPad Air
  [2048, 2732], // iPad Pro 12.9
];
for (const [w, h] of SPLASH) {
  const mark = await sharp(svg).resize(Math.round(w * 0.28)).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: PARCHMENT } })
    .composite([{ input: mark, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(new URL(`splash-${w}x${h}.png`, splashOut).pathname);
}
console.log("Icons and splash screens written to public/icons and public/splash");
