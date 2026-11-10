// RideRank frontend – no framework, no build step.
const $ = (s, el = document) => el.querySelector(s);

/** Tiny element builder. All text goes through textContent, so user input is never parsed as HTML. */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const state = {
  config: null,
  window: 'week',
  board: null,
  prevRanks: new Map(),
  uploads: [], // {file, id?, kind, status, progress, url}
};

// ------------------------------------------------------------ utils
async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: opts.body && !(opts.body instanceof Blob) ? { 'Content-Type': 'application/json', ...(opts.headers || {}) } : opts.headers,
    body: opts.body && !(opts.body instanceof Blob) ? JSON.stringify(opts.body) : opts.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3500);
}

const money = (minor, cur = state.config?.currency || 'INR') =>
  new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : undefined, { style: 'currency', currency: cur, maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100);

function when(ts) {
  const diff = ts - Date.now();
  if (diff < 60_000) return 'right now';
  const d = new Date(ts);
  const opts = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleString(undefined, opts);
}

function countdown(ts) {
  const ms = Math.max(0, ts - Date.now());
  const d = Math.floor(ms / 86400000);
  const hh = Math.floor((ms % 86400000) / 3600000);
  const mm = Math.floor((ms % 3600000) / 60000);
  return d ? `${d}d ${hh}h left` : hh ? `${hh}h ${mm}m left` : `${mm}m left`;
}

const fmtAvg = (s) => (s && s.avg ? s.avg.toFixed(2) : '–');
const nRatings = (n = 0) => `${n} rating${n === 1 ? '' : 's'}`;

function mediaEl(m, { cover = false } = {}) {
  if (!m) return h('div', { class: 'noimg' }, '🚗');
  if (m.kind === 'video') {
    return cover
      ? h('video', { src: `${m.url}#t=0.5`, muted: true, playsinline: true, preload: 'metadata' })
      : h('video', { src: m.url, controls: true, playsinline: true, preload: 'metadata' });
  }
  return h('img', { src: m.url, alt: '', loading: 'lazy', decoding: 'async' });
}

// ------------------------------------------------------------ rating widget
function starsWidget(car, { size = '' } = {}) {
  const mine = state.board?.myCars?.some((c) => c.id === car.id);
  const my = state.board?.myVotes?.[car.id] || 0;
  const wrap = h('div', { class: `stars ${size}`, role: 'radiogroup', 'aria-label': `Rate ${car.title}` });
  if (mine) {
    wrap.append(h('span', { class: 'muted small' }, 'Your car'));
    return wrap;
  }
  for (let i = 1; i <= 5; i++) {
    wrap.append(h('button', {
      type: 'button', class: i <= my ? 'on' : '', role: 'radio', 'aria-checked': String(i === my),
      title: `${i} star${i > 1 ? 's' : ''}`,
      onclick: (e) => { e.stopPropagation(); rate(car, i, wrap); },
    }, '★'));
  }
  return wrap;
}

async function rate(car, stars, wrap) {
  [...wrap.children].forEach((b, i) => b.classList.toggle('on', i < stars));
  try {
    await api(`/api/cars/${car.id}/rate`, { method: 'POST', body: { stars } });
    state.board.myVotes[car.id] = stars;
    toast(`You rated ${car.title} ${'★'.repeat(stars)}`);
    refresh();
  } catch (err) {
    toast(err.message, 'err');
    refresh();
  }
}

// ------------------------------------------------------------ spotlight
function spotInfo(cur) {
  const car = cur.car;
  return h('div', { class: 'spot-info' },
    h('span', { class: 'badge gold' }, '★ SPOTLIGHT · Sponsored'),
    h('h1', {}, car.title),
    h('p', { class: 'muted' }, [car.year, car.make, car.model].filter(Boolean).join(' '), car.city ? ` · ${car.city}` : '', ` · by ${car.ownerName}`),
    car.story ? h('p', { class: 'story' }, car.story) : null,
    h('div', { class: 'spot-meta' },
      h('span', {}, `★ ${fmtAvg(car.stats)} `, h('small', { class: 'muted' }, `(${nRatings(car.stats?.votes)})`)),
      h('span', { class: 'muted cd', dataset: { end: cur.endsAt } }, countdown(cur.endsAt))),
    starsWidget(car, { size: 'big' }),
    h('div', { class: 'spot-actions' },
      h('button', { class: 'btn btn-ghost', onclick: () => openCar(car.id) }, 'View photos & video'),
      h('a', { class: 'btn btn-ghost', href: '#spotlight-buy' }, 'Want this spot?')));
}

