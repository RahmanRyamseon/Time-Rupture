// RideRank – rate cars on looks, live leaderboard, paid Spotlight slot.
// Zero-dependency Node.js (>= 20) server. Run: `node server.mjs`
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/store.mjs';
import { leaderboard, computeStats } from './lib/ranking.mjs';
import { sniff, LIMITS } from './lib/media.mjs';
import {
  DAY_MS, HOLD_MS, MAX_QUEUE_MS, nextFreeStart, activeSpotlight, occupying, expireHolds, markPaid,
} from './lib/spotlight.mjs';
import {
  createPaymentProvider, verifyStripeSignature, verifyRazorpayPayment, verifyRazorpayWebhook,
} from './lib/payments.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');

export function configFromEnv(env = process.env) {
  const port = Number(env.PORT || 3000);
  return {
    port,
    host: env.HOST || '0.0.0.0',
    siteName: env.SITE_NAME || 'RideRank',
    baseUrl: (env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, ''),
    dataDir: path.resolve(env.DATA_DIR || path.join(ROOT, 'data')),
    currency: (env.CURRENCY || 'INR').toUpperCase(),
    pricePerDay: Number(env.PRICE_PER_DAY || 49900), // minor units: 49900 = ₹499.00
    maxDays: Number(env.MAX_DAYS || 7),
    provider: (env.PAYMENT_PROVIDER || 'demo').toLowerCase(),
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    razorpayKeySecret: env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    stripeSecretKey: env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
    adminToken: env.ADMIN_TOKEN || '',
    trustProxy: env.TRUST_PROXY === '1',
    ipSalt: env.IP_SALT || 'change-me',
    reportsToHide: Number(env.REPORTS_TO_HIDE || 5),
  };
}

// ---------------------------------------------------------------- helpers

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const newId = (bytes = 9) => crypto.randomBytes(bytes).toString('base64url');

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'Request too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req, limit = 64 * 1024) {
  const ct = req.headers['content-type'] || '';
  if (!ct.startsWith('application/json')) throw new HttpError(415, 'Expected JSON');
  const raw = await readBody(req, limit);
  try { return JSON.parse(raw.toString('utf8') || '{}'); } catch { throw new HttpError(400, 'Invalid JSON'); }
}

