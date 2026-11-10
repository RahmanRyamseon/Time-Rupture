import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { leaderboard } from '../lib/ranking.mjs';
import { sniff } from '../lib/media.mjs';
import { nextFreeStart, markPaid, activeSpotlight, DAY_MS, HOLD_MS } from '../lib/spotlight.mjs';
import { verifyStripeSignature, verifyRazorpayPayment, verifyRazorpayWebhook, hmacHex } from '../lib/payments.mjs';
import { createApp, configFromEnv } from '../server.mjs';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from('ftypisom'), Buffer.alloc(64)]);

test('bayesian ranking: volume beats a single lucky vote', () => {
  const data = { cars: {}, votes: {} };
  const now = Date.now();
  for (const id of ['a', 'b', 'c']) data.cars[id] = { id, createdAt: now, hidden: false };
  data.votes['a|1'] = { carId: 'a', voterId: '1', stars: 5, at: now }; // 1 vote, 5.0 avg
  for (let i = 0; i < 40; i++) data.votes[`b|${i}`] = { carId: 'b', voterId: String(i), stars: i % 5 ? 5 : 4, at: now }; // 4.8 avg
  for (let i = 0; i < 40; i++) data.votes[`c|${i}`] = { carId: 'c', voterId: String(i), stars: i % 2 ? 3 : 2, at: now }; // 2.5 avg
  const { ranked } = leaderboard(data, { window: 'all' });
  assert.deepEqual(ranked.map((r) => r.car.id), ['b', 'a', 'c']);
});

test('weekly window ignores old votes', () => {
  const now = Date.now();
  const data = { cars: { a: { id: 'a', createdAt: 0 } }, votes: { 'a|1': { carId: 'a', voterId: '1', stars: 5, at: now - 8 * DAY_MS } } };
  assert.equal(leaderboard(data, { window: 'week', now }).ranked.length, 0);
  assert.equal(leaderboard(data, { window: 'all', now }).ranked.length, 1);
});

test('sniff detects real types and rejects others', () => {
  assert.equal(sniff(PNG).type, 'image/png');
  assert.equal(sniff(MP4).kind, 'video');
  assert.ok(sniff(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).error);
  assert.ok(sniff(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(8)])).error);
});

test('spotlight scheduling fills gaps and reschedules late payments', () => {
  const now = 1_000_000_000_000;
  const data = { bookings: {
    x: { id: 'x', status: 'paid', startAt: now + 2 * DAY_MS, endAt: now + 3 * DAY_MS },
  } };
  assert.equal(nextFreeStart(data, DAY_MS, now), now); // gap before x fits 1 day
  assert.equal(nextFreeStart(data, 3 * DAY_MS, now), now + 3 * DAY_MS); // 3 days doesn't fit
  data.bookings.y = { id: 'y', status: 'pending', amount: 100, currency: 'INR', holdUntil: now + HOLD_MS, startAt: now, endAt: now + DAY_MS };
  // y lapses, z takes its place, then y pays late -> moved after everything.
  data.bookings.y.holdUntil = now - 1;
  data.bookings.z = { id: 'z', status: 'paid', startAt: now, endAt: now + DAY_MS };
  const r = markPaid(data, 'y', { amount: 100, currency: 'inr' }, now);
  assert.ok(r.ok);
  assert.equal(r.booking.startAt, now + DAY_MS); // the free gap between z and x
  assert.equal(activeSpotlight(data, now).id, 'z');
  assert.equal(markPaid(data, 'y', {}, now).ok, true); // idempotent
});

test('markPaid rejects wrong amounts', () => {
  const data = { bookings: { y: { id: 'y', status: 'pending', amount: 100, currency: 'INR', holdUntil: Infinity, startAt: 0, endAt: 1 } } };
  assert.equal(markPaid(data, 'y', { amount: 1 }).ok, false);
});

test('payment signatures', () => {
  const body = Buffer.from('{"id":"evt"}');
  const t = Math.floor(Date.now() / 1000);
  const sig = hmacHex('whsec', `${t}.${body}`);
  assert.ok(verifyStripeSignature(body, `t=${t},v1=${sig}`, 'whsec'));
  assert.ok(!verifyStripeSignature(body, `t=${t},v1=${sig}`, 'other'));
  assert.ok(!verifyStripeSignature(body, `t=${t - 3600},v1=${hmacHex('whsec', `${t - 3600}.${body}`)}`, 'whsec'));
  assert.ok(verifyRazorpayPayment({ orderId: 'order_1', paymentId: 'pay_1', signature: hmacHex('k', 'order_1|pay_1') }, 'k'));
  assert.ok(!verifyRazorpayPayment({ orderId: 'order_1', paymentId: 'pay_2', signature: hmacHex('k', 'order_1|pay_1') }, 'k'));
  assert.ok(verifyRazorpayWebhook(body, hmacHex('w', body), 'w'));
});

// ---------------------------------------------------------------- end-to-end

function client(base) {
  let cookie = '';
  return async (p, { method = 'GET', json, raw, type } = {}) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let body;
    if (json) { headers['content-type'] = 'application/json'; body = JSON.stringify(json); }
    if (raw) { headers['content-type'] = type; body = raw; }
    const res = await fetch(base + p, { method, headers, body });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };
}

