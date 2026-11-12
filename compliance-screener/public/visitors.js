/* ============================================================
   Visitor counter — real cross-visitor count for a STATIC site.
   ------------------------------------------------------------
   A static page has no backend, so the count is kept by a free,
   keyless, CORS-enabled hosted counter (Abacus — a maintained
   CountAPI replacement). It increments once per browser session
   (refreshes don't re-count) and just reads the total otherwise.
   If the service is ever unreachable the pill stays hidden rather
   than showing a fake/local-only number.
   ------------------------------------------------------------
   To reset or fork your own count, change COUNTER_NS below to any
   new unique string (e.g. add your domain). Keep it private-ish:
   anyone who knows the namespace+key can read the number.
   ============================================================ */
(function () {
  "use strict";

  var COUNTER_NS  = "compliance-screener-9f3a2c";  // <- change to fork a fresh count
  var COUNTER_KEY = "site-visits";
  var BASE = "https://abacus.jasoncameron.dev";
  var SESSION_FLAG = "cs_counted_session_v1";

  function fmt(n) {
    try { return Number(n).toLocaleString(); } catch (e) { return "" + n; }
  }

  function render(value) {
    var el = document.getElementById("visitorCount");
    var pill = document.getElementById("visitorPill");
    if (!el || !pill) return;
    el.textContent = fmt(value);
    pill.classList.add("show");
  }

  function endpoint() {
    // /hit increments + returns; /get only reads. Count once per session.
    var counted = false;
    try { counted = sessionStorage.getItem(SESSION_FLAG) === "1"; } catch (e) {}
    var verb = counted ? "get" : "hit";
    return { url: BASE + "/" + verb + "/" + encodeURIComponent(COUNTER_NS) + "/" + encodeURIComponent(COUNTER_KEY), counting: !counted };
  }

  function run() {
    var ep = endpoint();
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 7000);
    fetch(ep.url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
      .then(function (j) {
        clearTimeout(timer);
        var v = (j && (typeof j.value === "number" ? j.value : j.count));
        if (v == null) return;
        if (ep.counting) { try { sessionStorage.setItem(SESSION_FLAG, "1"); } catch (e) {} }
        render(v);
      })
      .catch(function () { clearTimeout(timer); /* service unreachable — leave pill hidden */ });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else { run(); }
})();