function renderSpotlight(spot) {
  const el = $('#spotlight');
  const cur = spot?.current;
  const key = cur ? `${cur.car.id}:${cur.endsAt}` : 'open';
  // Same car still featured: refresh the text only, so its video keeps playing.
  if (el.dataset.key === key && cur) {
    el.querySelector('.spot-info').replaceWith(spotInfo(cur));
    return;
  }
  el.dataset.key = key;
  el.replaceChildren();
  if (cur) {
    const car = cur.car;
    const video = car.media.find((m) => m.kind === 'video');
    const visual = video
      ? h('video', { src: video.url, autoplay: true, muted: true, loop: true, playsinline: true, poster: car.cover?.kind === 'image' ? car.cover.url : null })
      : mediaEl(car.cover);
    el.append(h('div', { class: 'spot-media', onclick: () => openCar(car.id) }, visual), spotInfo(cur));
    el.classList.remove('open');
  } else {
    el.classList.add('open');
    el.append(h('div', { class: 'spot-open' },
      h('span', { class: 'badge gold' }, '★ SPOTLIGHT'),
      h('h1', {}, 'This spot is open.'),
      h('p', { class: 'muted' }, `Put your car at the very top of ${state.config.siteName} for everyone who visits. From ${money(state.config.pricePerDay)} per day.`),
      h('div', { class: 'spot-actions' },
        h('a', { class: 'btn btn-gold', href: '#spotlight-buy' }, 'Claim the Spotlight'),
        h('a', { class: 'btn btn-ghost', href: '#submit' }, 'Add your car first'))));
  }
}

// ------------------------------------------------------------ leaderboard
function movement(id, rank) {
  const prev = state.prevRanks.get(id);
  if (prev == null) return state.prevRanks.size ? h('span', { class: 'move new' }, 'NEW') : null;
  if (prev > rank) return h('span', { class: 'move up', title: `Up from #${prev}` }, `▲${prev - rank}`);
  if (prev < rank) return h('span', { class: 'move down', title: `Down from #${prev}` }, `▼${rank - prev}`);
  return null;
}

