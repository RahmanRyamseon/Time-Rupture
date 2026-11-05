// Storage for comments, reactions and polls.
// Uses Supabase (shared by everyone) when config.js has a project, otherwise localStorage
// (visible only in this browser). Both expose the same async API.

const cfg = window.RACHABANDA_CONFIG || {};
export const shared = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function voterId() {
  let id = localStorage.getItem("rb:voter");
  if (!id) localStorage.setItem("rb:voter", (id = uid()));
  return id;
}

// ---- Supabase (PostgREST) -------------------------------------------------------------
async function api(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${cfg.supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const inList = (xs) => `in.(${xs.map((x) => `"${x}"`).join(",")})`;
const COLS = "id,thread,parent,name,place,body,likes,created_at";

const remote = {
  comments: (thread) =>
    api(`comments?select=${COLS}&thread=eq.${encodeURIComponent(thread)}&order=created_at.asc&limit=500`),
  recent: (limit = 8) => api(`comments?select=${COLS}&order=created_at.desc&limit=${limit}`),
  async add(c) {
    const [row] = await api(`comments?select=${COLS}`, { method: "POST", body: c, prefer: "return=representation" });
    return row;
  },
  like: (id) => api("rpc/like_comment", { method: "POST", body: { p_id: id } }),
  report: (id) => api("rpc/report_comment", { method: "POST", body: { p_id: id } }),
  async counts(threads) {
    if (!threads.length) return {};
    const rows = await api(`comments?select=thread&thread=${encodeURIComponent(inList(threads))}&limit=5000`);
    const out = {};
    for (const r of rows) out[r.thread] = (out[r.thread] || 0) + 1;
    return out;
  },
  async reactions(threads) {
    if (!threads.length) return {};
    const rows = await api(`reactions?select=thread,emoji,count&thread=${encodeURIComponent(inList(threads))}`);
    const out = {};
    for (const r of rows) (out[r.thread] ||= {})[r.emoji] = r.count;
    return out;
  },
  react: (thread, emoji) => api("rpc/react", { method: "POST", body: { p_thread: thread, p_emoji: emoji } }),
  vote: (poll, option) =>
    api("rpc/vote", { method: "POST", body: { p_poll: poll, p_voter: voterId(), p_option: option } }),
  async results(poll) {
    const rows = await api("rpc/poll_results", { method: "POST", body: { p_poll: poll } });
    const out = {};
    for (const r of rows || []) out[r.option] = Number(r.votes);
    return out;
  },
};

// ---- localStorage ------------------------------------------------------------------------
const load = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const local = {
  async comments(thread) {
    return load("rb:comments", []).filter((c) => c.thread === thread && !c.hidden);
  },
  async recent(limit = 8) {
    return load("rb:comments", []).filter((c) => !c.hidden).slice(-limit).reverse();
  },
  async add(c) {
    const all = load("rb:comments", []);
    const row = { ...c, id: uid(), likes: 0, created_at: new Date().toISOString() };
    all.push(row);
    save("rb:comments", all.slice(-2000));
    return row;
  },
  async like(id) {
    const all = load("rb:comments", []);
    const c = all.find((x) => x.id === id);
    if (c) c.likes += 1;
    save("rb:comments", all);
    return c?.likes ?? 0;
  },
  async report(id) {
    const all = load("rb:comments", []);
    const c = all.find((x) => x.id === id);
    if (c) c.hidden = true;
    save("rb:comments", all);
  },
  async counts(threads) {
    const set = new Set(threads);
    const out = {};
    for (const c of load("rb:comments", [])) if (set.has(c.thread) && !c.hidden) out[c.thread] = (out[c.thread] || 0) + 1;
    return out;
  },
  async reactions(threads) {
    const all = load("rb:reactions", {});
    return Object.fromEntries(threads.filter((t) => all[t]).map((t) => [t, all[t]]));
  },
  async react(thread, emoji) {
    const all = load("rb:reactions", {});
    const t = (all[thread] ||= {});
    t[emoji] = (t[emoji] || 0) + 1;
    save("rb:reactions", all);
    return t[emoji];
  },
  async vote(poll, option) {
    save(`rb:poll:${poll}`, option);
  },
  async results(poll) {
    const mine = load(`rb:poll:${poll}`, null);
    return mine === null ? {} : { [mine]: 1 };
  },
};

export const store = shared ? remote : local;
