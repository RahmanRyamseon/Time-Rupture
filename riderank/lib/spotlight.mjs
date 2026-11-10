// The paid "Spotlight" slot: one car at a time is pinned above the leaderboard.
// Time is sold in whole days. Bookings never overlap; a new booking takes the
// earliest free gap long enough for it. Unpaid bookings hold their place for
// HOLD_MS, then lapse and free the time again.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOLD_MS = 35 * 60 * 1000; // Stripe Checkout sessions must live >= 30 min
export const MAX_QUEUE_MS = 60 * DAY_MS; // can't book more than ~2 months ahead

/** Bookings that currently occupy time on the calendar. */
export function occupying(data, now = Date.now(), excludeId = null) {
  return Object.values(data.bookings)
    .filter((b) => b.id !== excludeId && b.endAt > now &&
      (b.status === 'paid' || (b.status === 'pending' && b.holdUntil > now)))
    .sort((a, b) => a.startAt - b.startAt);
}

/** Earliest start time at which `durationMs` fits without overlapping anything. */
export function nextFreeStart(data, durationMs, now = Date.now(), excludeId = null) {
  let cursor = now;
  for (const b of occupying(data, now, excludeId)) {
    if (b.startAt - cursor >= durationMs) return cursor;
    cursor = Math.max(cursor, b.endAt);
  }
  return cursor;
}

export function activeSpotlight(data, now = Date.now()) {
  return Object.values(data.bookings).find((b) =>
    b.status === 'paid' && b.startAt <= now && now < b.endAt) || null;
}

/** Expire pending bookings whose hold has run out. Returns true if anything changed. */
export function expireHolds(data, now = Date.now()) {
  let changed = false;
  for (const b of Object.values(data.bookings)) {
    if (b.status === 'pending' && b.holdUntil <= now) {
      b.status = 'expired';
      changed = true;
    }
  }
  return changed;
}

/**
 * Mark a booking paid. Idempotent. If the hold already lapsed (slow payer),
 * the booking is moved to the next free gap instead of being lost.
 * @returns {{ok:true, booking} | {ok:false, error:string}}
 */
export function markPaid(data, bookingId, { amount, currency, ref } = {}, now = Date.now()) {
  const b = data.bookings[bookingId];
  if (!b) return { ok: false, error: 'Unknown booking' };
  if (b.status === 'paid') return { ok: true, booking: b };
  if (amount != null && Number(amount) !== b.amount) return { ok: false, error: 'Amount mismatch' };
  if (currency != null && String(currency).toUpperCase() !== b.currency) {
    return { ok: false, error: 'Currency mismatch' };
  }
  if (b.status !== 'pending' || b.holdUntil <= now) {
    const duration = b.endAt - b.startAt;
    b.startAt = nextFreeStart(data, duration, now, b.id);
    b.endAt = b.startAt + duration;
    b.rescheduled = true;
  }
  b.status = 'paid';
  b.paidAt = now;
  if (ref) b.paymentRef = ref;
  return { ok: true, booking: b };
}