function renderBoard(board) {
  const ranked = board.ranked;
  const podium = $('#podium');
  const list = $('#ranking');

  // FLIP: remember where rows were, so changes animate.
  const before = new Map();
  document.querySelectorAll('[data-car]').forEach((el) => before.set(el.dataset.car + el.dataset.slot, el.getBoundingClientRect().top));

  podium.replaceChildren(...ranked.slice(0, 3).map((r, i) => h('article', {
    class: `pod pod-${i + 1}`, dataset: { car: r.id, slot: 'p' }, onclick: () => openCar(r.id), tabindex: 0,
    onkeydown: (e) => { if (e.key === 'Enter') openCar(r.id); },
  },
  h('div', { class: 'pod-media' }, mediaEl(r.cover, { cover: true }), r.hasVideo ? h('span', { class: 'vid' }, '▶ video') : null),
  h('div', { class: 'pod-body' },
    h('div', { class: 'pod-rank' }, i === 0 ? '👑 #1' : `#${i + 1}`, movement(r.id, i + 1)),
    h('h3', {}, r.title),
    h('p', { class: 'muted small' }, r.city || '', r.city ? ' · ' : '', `by ${r.ownerName}`),
    h('div', { class: 'score' }, h('b', {}, `★ ${fmtAvg(r.stats)}`), h('span', { class: 'muted small' }, ` ${r.stats.votes} rating${r.stats.votes === 1 ? '' : 's'}`)),
    starsWidget(r)))));

  list.replaceChildren(...ranked.slice(3).map((r, i) => h('li', {
    dataset: { car: r.id, slot: 'l' }, onclick: () => openCar(r.id),
  },
  h('span', { class: 'rank' }, `#${i + 4}`),
  h('div', { class: 'thumb' }, mediaEl(r.cover, { cover: true })),
  h('div', { class: 'who' }, h('b', {}, r.title), h('span', { class: 'muted small' }, `${r.city ? `${r.city} · ` : ''}by ${r.ownerName}`)),
  movement(r.id, i + 4),
  h('div', { class: 'score' }, h('b', {}, `★ ${fmtAvg(r.stats)}`), h('span', { class: 'muted small' }, nRatings(r.stats.votes))),
  starsWidget(r))));

  $('#board-empty').hidden = ranked.length > 0;

  document.querySelectorAll('[data-car]').forEach((el) => {
    const old = before.get(el.dataset.car + el.dataset.slot);
    if (old == null) return;
    const dy = old - el.getBoundingClientRect().top;
    if (Math.abs(dy) > 2) {
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  });

  state.prevRanks = new Map(ranked.map((r, i) => [r.id, i + 1]));
  $('#board-sub').textContent = `${board.totalVotes} rating${board.totalVotes === 1 ? '' : 's'} ${board.window === 'week' ? 'in the last 7 days' : 'all time'} · fair weighted score, so a few 5★ votes can't beat hundreds of great ones.`;
}

function renderFresh(board) {
  const grid = $('#fresh-grid');
  if (!board.fresh.length) {
    grid.replaceChildren(h('p', { class: 'empty' }, 'Every car has been rated. Add yours!'));
    return;
  }
  grid.replaceChildren(...board.fresh.map((c) => h('article', { class: 'card', onclick: () => openCar(c.id) },
    h('div', { class: 'card-media' }, mediaEl(c.cover, { cover: true }), c.hasVideo ? h('span', { class: 'vid' }, '▶ video') : null),
    h('div', { class: 'card-body' },
      h('h3', {}, c.title),
      h('p', { class: 'muted small' }, `${c.city ? `${c.city} · ` : ''}by ${c.ownerName}`),
      starsWidget(c)))));
}

function renderBuy(board) {
  const sel = $('#buy-car');
  const prev = sel.value;
  const mine = board.myCars.filter((c) => !c.hidden);
  sel.replaceChildren(...(mine.length
    ? mine.map((c) => h('option', { value: c.id }, c.title))
    : [h('option', { value: '' }, 'Add your car first ↑')]));
  if (prev && mine.some((c) => c.id === prev)) sel.value = prev;
  sel.disabled = !mine.length;
  $('#buy-btn').disabled = !mine.length;
  updateQuote();

  const booked = board.spotlight.booked;
  $('#booked-list').replaceChildren(
    h('h3', {}, 'Booked so far'),
    booked.length
      ? h('ul', { class: 'booked' }, ...booked.slice(0, 8).map((b) => h('li', {}, `${when(b.startAt)} → ${when(b.endAt)}`)))
      : h('p', { class: 'muted small' }, 'Nothing booked – the slot is free right now.'),
  );
}

function updateQuote() {
  if (!state.config || !state.board) return;
  const days = Number($('#buy-days').value || 1);
  $('#buy-total').textContent = money(state.config.pricePerDay * days);
  $('#buy-start').textContent = when(state.board.spotlight.nextFreeAt);
}

// ------------------------------------------------------------ data refresh
let refreshing = null;
let again = false;
async function refresh() {
  if (refreshing) { again = true; return refreshing; }
  refreshing = (async () => {
    try {
      const board = await api(`/api/leaderboard?window=${state.window}`);
      state.board = board;
      renderSpotlight(board.spotlight);
      renderBoard(board);
      renderFresh(board);
      renderBuy(board);
    } catch (err) {
      toast(err.message, 'err');
    }
  })();
  await refreshing;
  refreshing = null;
  if (again) { again = false; refresh(); }
}

function live() {
  const es = new EventSource('/api/stream');
  let t;
  es.addEventListener('update', () => { clearTimeout(t); t = setTimeout(refresh, 150); });
  es.onerror = () => document.querySelector('.live')?.classList.add('off');
  es.onopen = () => document.querySelector('.live')?.classList.remove('off');
}

// ------------------------------------------------------------ car dialog
async function openCar(id) {
  const dlg = $('#car-dialog');
  const box = $('#car-detail');
  box.replaceChildren(h('p', { class: 'muted' }, 'Loading…'));
  if (!dlg.open) dlg.showModal();
  try {
    const { car, weeklyRank, isMine } = await api(`/api/cars/${id}`);
    const main = h('div', { class: 'gallery-main' }, mediaEl(car.media[0]));
    const thumbs = car.media.length > 1 ? h('div', { class: 'gallery-thumbs' }, ...car.media.map((m) => h('button', {
      type: 'button', onclick: () => main.replaceChildren(mediaEl(m)),
    }, m.kind === 'video' ? h('span', { class: 'vthumb' }, '▶') : h('img', { src: m.url, alt: '' })))) : null;
    box.replaceChildren(
      main, thumbs,
      h('div', { class: 'detail-body' },
        h('div', { class: 'detail-head' },
          h('div', {},
            h('h2', {}, car.title),
            h('p', { class: 'muted' }, [car.year, car.make, car.model].filter(Boolean).join(' '), car.city ? ` · ${car.city}` : '', ` · by ${car.ownerName}`)),
          h('div', { class: 'detail-score' },
            h('b', {}, `★ ${fmtAvg(car.stats)}`),
            h('span', { class: 'muted small' }, nRatings(car.stats?.votes)),
            weeklyRank ? h('span', { class: 'badge' }, `#${weeklyRank} this week`) : null)),
        car.story ? h('p', { class: 'story' }, car.story) : null,
        isMine
          ? h('p', { class: 'muted' }, 'This is your car. ', h('a', { href: '#spotlight-buy', onclick: () => { dlg.close(); $('#buy-car').value = car.id; updateQuote(); } }, 'Put it in the Spotlight →'))
          : h('div', {}, h('p', { class: 'muted small' }, 'How good does it look?'), starsWidget(car, { size: 'big' })),
        h('details', { class: 'report' },
          h('summary', {}, 'Report this car'),
          h('form', {
            onsubmit: async (e) => {
              e.preventDefault();
              try {
                await api(`/api/cars/${car.id}/report`, { method: 'POST', body: { reason: e.target.reason.value } });
                toast('Thanks – our moderators will take a look.');
                e.target.closest('details').open = false;
              } catch (err) { toast(err.message, 'err'); }
            },
          },
          h('select', { name: 'reason', required: true },
            h('option', { value: '' }, 'Choose a reason…'),
            ...['Not a real car photo', 'Not their car / stolen photos', 'Offensive or explicit', 'Shows private info (plates, faces)', 'Spam or advertising'].map((r) => h('option', {}, r))),
          h('button', { class: 'btn btn-small btn-ghost' }, 'Send report')))),
    );
  } catch (err) {
    box.replaceChildren(h('p', {}, err.message));
  }
}

// ------------------------------------------------------------ uploads
function renderUploads() {
  $('#uploads').replaceChildren(...state.uploads.map((u, i) => h('li', { class: u.status },
    u.kind === 'video' ? h('video', { src: u.preview, muted: true }) : h('img', { src: u.preview, alt: '' }),
    h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(u.progress * 100)}%` })),
    u.status === 'error' ? h('span', { class: 'err small' }, u.error) : null,
    h('button', { type: 'button', class: 'rm', title: 'Remove', onclick: () => { URL.revokeObjectURL(u.preview); state.uploads.splice(i, 1); renderUploads(); } }, '×'))));
}

function uploadFile(u) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');
    xhr.setRequestHeader('Content-Type', u.file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) { u.progress = e.loaded / e.total; renderUploads(); } };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 201) { u.id = data.id; u.status = 'done'; u.progress = 1; } else { u.status = 'error'; u.error = data.error || 'Upload failed'; }
      renderUploads();
      resolve();
    };
    xhr.onerror = () => { u.status = 'error'; u.error = 'Network error'; renderUploads(); resolve(); };
    xhr.send(u.file);
  });
}

function addFiles(files) {
  const L = state.config.limits;
  for (const file of files) {
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    const count = state.uploads.filter((u) => u.kind === kind && u.status !== 'error').length;
    if (kind === 'image' && count >= L.imagesPerCar) { toast(`Max ${L.imagesPerCar} photos`, 'err'); continue; }
    if (kind === 'video' && count >= L.videosPerCar) { toast('Only 1 video per car', 'err'); continue; }
    if (file.size > L[kind]) { toast(`${file.name} is too big (max ${L[kind] / 1048576} MB)`, 'err'); continue; }
    const u = { file, kind, status: 'uploading', progress: 0, preview: URL.createObjectURL(file) };
    state.uploads.push(u);
    u.promise = uploadFile(u);
  }
  renderUploads();
}

function setupForm() {
  const dz = $('#dropzone');
  const input = $('#file-input');
  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => { addFiles([...input.files]); input.value = ''; });
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); addFiles([...e.dataTransfer.files]); });

  $('#car-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const status = $('#form-status');
    if (!f.make.value.trim() || !f.model.value.trim() || !f.ownerName.value.trim()) return toast('Fill in make, model and your name', 'err');
    if (!state.uploads.length) return toast('Add at least one photo or video', 'err');
    if (!f.confirmRights.checked) return toast('Please confirm you have the rights to these photos', 'err');
    $('#submit-btn').disabled = true;
    status.textContent = 'Finishing uploads…';
    await Promise.all(state.uploads.map((u) => u.promise));
    const ok = state.uploads.filter((u) => u.status === 'done');
    if (!ok.length) { $('#submit-btn').disabled = false; status.textContent = ''; return toast('Uploads failed – try again', 'err'); }
    try {
      const { car } = await api('/api/cars', {
        method: 'POST',
        body: {
          make: f.make.value, model: f.model.value, year: f.year.value || null, nickname: f.nickname.value,
          city: f.city.value, ownerName: f.ownerName.value, story: f.story.value,
          mediaIds: ok.map((u) => u.id), confirmRights: f.confirmRights.checked,
        },
      });
      f.reset();
      state.uploads.forEach((u) => URL.revokeObjectURL(u.preview));
      state.uploads = [];
      renderUploads();
      toast(`${car.title} is live! Share it so people rate it.`);
      await refresh();
      $('#buy-car').value = car.id;
      openCar(car.id);
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      $('#submit-btn').disabled = false;
      status.textContent = '';
    }
  });
}

// ------------------------------------------------------------ buying the spotlight
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = h('script', { src });
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window'));
    document.head.append(s);
  });
}

function setupBuy() {
  const days = $('#buy-days');
  for (let d = 1; d <= state.config.maxDays; d++) days.append(h('option', { value: d }, `${d} day${d > 1 ? 's' : ''} – ${money(state.config.pricePerDay * d)}`));
  days.addEventListener('change', updateQuote);
  $('#buy-note').textContent = state.config.provider === 'demo'
    ? 'Demo mode: payments are simulated, no money moves.'
    : state.config.provider === 'razorpay' ? 'Secure checkout by Razorpay (UPI, cards, netbanking, wallets).' : 'Secure checkout by Stripe.';

  $('#buy-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const carId = $('#buy-car').value;
    if (!carId) return toast('Add your car first', 'err');
    $('#buy-btn').disabled = true;
    try {
      const { booking, checkout } = await api('/api/spotlight/checkout', { method: 'POST', body: { carId, days: Number(days.value) } });
      if (checkout.kind === 'redirect') { location.href = checkout.url; return; }
      if (checkout.kind === 'razorpay') {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        const rzp = new window.Razorpay({
          key: checkout.keyId, order_id: checkout.orderId, amount: checkout.amount, currency: checkout.currency,
          name: checkout.name, description: checkout.description, theme: { color: '#f5b301' },
          handler: async (resp) => {
            try {
              await api('/api/payments/razorpay/verify', { method: 'POST', body: resp });
              location.href = `/?booking=${booking.id}&checkout=success`;
            } catch (err) { toast(err.message, 'err'); }
          },
          modal: { ondismiss: () => toast('Payment cancelled – your slot is held for 35 minutes.') },
        });
        rzp.open();
      }
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      $('#buy-btn').disabled = false;
    }
  });
}

async function handleReturnFromCheckout() {
  const q = new URLSearchParams(location.search);
  const id = q.get('booking');
  if (!id) return;
  history.replaceState(null, '', location.pathname + location.hash);
  if (q.get('checkout') === 'cancel') return toast('Payment cancelled. No money was taken.');
  // Webhooks can land a moment after the redirect, so poll briefly.
  for (let i = 0; i < 15; i++) {
    try {
      const { booking } = await api(`/api/bookings/${id}`);
      if (booking.status === 'paid') {
        const starts = booking.startAt <= Date.now() ? 'is live now' : `starts ${when(booking.startAt)}`;
        toast(`Paid! ${booking.carTitle} Spotlight ${starts}.`);
        refresh();
        return;
      }
      if (booking.status !== 'pending') break;
    } catch { break; }
    await new Promise((r) => setTimeout(r, 2000));
  }
  toast('We are still waiting for payment confirmation – refresh in a minute.', 'err');
}

// ------------------------------------------------------------ boot
async function main() {
  state.config = await api('/api/config');
  document.title = `${state.config.siteName} – Who has the best-looking car?`;
  $('#site-name').textContent = state.config.siteName;
  $('#foot-name').textContent = state.config.siteName;

  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    state.window = b.dataset.window;
    state.prevRanks = new Map();
    document.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    refresh();
  }));

  const dlg = $('#car-dialog');
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.matches('[data-close]')) dlg.close(); });
  dlg.addEventListener('close', () => dlg.querySelectorAll('video').forEach((v) => v.pause()));

  setupForm();
  setupBuy();
  await refresh();
  live();
  handleReturnFromCheckout();
  setInterval(() => document.querySelectorAll('.cd').forEach((c) => { c.textContent = countdown(Number(c.dataset.end)); }), 30_000);
}

main().catch((err) => toast(err.message, 'err'));
