const id = new URLSearchParams(location.search).get('booking');
const summary = document.getElementById('summary');
const toast = (m) => { const t = document.getElementById('toast'); t.textContent = m; t.className = 'toast show err'; };

document.getElementById('cancel').href = `/?booking=${encodeURIComponent(id)}&checkout=cancel`;

async function load() {
  const [cfgRes, bRes] = await Promise.all([fetch('/api/config'), fetch(`/api/bookings/${encodeURIComponent(id)}`)]);
  const cfg = await cfgRes.json();
  const data = await bRes.json();
  if (!bRes.ok) { summary.textContent = data.error || 'Booking not found'; return; }
  const b = data.booking;
  const money = new Intl.NumberFormat(cfg.currency === 'INR' ? 'en-IN' : undefined, { style: 'currency', currency: b.currency }).format(b.amount / 100);
  summary.replaceChildren();
  const p = (label, value) => { const el = document.createElement('p'); el.append(`${label}: `); const s = document.createElement('strong'); s.textContent = value; el.append(s); return el; };
  summary.append(
    p('Car', b.carTitle),
    p('Duration', `${b.days} day${b.days > 1 ? 's' : ''}`),
    p('Starts', new Date(b.startAt).toLocaleString()),
    p('Total', money),
    p('Status', b.status),
  );
  if (b.status === 'paid') location.href = `/?booking=${b.id}&checkout=success`;
}

document.querySelectorAll('[data-pay]').forEach((btn) => btn.addEventListener('click', async () => {
  btn.disabled = true;
  const res = await fetch('/api/payments/demo/confirm', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { toast(data.error || 'Payment failed'); btn.disabled = false; return; }
  location.href = `/?booking=${id}&checkout=success`;
}));

load();
