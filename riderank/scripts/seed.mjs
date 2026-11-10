// Fill an empty install with sample cars (simple SVG illustrations) and
// ratings, so the leaderboard has something to show. Run with the server stopped:
//   node scripts/seed.mjs            (uses DATA_DIR or ./data)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStore } from '../lib/store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const uploads = path.join(dataDir, 'uploads');
fs.mkdirSync(uploads, { recursive: true });
const store = createStore(path.join(dataDir, 'db.json'));
const db = store.data;

if (Object.keys(db.cars).length && !process.argv.includes('--force')) {
  console.log('Database already has cars – not seeding. Use --force to add samples anyway.');
  process.exit(0);
}

const id = (n = 6) => crypto.randomBytes(n).toString('base64url');

function carSvg(body, sky, ground, roof) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${body}" stop-opacity=".95"/><stop offset="1" stop-color="${body}" stop-opacity=".7"/></linearGradient></defs>
<rect width="800" height="500" fill="url(#s)"/><rect y="360" width="800" height="140" fill="${ground}"/>
<ellipse cx="400" cy="372" rx="300" ry="18" fill="#000" opacity=".45"/>
<path d="M110 330 Q120 270 210 255 L${roof ? '300 190 Q400 160 500 190' : '290 200 Q400 185 520 200'} L610 255 Q690 265 700 330 Z" fill="url(#b)"/>
<path d="M${roof ? '315 200 Q400 176 490 200 L560 252 L260 252 Z' : '305 208 Q400 196 505 208 L570 252 L255 252 Z'}" fill="#9fd3ff" opacity=".55"/>
<rect x="398" y="200" width="6" height="55" fill="${body}"/>
<circle cx="245" cy="335" r="48" fill="#111"/><circle cx="245" cy="335" r="26" fill="#bbb"/>
<circle cx="565" cy="335" r="48" fill="#111"/><circle cx="565" cy="335" r="26" fill="#bbb"/>
<rect x="660" y="285" width="34" height="14" rx="6" fill="#ffe08a"/><rect x="112" y="290" width="26" height="12" rx="5" fill="#ff3b3b"/>
</svg>`;
}

const samples = [
  ['Mahindra', 'Thar Roxx', 2025, 'Desert Storm', 'Jaipur', 'Aarav', '#c56a2d', ['#f7b267', '#f4845f'], '#6b4226', true],
  ['Tata', 'Harrier EV', 2025, '', 'Pune', 'Meera', '#1f6feb', ['#0b1d3a', '#3a5a8c'], '#1a1f29', false],
  ['Maruti Suzuki', 'Swift', 2024, 'Red Rocket', 'Hyderabad', 'Imran', '#d62828', ['#ffd6a5', '#fdffb6'], '#555', false],
  ['Hyundai', 'Creta N Line', 2025, '', 'Bengaluru', 'Kavya', '#222831', ['#89c2d9', '#d8f3dc'], '#3d405b', true],
  ['Toyota', 'Fortuner Legender', 2024, 'Pearl', 'Chennai', 'Rahul', '#f1f1f1', ['#4361ee', '#4cc9f0'], '#2b2d42', true],
  ['Kia', 'Seltos', 2025, '', 'Kochi', 'Anjali', '#2a9d8f', ['#264653', '#e9c46a'], '#1d3557', false],
  ['Mahindra', 'XUV 3XO', 2025, 'Lime Light', 'Lucknow', 'Sameer', '#9ef01a', ['#10002b', '#3c096c'], '#240046', false],
  ['Honda', 'City', 2023, '', 'Dubai', 'Faisal', '#6c757d', ['#ffcad4', '#f4acb7'], '#4a4e69', false],
];

const now = Date.now();
const cars = [];
samples.forEach(([make, model, year, nickname, city, ownerName, color, sky, ground, roof], i) => {
  const mediaId = id(9);
  const file = `${mediaId}.svg`;
  fs.writeFileSync(path.join(uploads, file), carSvg(color, sky, ground, roof));
  const carId = id();
  db.media[mediaId] = { id: mediaId, file, type: 'image/svg+xml', kind: 'image', size: 0, ownerId: 'seed', carId, createdAt: now, seed: true };
  db.cars[carId] = {
    id: carId, title: nickname || `${year} ${make} ${model}`, make, model, year, nickname, city, ownerName,
    story: i === 0 ? 'Matte desert wrap, 33" all-terrains and a custom roof rack. Sunset drives only.' : '',
    mediaIds: [mediaId], ownerId: `seed-owner-${i}`, createdAt: now - (i + 1) * 3600_000, hidden: false, seed: true,
  };
  cars.push(carId);
});

// Random ratings: earlier cars skew higher. Leave the last two unrated ("fresh").
cars.slice(0, -2).forEach((carId, i) => {
  const voters = 6 + Math.floor(Math.random() * 25);
  for (let v = 0; v < voters; v++) {
    const base = 4.6 - i * 0.25;
    const stars = Math.max(1, Math.min(5, Math.round(base + (Math.random() - 0.5) * 2)));
    const voterId = `seed-voter-${v}`;
    db.votes[`${carId}|${voterId}`] = { carId, voterId, ipHash: `seed${v}`, stars, at: now - Math.random() * 5 * 86400_000 };
  }
});

store.save();
store.flush();
console.log(`Seeded ${cars.length} sample cars into ${dataDir}`);