function cleanText(v, max, { required = false, field = 'Field' } = {}) {
  const s = typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim() : '';
  if (required && !s) throw new HttpError(400, `${field} is required`);
  if (s.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return s;
}

/** Fixed-window in-memory rate limiter. */
function rateLimiter() {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, 60_000).unref();
  return (key, max, windowMs) => {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    h.n += 1;
    if (h.n > max) throw new HttpError(429, 'Slow down a little and try again shortly.');
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
};

// ---------------------------------------------------------------- app

export function createApp(cfg = configFromEnv()) {
  const store = createStore(path.join(cfg.dataDir, 'db.json'));
  const db = store.data;
  const uploadDir = path.join(cfg.dataDir, 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const payments = createPaymentProvider(cfg);
  const limit = rateLimiter();
  const sseClients = new Set();

  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    payments.name === 'razorpay'
      ? "script-src 'self' https://checkout.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com; connect-src 'self' https://*.razorpay.com"
      : "script-src 'self'; connect-src 'self'",
    "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
  ].join('; ');

  // ---- leaderboard caching + live push
  const lbCache = new Map();
  function getBoard(window) {
    const key = `${window}:${store.version}`;
    if (!lbCache.has(key)) {
      lbCache.clear();
      lbCache.set(key, leaderboard(db, { window }));
    }
    return lbCache.get(key);
  }

  let pushTimer = null;
  function changed() {
    store.save();
    if (pushTimer) return;
    pushTimer = setTimeout(() => {
      pushTimer = null;
      const msg = `event: update\ndata: ${JSON.stringify({ v: store.version, t: Date.now() })}\n\n`;
      for (const res of sseClients) res.write(msg);
    }, 400);
  }

  const housekeeping = setInterval(() => {
    const now = Date.now();
    let dirty = expireHolds(db, now);
    // Delete uploads that were never attached to a car within 6 hours.
    for (const m of Object.values(db.media)) {
      if (!m.carId && now - m.createdAt > 6 * 3600_000) {
        fs.rm(path.join(uploadDir, m.file), { force: true }, () => {});
        delete db.media[m.id];
        dirty = true;
      }
    }
    // Spotlight starting/ending changes what everyone sees.
    const active = activeSpotlight(db, now)?.id || null;
    if (active !== housekeeping.lastActive) { housekeeping.lastActive = active; dirty = true; }
    if (dirty) changed();
    for (const res of sseClients) res.write(': ping\n\n');
  }, 20_000);
  housekeeping.unref();

  // ---- serializers
  function publicCar(car, stats) {
    const media = car.mediaIds.map((id) => db.media[id]).filter(Boolean)
      .map((m) => ({ url: `/uploads/${m.file}`, type: m.type, kind: m.kind }));
    return {
      id: car.id, title: car.title, make: car.make, model: car.model, year: car.year,
      city: car.city, ownerName: car.ownerName, story: car.story, createdAt: car.createdAt,
      cover: media.find((m) => m.kind === 'image') || media[0] || null,
      hasVideo: media.some((m) => m.kind === 'video'),
      media,
      stats: stats ? {
        votes: stats.votes, avg: stats.avg && Math.round(stats.avg * 100) / 100,
        score: Math.round(stats.score * 1000) / 1000,
      } : null,
    };
  }

  function spotlightInfo(now = Date.now()) {
    const b = activeSpotlight(db, now);
    const car = b && db.cars[b.carId];
    const allTime = computeStats(db, { window: 'all' }).stats;
    return {
      current: car && !car.hidden
        ? { car: publicCar(car, allTime.get(car.id)), endsAt: b.endAt, startedAt: b.startAt }
        : null,
      nextFreeAt: nextFreeStart(db, DAY_MS, now),
      booked: occupying(db, now).filter((x) => x.status === 'paid')
        .map((x) => ({ startAt: x.startAt, endAt: x.endAt })),
    };
  }

  function bookingView(b) {
    return {
      id: b.id, carId: b.carId, days: b.days, amount: b.amount, currency: b.currency,
      status: b.status, startAt: b.startAt, endAt: b.endAt, holdUntil: b.holdUntil,
      rescheduled: !!b.rescheduled, provider: b.provider,
      carTitle: db.cars[b.carId]?.title,
    };
  }

  function confirmBooking(bookingId, details) {
    const r = markPaid(db, bookingId, details);
    if (r.ok) changed();
    return r;
  }

  // ---- identity: anonymous cookie id per browser + salted IP hash
  function identify(req, res) {
    const cookies = parseCookies(req.headers.cookie);
    let vid = cookies.rr_vid;
    if (!vid || !/^[\w-]{12,40}$/.test(vid)) {
      vid = newId(15);
      const secure = cfg.baseUrl.startsWith('https:') ? '; Secure' : '';
      res.setHeader('Set-Cookie',
        `rr_vid=${vid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${400 * 86400}${secure}`);
    }
    const ip = (cfg.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim())
      || req.socket.remoteAddress || '';
    const ipHash = crypto.createHash('sha256').update(cfg.ipSalt + ip).digest('base64url').slice(0, 16);
    return { vid, ipHash };
  }

  function send(res, status, body, headers = {}) {
    const json = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(json);
  }

  function requireAdmin(req) {
    const h = req.headers.authorization || '';
    const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
    const a = Buffer.from(tok);
    const b = Buffer.from(cfg.adminToken);
    if (!cfg.adminToken || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new HttpError(401, 'Admin token required');
    }
  }

  // ---------------------------------------------------------- routes
  async function api(req, res, url, who) {
    const { pathname } = url;
    const method = req.method;
    let m;

    if (method === 'GET' && pathname === '/api/config') {
      return send(res, 200, {
        siteName: cfg.siteName, currency: cfg.currency, pricePerDay: cfg.pricePerDay,
        maxDays: cfg.maxDays, provider: payments.name, ...payments.publicConfig,
        limits: LIMITS,
      });
    }

    if (method === 'GET' && pathname === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(`retry: 3000\nevent: hello\ndata: ${JSON.stringify({ v: store.version })}\n\n`);
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (method === 'GET' && pathname === '/api/leaderboard') {
      const window = url.searchParams.get('window') === 'all' ? 'all' : 'week';
      const board = getBoard(window);
      const myVotes = {};
      for (const v of Object.values(db.votes)) if (v.voterId === who.vid) myVotes[v.carId] = v.stars;
      const myCars = Object.values(db.cars).filter((c) => c.ownerId === who.vid)
        .map((c) => ({ id: c.id, title: c.title, hidden: !!c.hidden }));
      return send(res, 200, {
        window,
        version: store.version,
        mean: Math.round(board.mean * 100) / 100,
        totalVotes: board.totalVotes,
        ranked: board.ranked.slice(0, 100).map((r) => publicCar(r.car, r)),
        fresh: board.fresh.slice(0, 24).map((r) => publicCar(r.car, r)),
        spotlight: spotlightInfo(),
        myVotes,
        myCars,
      });
    }

    if (method === 'GET' && (m = pathname.match(/^\/api\/cars\/([\w-]+)$/))) {
      const car = db.cars[m[1]];
      if (!car || car.hidden) throw new HttpError(404, 'Car not found');
      const all = computeStats(db, { window: 'all' }).stats.get(car.id);
      const week = getBoard('week').ranked.findIndex((r) => r.car.id === car.id);
      return send(res, 200, {
        car: publicCar(car, all),
        weeklyRank: week >= 0 ? week + 1 : null,
        myVote: db.votes[`${car.id}|${who.vid}`]?.stars || null,
        isMine: car.ownerId === who.vid,
      });
    }

    // Upload one photo/video as the raw request body. Returns a media id that
    // is later attached to a car. Streams to disk and checks magic bytes.
    if (method === 'POST' && pathname === '/api/media') {
      limit(`up:${who.ipHash}`, 40, 3600_000);
      const declared = Number(req.headers['content-length'] || 0);
      if (declared > LIMITS.video) throw new HttpError(413, 'File too large (max 60 MB for videos, 8 MB for photos)');
      const id = newId();
      const tmp = path.join(uploadDir, `.${id}.part`);
      const out = fs.createWriteStream(tmp);
      let size = 0;
      let head = Buffer.alloc(0);
      try {
        await new Promise((resolve, reject) => {
          req.on('data', (c) => {
            size += c.length;
            if (head.length < 32) head = Buffer.concat([head, c]).subarray(0, 32);
            if (size > LIMITS.video) {
              reject(new HttpError(413, 'File too large (max 60 MB for videos)'));
              req.destroy();
              return;
            }
            if (!out.write(c)) { req.pause(); out.once('drain', () => req.resume()); }
          });
          req.on('end', () => out.end(resolve));
          req.on('error', reject);
          out.on('error', reject);
        });
        const kind = sniff(head);
        if (kind.error) throw new HttpError(415, kind.error);
        if (kind.kind === 'image' && size > LIMITS.image) throw new HttpError(413, 'Photo too large (max 8 MB)');
        const file = `${id}.${kind.ext}`;
        fs.renameSync(tmp, path.join(uploadDir, file));
        db.media[id] = {
          id, file, type: kind.type, kind: kind.kind, size, ownerId: who.vid, carId: null, createdAt: Date.now(),
        };
        store.save();
        return send(res, 201, { id, url: `/uploads/${file}`, type: kind.type, kind: kind.kind });
      } catch (err) {
        out.destroy();
        fs.rm(tmp, { force: true }, () => {});
        throw err;
      }
    }

    if (method === 'POST' && pathname === '/api/cars') {
      limit(`car:${who.ipHash}`, 10, 24 * 3600_000);
      const body = await readJson(req);
      const make = cleanText(body.make, 40, { required: true, field: 'Make' });
      const model = cleanText(body.model, 60, { required: true, field: 'Model' });
      const nickname = cleanText(body.nickname, 60);
      const year = body.year ? Number(body.year) : null;
      if (year !== null && (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1)) {
        throw new HttpError(400, 'Year looks wrong');
      }
      const ids = Array.isArray(body.mediaIds) ? [...new Set(body.mediaIds)].slice(0, 10) : [];
      const media = ids.map((id) => db.media[id]);
      if (!media.length) throw new HttpError(400, 'Add at least one photo or video');
      for (const mm of media) {
        if (!mm || mm.ownerId !== who.vid || mm.carId) throw new HttpError(400, 'One of the uploads is invalid. Please re-upload.');
      }
      const images = media.filter((x) => x.kind === 'image').length;
      const videos = media.length - images;
      if (images > LIMITS.imagesPerCar) throw new HttpError(400, `Max ${LIMITS.imagesPerCar} photos`);
      if (videos > LIMITS.videosPerCar) throw new HttpError(400, `Max ${LIMITS.videosPerCar} video`);
      if (body.confirmRights !== true) throw new HttpError(400, 'Please confirm you own these photos/videos');

      const id = newId(6);
      const car = {
        id,
        title: nickname || [year, make, model].filter(Boolean).join(' '),
        make, model, year, nickname,
        city: cleanText(body.city, 60),
        ownerName: cleanText(body.ownerName, 40, { required: true, field: 'Your name' }),
        story: cleanText(body.story, 600),
        mediaIds: media.map((x) => x.id),
        ownerId: who.vid,
        createdAt: Date.now(),
        hidden: false,
      };
      for (const mm of media) mm.carId = id;
      db.cars[id] = car;
      changed();
      return send(res, 201, { car: publicCar(car, null) });
    }

    if (method === 'POST' && (m = pathname.match(/^\/api\/cars\/([\w-]+)\/rate$/))) {
      limit(`rate:${who.ipHash}`, 120, 600_000);
      const car = db.cars[m[1]];
      if (!car || car.hidden) throw new HttpError(404, 'Car not found');
      if (car.ownerId === who.vid) throw new HttpError(403, "You can't rate your own car");
      const body = await readJson(req);
      const stars = Number(body.stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new HttpError(400, 'Rating must be 1–5 stars');
      const key = `${car.id}|${who.vid}`;
      if (!db.votes[key]) {
        // Cheap ballot-stuffing brake: at most 3 browsers per network per car.
        const sameNet = Object.values(db.votes).filter((v) => v.carId === car.id && v.ipHash === who.ipHash).length;
        if (sameNet >= 3) throw new HttpError(429, 'Too many ratings for this car from your network');
      }
      db.votes[key] = { carId: car.id, voterId: who.vid, ipHash: who.ipHash, stars, at: Date.now() };
      changed();
      const s = computeStats(db, { window: 'all' }).stats.get(car.id);
      return send(res, 200, { ok: true, stars, stats: { votes: s.votes, avg: s.avg } });
    }

    if (method === 'POST' && (m = pathname.match(/^\/api\/cars\/([\w-]+)\/report$/))) {
      limit(`rep:${who.ipHash}`, 20, 3600_000);
      const car = db.cars[m[1]];
      if (!car) throw new HttpError(404, 'Car not found');
      const body = await readJson(req);
      const reason = cleanText(body.reason, 300, { required: true, field: 'Reason' });
      db.reports[`${car.id}|${who.vid}`] = { carId: car.id, voterId: who.vid, reason, at: Date.now() };
      const count = Object.values(db.reports).filter((r) => r.carId === car.id).length;
      if (count >= cfg.reportsToHide && !car.hidden) { car.hidden = true; car.hiddenReason = 'reports'; }
      changed();
      return send(res, 200, { ok: true });
    }

    // ---- Spotlight (paid top slot)
    if (method === 'GET' && pathname === '/api/spotlight') {
      return send(res, 200, spotlightInfo());
    }

    if (method === 'POST' && pathname === '/api/spotlight/checkout') {
      limit(`buy:${who.ipHash}`, 15, 3600_000);
      const body = await readJson(req);
      const car = db.cars[body.carId];
      if (!car || car.hidden) throw new HttpError(404, 'Car not found');
      if (car.ownerId !== who.vid) throw new HttpError(403, 'You can only buy the Spotlight for your own car');
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > cfg.maxDays) {
        throw new HttpError(400, `Choose between 1 and ${cfg.maxDays} days`);
      }
      const now = Date.now();
      expireHolds(db, now);
      const duration = days * DAY_MS;
      const startAt = nextFreeStart(db, duration, now);
      if (startAt - now > MAX_QUEUE_MS) throw new HttpError(409, 'The Spotlight is fully booked for now. Try again later.');
      const booking = {
        id: newId(), carId: car.id, ownerId: who.vid, days,
        amount: cfg.pricePerDay * days, currency: cfg.currency,
        status: 'pending', provider: payments.name,
        createdAt: now, holdUntil: now + HOLD_MS, startAt, endAt: startAt + duration,
      };
      db.bookings[booking.id] = booking;
      let checkout;
      try {
        const r = await payments.createCheckout(booking, car);
        booking.providerRef = r.ref;
        checkout = r.checkout;
      } catch (err) {
        booking.status = 'failed';
        store.save();
        console.error(err);
        throw new HttpError(502, 'Could not start the payment. Please try again.');
      }
      store.save();
      return send(res, 201, { booking: bookingView(booking), checkout });
    }

    if (method === 'GET' && (m = pathname.match(/^\/api\/bookings\/([\w-]+)$/))) {
      const b = db.bookings[m[1]];
      if (!b || b.ownerId !== who.vid) throw new HttpError(404, 'Booking not found');
      if (b.status === 'pending' && b.holdUntil <= Date.now()) b.status = 'expired';
      return send(res, 200, { booking: bookingView(b) });
    }

    if (method === 'POST' && pathname === '/api/payments/demo/confirm') {
      if (payments.name !== 'demo') throw new HttpError(404, 'Not found');
      const body = await readJson(req);
      const b = db.bookings[body.bookingId];
      if (!b || b.ownerId !== who.vid) throw new HttpError(404, 'Booking not found');
      const r = confirmBooking(b.id, { amount: b.amount, currency: b.currency, ref: `demo_pay_${newId()}` });
      if (!r.ok) throw new HttpError(400, r.error);
      return send(res, 200, { booking: bookingView(r.booking) });
    }

    if (method === 'POST' && pathname === '/api/payments/razorpay/verify') {
      if (payments.name !== 'razorpay') throw new HttpError(404, 'Not found');
      const body = await readJson(req);
      const b = Object.values(db.bookings).find((x) => x.providerRef === body.razorpay_order_id);
      if (!b || b.ownerId !== who.vid) throw new HttpError(404, 'Booking not found');
      const ok = verifyRazorpayPayment({
        orderId: b.providerRef, paymentId: body.razorpay_payment_id, signature: body.razorpay_signature,
      }, cfg.razorpayKeySecret);
      if (!ok) throw new HttpError(400, 'Payment signature mismatch');
      const r = confirmBooking(b.id, { ref: body.razorpay_payment_id });
      if (!r.ok) throw new HttpError(400, r.error);
      return send(res, 200, { booking: bookingView(r.booking) });
    }

    if (method === 'POST' && pathname === '/api/payments/razorpay/webhook') {
      const raw = await readBody(req, 512 * 1024);
      if (!verifyRazorpayWebhook(raw, req.headers['x-razorpay-signature'], cfg.razorpayWebhookSecret)) {
        throw new HttpError(400, 'Bad signature');
      }
      const evt = JSON.parse(raw.toString('utf8'));
      if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
        const pay = evt.payload?.payment?.entity;
        const order = evt.payload?.order?.entity;
        const orderId = order?.id || pay?.order_id;
        const b = Object.values(db.bookings).find((x) => x.providerRef === orderId);
        if (b) {
          const r = confirmBooking(b.id, { amount: pay?.amount ?? order?.amount_paid, currency: pay?.currency ?? order?.currency, ref: pay?.id });
          if (!r.ok) console.error('razorpay webhook:', b.id, r.error);
        }
      }
      return send(res, 200, { received: true });
    }

    if (method === 'POST' && pathname === '/api/payments/stripe/webhook') {
      const raw = await readBody(req, 512 * 1024);
      if (!verifyStripeSignature(raw, req.headers['stripe-signature'], cfg.stripeWebhookSecret)) {
        throw new HttpError(400, 'Bad signature');
      }
      const evt = JSON.parse(raw.toString('utf8'));
      const s = evt.data?.object;
      const b = s && db.bookings[s.metadata?.bookingId || s.client_reference_id];
      if (b && (evt.type === 'checkout.session.completed' || evt.type === 'checkout.session.async_payment_succeeded')) {
        if (s.payment_status === 'paid') {
          const r = confirmBooking(b.id, { amount: s.amount_total, currency: s.currency, ref: s.payment_intent || s.id });
          if (!r.ok) console.error('stripe webhook:', b.id, r.error);
        }
      } else if (b && evt.type === 'checkout.session.expired' && b.status === 'pending') {
        b.status = 'expired';
        store.save();
      }
      return send(res, 200, { received: true });
    }

    // ---- Moderation (Authorization: Bearer $ADMIN_TOKEN)
    if (method === 'GET' && pathname === '/api/admin/reports') {
      requireAdmin(req);
      const byCar = {};
      for (const r of Object.values(db.reports)) (byCar[r.carId] ||= []).push({ reason: r.reason, at: r.at });
      return send(res, 200, {
        cars: Object.entries(byCar).map(([id, reports]) => ({
          id, title: db.cars[id]?.title, hidden: !!db.cars[id]?.hidden, reports,
        })),
      });
    }

    if (method === 'POST' && (m = pathname.match(/^\/api\/admin\/cars\/([\w-]+)\/(hide|unhide)$/))) {
      requireAdmin(req);
      const car = db.cars[m[1]];
      if (!car) throw new HttpError(404, 'Car not found');
      car.hidden = m[2] === 'hide';
      car.hiddenReason = car.hidden ? 'admin' : undefined;
      changed();
      return send(res, 200, { ok: true, hidden: car.hidden });
    }

    throw new HttpError(404, 'Not found');
  }

  // ---------------------------------------------------------- static files
  function serveFile(req, res, file, { download = false, upload = false } = {}) {
    let st;
    try { st = fs.statSync(file); } catch { return false; }
    if (!st.isFile()) return false;
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': upload ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Last-Modified': st.mtime.toUTCString(),
    };
    if (upload) headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
    if (download) headers['Content-Disposition'] = 'attachment';
    // Range support is required for video seeking (and for Safari to play at all).
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      let start = range[1] === '' ? st.size - Number(range[2]) : Number(range[1]);
      let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : st.size - 1;
      start = Math.max(0, start);
      end = Math.min(end, st.size - 1);
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
        res.end();
        return true;
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') return res.end(), true;
      fs.createReadStream(file, { start, end }).pipe(res);
      return true;
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end(), true;
    fs.createReadStream(file).pipe(res);
    return true;
  }

  // ---------------------------------------------------------- server
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { res.writeHead(400); return res.end(); }

    try {
      if (url.pathname.startsWith('/api/')) {
        // Webhooks come from the payment provider, not the browser: no cookie/origin checks.
        const isWebhook = url.pathname.endsWith('/webhook');
        if (req.method !== 'GET' && !isWebhook) {
          const origin = req.headers.origin;
          let originHost = null;
          try { originHost = origin && new URL(origin).host; } catch { /* "null" etc. */ }
          if (origin && origin !== cfg.baseUrl && originHost !== req.headers.host) {
            throw new HttpError(403, 'Cross-site request blocked');
          }
        }
        const who = isWebhook ? null : identify(req, res);
        return await api(req, res, url, who);
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');

      if (url.pathname.startsWith('/uploads/')) {
        const name = path.basename(url.pathname);
        if (!/^[\w-]+\.\w+$/.test(name) || !serveFile(req, res, path.join(uploadDir, name), { upload: true })) {
          throw new HttpError(404, 'Not found');
        }
        return;
      }

      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.join(PUBLIC_DIR, path.normalize(rel));
      if (!file.startsWith(PUBLIC_DIR + path.sep)) throw new HttpError(404, 'Not found');
      if (file.endsWith('.html')) res.setHeader('Content-Security-Policy', csp);
      if (!serveFile(req, res, file)) throw new HttpError(404, 'Not found');
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      if (res.headersSent) return res.end();
      send(res, status, { error: status === 500 ? 'Something went wrong' : err.message });
    }
  });

  server.on('close', () => {
    clearInterval(housekeeping);
    for (const r of sseClients) r.end();
    store.flush();
  });

  return { server, store, cfg };
}

// Run directly: `node server.mjs`
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cfg = configFromEnv();
  const { server, store } = createApp(cfg);
  server.listen(cfg.port, cfg.host, () => {
    console.log(`${cfg.siteName} running at ${cfg.baseUrl}  (payments: ${cfg.provider})`);
    if (cfg.provider === 'demo') console.log('⚠  Demo payments are simulated. Set PAYMENT_PROVIDER=razorpay or stripe for real money.');
  });
  const stop = () => { store.flush(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
