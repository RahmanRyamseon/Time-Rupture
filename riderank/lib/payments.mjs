// Payment providers for the Spotlight slot. No SDKs: plain HTTPS calls and
// node:crypto HMAC checks, so the app keeps zero dependencies.
//
//   demo     – simulated checkout page, for local development only
//   razorpay – India: UPI, cards, netbanking, wallets (Standard Checkout)
//   stripe   – international cards, Apple Pay / Google Pay (Stripe Checkout)
import crypto from 'node:crypto';

export const hmacHex = (secret, payload) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Stripe-Signature: "t=1700000000,v1=hex,v1=hex" over `${t}.${rawBody}`. */
export function verifyStripeSignature(rawBody, header, secret, { toleranceSec = 300, now = Date.now() } = {}) {
  if (!header || !secret) return false;
  let t = null;
  const sigs = [];
  for (const part of String(header).split(',')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === 't') t = v;
    else if (k === 'v1') sigs.push(v);
  }
  if (!t || !sigs.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;
  const expected = hmacHex(secret, `${t}.${rawBody.toString('utf8')}`);
  return sigs.some((s) => safeEqual(s, expected));
}

/** Razorpay Checkout handler signature: HMAC(order_id|payment_id, key_secret). */
export function verifyRazorpayPayment({ orderId, paymentId, signature }, keySecret) {
  if (!orderId || !paymentId || !keySecret) return false;
  return safeEqual(signature, hmacHex(keySecret, `${orderId}|${paymentId}`));
}

/** Razorpay webhook: X-Razorpay-Signature = HMAC(rawBody, webhook_secret). */
export function verifyRazorpayWebhook(rawBody, signature, secret) {
  if (!secret) return false;
  return safeEqual(signature, hmacHex(secret, rawBody));
}

export function createPaymentProvider(cfg) {
  if (cfg.provider === 'razorpay') {
    if (!cfg.razorpayKeyId || !cfg.razorpayKeySecret) {
      throw new Error('PAYMENT_PROVIDER=razorpay needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
    }
    return {
      name: 'razorpay',
      publicConfig: { razorpayKeyId: cfg.razorpayKeyId },
      async createCheckout(booking, car) {
        const auth = Buffer.from(`${cfg.razorpayKeyId}:${cfg.razorpayKeySecret}`).toString('base64');
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: booking.amount,
            currency: booking.currency,
            receipt: booking.id,
            notes: { bookingId: booking.id, carId: car.id },
          }),
        });
        const order = await res.json().catch(() => ({}));
        if (!res.ok || !order.id) {
          throw new Error(`Razorpay order failed: ${order?.error?.description || res.status}`);
        }
        return {
          ref: order.id,
          checkout: {
            kind: 'razorpay',
            keyId: cfg.razorpayKeyId,
            orderId: order.id,
            amount: booking.amount,
            currency: booking.currency,
            name: cfg.siteName,
            description: `Spotlight: ${car.title} for ${booking.days} day(s)`,
          },
        };
      },
    };
  }

  if (cfg.provider === 'stripe') {
    if (!cfg.stripeSecretKey) throw new Error('PAYMENT_PROVIDER=stripe needs STRIPE_SECRET_KEY');
    return {
      name: 'stripe',
      publicConfig: {},
      async createCheckout(booking, car) {
        const p = new URLSearchParams();
        p.set('mode', 'payment');
        p.set('success_url', `${cfg.baseUrl}/?booking=${booking.id}&checkout=success`);
        p.set('cancel_url', `${cfg.baseUrl}/?booking=${booking.id}&checkout=cancel`);
        p.set('client_reference_id', booking.id);
        p.set('metadata[bookingId]', booking.id);
        p.set('payment_intent_data[metadata][bookingId]', booking.id);
        p.set('expires_at', String(Math.floor(booking.holdUntil / 1000) - 60));
        p.set('line_items[0][quantity]', '1');
        p.set('line_items[0][price_data][currency]', booking.currency.toLowerCase());
        p.set('line_items[0][price_data][unit_amount]', String(booking.amount));
        p.set('line_items[0][price_data][product_data][name]',
          `${cfg.siteName} Spotlight – ${booking.days} day(s)`);
        p.set('line_items[0][price_data][product_data][description]', car.title);
        const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfg.stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Idempotency-Key': `booking-${booking.id}`,
          },
          body: p,
        });
        const session = await res.json().catch(() => ({}));
        if (!res.ok || !session.url) {
          throw new Error(`Stripe checkout failed: ${session?.error?.message || res.status}`);
        }
        return { ref: session.id, checkout: { kind: 'redirect', url: session.url } };
      },
    };
  }

  return {
    name: 'demo',
    publicConfig: {},
    async createCheckout(booking) {
      return {
        ref: `demo_${booking.id}`,
        checkout: { kind: 'redirect', url: `/checkout-demo.html?booking=${booking.id}` },
      };
    },
  };
}