test('end-to-end: upload, rate, leaderboard, buy spotlight (demo)', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riderank-'));
  const cfg = { ...configFromEnv({}), dataDir: dir, port: 0 };
  const { server } = createApp(cfg);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const owner = client(base);
  const voter1 = client(base);
  const voter2 = client(base);

  // owner uploads two cars
  const carIds = [];
  for (const name of ['Alpha', 'Beta']) {
    const up = await owner('/api/media', { method: 'POST', raw: PNG, type: 'image/png' });
    assert.equal(up.status, 201, JSON.stringify(up.data));
    const vid = await owner('/api/media', { method: 'POST', raw: MP4, type: 'video/mp4' });
    assert.equal(vid.data.kind, 'video');
    const car = await owner('/api/cars', { method: 'POST', json: {
      make: 'Tata', model: name, ownerName: 'Owner', mediaIds: [up.data.id, vid.data.id], confirmRights: true,
    } });
    assert.equal(car.status, 201, JSON.stringify(car.data));
    carIds.push(car.data.car.id);
  }

  // fake file is rejected
  const bad = await owner('/api/media', { method: 'POST', raw: Buffer.from('<html><script>alert(1)</script></html>'), type: 'image/png' });
  assert.equal(bad.status, 415);

  // someone else's media can't be reused
  const stolen = await voter1('/api/cars', { method: 'POST', json: { make: 'x', model: 'y', ownerName: 'z', mediaIds: ['nope'], confirmRights: true } });
  assert.equal(stolen.status, 400);

  // owner can't self-rate
  assert.equal((await owner(`/api/cars/${carIds[0]}/rate`, { method: 'POST', json: { stars: 5 } })).status, 403);

  // voters rate: Beta wins
  await voter1(`/api/cars/${carIds[0]}/rate`, { method: 'POST', json: { stars: 2 } });
  await voter1(`/api/cars/${carIds[1]}/rate`, { method: 'POST', json: { stars: 5 } });
  await voter2(`/api/cars/${carIds[1]}/rate`, { method: 'POST', json: { stars: 5 } });
  let lb = (await voter1('/api/leaderboard?window=week')).data;
  assert.deepEqual(lb.ranked.map((c) => c.id), [carIds[1], carIds[0]]);
  assert.equal(lb.myVotes[carIds[1]], 5);

  // re-voting changes the vote, doesn't add one; then the top spot flips
  await voter1(`/api/cars/${carIds[0]}/rate`, { method: 'POST', json: { stars: 5 } });
  await voter1(`/api/cars/${carIds[1]}/rate`, { method: 'POST', json: { stars: 1 } });
  await voter2(`/api/cars/${carIds[1]}/rate`, { method: 'POST', json: { stars: 1 } });
  lb = (await voter1('/api/leaderboard')).data;
  assert.equal(lb.ranked[0].id, carIds[0]);
  assert.equal(lb.totalVotes, 3);

  // buying: only the owner can, and only within limits
  assert.equal((await voter1('/api/spotlight/checkout', { method: 'POST', json: { carId: carIds[0], days: 1 } })).status, 403);
  assert.equal((await owner('/api/spotlight/checkout', { method: 'POST', json: { carId: carIds[0], days: 99 } })).status, 400);
  const co = await owner('/api/spotlight/checkout', { method: 'POST', json: { carId: carIds[0], days: 2 } });
  assert.equal(co.status, 201);
  assert.equal(co.data.booking.amount, cfg.pricePerDay * 2);
  assert.equal(co.data.checkout.kind, 'redirect');
  assert.equal(lb.spotlight.current, null);

  // a second buyer queues after the first (held) booking
  const co2 = await owner('/api/spotlight/checkout', { method: 'POST', json: { carId: carIds[1], days: 1 } });
  assert.equal(co2.data.booking.startAt, co.data.booking.endAt);

  // others can't confirm or read my booking
  assert.equal((await voter1('/api/payments/demo/confirm', { method: 'POST', json: { bookingId: co.data.booking.id } })).status, 404);
  const paid = await owner('/api/payments/demo/confirm', { method: 'POST', json: { bookingId: co.data.booking.id } });
  assert.equal(paid.data.booking.status, 'paid');

  lb = (await voter2('/api/leaderboard')).data;
  assert.equal(lb.spotlight.current.car.id, carIds[0]);
  assert.equal(lb.spotlight.current.car.media.length, 2);

  // cross-site POST blocked
  const xs = await fetch(`${base}/api/cars/${carIds[0]}/rate`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{"stars":5}' });
  assert.equal(xs.status, 403);

  // webhooks reject unsigned calls
  assert.equal((await fetch(`${base}/api/payments/stripe/webhook`, { method: 'POST', body: '{}' })).status, 400);

  // video served with range support
  const vurl = lb.spotlight.current.car.media.find((m) => m.kind === 'video').url;
  const part = await fetch(base + vurl, { headers: { range: 'bytes=0-9' } });
  assert.equal(part.status, 206);
  assert.equal((await part.arrayBuffer()).byteLength, 10);
  assert.match(part.headers.get('content-security-policy'), /sandbox/);

  // path traversal
  assert.equal((await fetch(`${base}/..%2fserver.mjs`)).status, 404);
  assert.equal(crypto.randomUUID().length, 36);
});
