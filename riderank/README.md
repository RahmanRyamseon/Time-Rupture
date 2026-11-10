# RideRank – who has the best-looking car?

People post their car with **photos and videos**, everyone rates it **1–5 stars on looks**,
and the **leaderboard re-ranks live** as votes come in. Owners can **buy the Spotlight**, a
paid slot pinned above the leaderboard.

- **Zero dependencies.** You only need Node.js 20 or newer. There's no build step and no `npm install`.
- Data is stored in `data/db.json`. Uploads go in `data/uploads/`.

```bash
cd riderank
npm run seed     # optional: 8 sample cars with ratings
npm start        # http://localhost:3000
npm test
```

## Features

| | |
|---|---|
| **Upload** | Up to 6 photos (JPEG/PNG/WebP/GIF/AVIF, 8 MB each) and 1 video (MP4/MOV/WebM, 60 MB). The server checks each file's real type from its content, so a renamed file is rejected. Uploads show progress bars, and videos support seeking. |
| **Rating** | 1–5 stars. Each browser gets one vote per car and can change it later. You can't rate your own car. A network can rate a given car from at most 3 browsers. |
| **Fair ranking** | Cars are ranked by a weighted average that pulls cars with few votes towards the site average, so one 5★ vote can't beat 300 votes averaging 4.8. |
| **Top spot keeps changing** | The board has *This week* and *All time* tabs. The weekly board counts only the last 7 days of votes, so the #1 crown keeps changing hands. Votes push to every open browser through Server-Sent Events, and rows slide up or down with ▲/▼ markers. |
| **Spotlight (paid top slot)** | Sold by the day (1–7 days). Bookings never overlap; each new booking takes the earliest free time. An unpaid booking holds its place for 35 minutes. If the payment arrives after that, the booking moves to the next free slot, so a paying customer never loses their purchase. |
| **Moderation** | Visitors can report a car. A car reported by 5 different people is hidden automatically. Admins can review reports and hide or unhide cars with `ADMIN_TOKEN`. |

**Two kinds of "top".** The #1 crown on the leaderboard can only be won with votes. The
Spotlight is the slot people buy, and it is always labelled *Sponsored*. Keeping them separate
keeps the voting meaningful, which is what makes people want to buy the Spotlight. It also keeps
you on the right side of advertising-disclosure rules (ASCI in India, FTC in the US).

## How to take payments for the Spotlight

Set `PAYMENT_PROVIDER` to choose a payment gateway. The default is `demo`, which shows a
simulated checkout page and moves no money.

### Recommended for India: Razorpay (`PAYMENT_PROVIDER=razorpay`)
- Customers can pay with **UPI** (GPay, PhonePe, Paytm, BHIM), cards (including RuPay), netbanking, wallets and EMI, all in one checkout window.
- Fees are about **2% per transaction**. UPI is often cheaper. Check Razorpay's current pricing.
- You need a business KYC: PAN and a bank account. Sole proprietors can sign up.
- Setup:
  1. Get your keys from Dashboard → Settings → API Keys.
  2. Add a webhook at `https://YOUR-DOMAIN/api/payments/razorpay/webhook` for the events `payment.captured` and `order.paid`.
  3. Set the environment variables:
     ```
     PAYMENT_PROVIDER=razorpay
     RAZORPAY_KEY_ID=rzp_live_...
     RAZORPAY_KEY_SECRET=...
     RAZORPAY_WEBHOOK_SECRET=...
     ```
- Alternatives that work the same way: **Cashfree**, **PhonePe PG**, **PayU**.

### For international buyers: Stripe (`PAYMENT_PROVIDER=stripe`)
- Customers can pay with cards, Apple Pay, Google Pay and local payment methods in 40+ countries.
- Setup:
  1. Add a webhook at `https://YOUR-DOMAIN/api/payments/stripe/webhook` for the events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`.
  2. Set the environment variables:
     ```
     PAYMENT_PROVIDER=stripe
     STRIPE_SECRET_KEY=sk_live_...
     STRIPE_WEBHOOK_SECRET=whsec_...
     CURRENCY=USD
     PRICE_PER_DAY=999
     ```
     `PRICE_PER_DAY` is in cents, so `999` means $9.99.
- If you are in the UAE or another Gulf country, **Stripe**, **Telr**, **Checkout.com** and **Tap** all work. See `CURRENCY` below.

### Other options
- **UPI QR code with manual approval.** This has zero fees. You show your UPI QR code, the buyer pays and enters the transaction ID, and you approve the booking by hand. It works for a soft launch, but there's no automatic confirmation. It isn't built here.
- **PayPal.** Useful if your buyers are mostly overseas.
- **Avoid "pay to my bank account" with WhatsApp proof.** It doesn't scale, and screenshots are easy to fake.

### Security already built in
- The server only marks a booking paid after verifying the gateway's signature (HMAC-SHA256) and checking that the amount and currency match.
- Webhooks are idempotent, so a payment that is reported twice is still counted once.
- Card and UPI details never touch your server.
- Before you go live, put the site behind HTTPS and set `BASE_URL`.

### Pricing ideas
- Start with a flat daily price, for example ₹499/day.
- Later you can try:
  - **demand pricing**: raise the price when the queue is long;
  - **weekend premiums**;
  - an **auction** for the next day's slot;
  - several smaller **"Featured" slots** that rotate in a carousel, so more people can buy.

## Configuration

| Variable | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `BASE_URL` | `http://localhost:PORT` | Public URL. Used for payment redirects and secure cookies. |
| `DATA_DIR` | `./data` | Database and uploads. Put it on a persistent disk. |
| `CURRENCY` | `INR` | ISO currency code. |
| `PRICE_PER_DAY` | `49900` | Price in the smallest unit (paise or cents). `49900` = ₹499. |
| `MAX_DAYS` | `7` | Longest single booking. |
| `PAYMENT_PROVIDER` | `demo` | `demo`, `razorpay` or `stripe`. |
| `ADMIN_TOKEN` | – | Enables the `/api/admin/*` endpoints. |
| `TRUST_PROXY` | – | Set to `1` behind nginx or a load balancer, so the real client IP is used. |
| `IP_SALT` | `change-me` | Salt for hashing IP addresses. Set a random value in production. |
| `REPORTS_TO_HIDE` | `5` | Number of reports that hides a car automatically. |

Moderation examples:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://YOUR-DOMAIN/api/admin/reports
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://YOUR-DOMAIN/api/admin/cars/CAR_ID/hide
```

## Deploying

This app is a long-running Node server that writes to disk. Use a host with a persistent volume,
such as Render, Railway, Fly.io or a small VPS. Serverless platforms like Vercel or Netlify won't
work as-is, because they don't keep files between requests.

## Before scaling up (production checklist)

- **Voter identity.** Each voter is identified by a browser cookie, which someone can clear to vote again. Add phone OTP or Google sign-in when people start trying to game the board.
- **Storage.** Move uploads to object storage with a CDN (Cloudflare R2, S3 or Cloudinary). Cloudinary or Mux can also transcode and compress video.
- **Database.** Move from the JSON file to Postgres or SQLite once you need multiple server instances.
- **Image moderation.** Add automatic checks for explicit images, and blur number plates.
- **Legal.** Publish terms, a privacy policy (India's DPDP Act) and a refund policy. Payment gateways require all three.
