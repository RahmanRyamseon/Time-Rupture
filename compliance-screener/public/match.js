/* Shared name matcher — used by the browser app AND the server-side screening
   API (functions/screen.js) so both score names identically.
   Layered: Levenshtein (typos) + transliteration fold (Mohammed/Muhammad)
   + Soundex backstop, token-level and order-independent. */
(function (root, factory) {
  var M = factory();
  if (typeof module === "object" && module.exports) module.exports = M;
  else root.CSMatch = M;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  function norm(s) {
    return (s || "").toString().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(ltd|llc|inc|co|corp|corporation|company|limited|plc|gmbh|sa|ag|jsc|oao|fze|dmcc|pjsc|the|and)\b/g, "")
      .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  }
  function lev(a, b) {
    var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) { cur[0] = i; for (j = 1; j <= n; j++) { var c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1; cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c); } var t = prev; prev = cur; cur = t; }
    return prev[n];
  }
  function sim(a, b) { var mx = Math.max(a.length, b.length); return mx ? 1 - lev(a, b) / mx : 0; }

  // Transliteration / orthographic fold — collapses common spelling variants of
  // the same underlying name across romanisation systems.
  function translit(t) {
    if (!t) return "";
    return t
      .replace(/sch/g, "sh").replace(/tsch/g, "ch")
      .replace(/ph/g, "f").replace(/gh/g, "g").replace(/kh/g, "k")
      .replace(/ck/g, "k").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k")
      .replace(/q/g, "k").replace(/x/g, "ks").replace(/z/g, "s")
      .replace(/w/g, "v").replace(/y/g, "i").replace(/j/g, "i")
      .replace(/(.)\1+/g, "$1")          // collapse doubled letters
      .replace(/(?:ee|ea|ie|ei)/g, "i").replace(/(?:oo|ou)/g, "u")
      .replace(/h/g, "")                 // silent/aspirated h is unreliable
      .replace(/[aeiou]+/g, "a")         // fold vowel runs (Mohammed≈Muhammad)
      .replace(/[^a-z]/g, "");
  }

  // Classic Soundex — phonetic key, 1 letter + 3 digits.
  var SDX = { B: 1, F: 1, P: 1, V: 1, C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2, D: 3, T: 3, L: 4, M: 5, N: 5, R: 6 };
  function soundex(t) {
    t = (t || "").toUpperCase().replace(/[^A-Z]/g, ""); if (!t) return "";
    var out = t[0], prev = SDX[t[0]] || 0;
    for (var i = 1; i < t.length && out.length < 4; i++) {
      var c = SDX[t[i]] || 0;
      if (c && c !== prev) out += c;
      if (t[i] !== "H" && t[i] !== "W") prev = c;
    }
    return (out + "000").slice(0, 4);
  }

  // token -> {l: literal, t: transliterated, s: soundex}
  var tokCache = new Map();
  function tok(t) { var v = tokCache.get(t); if (!v) { if (tokCache.size > 200000) tokCache.clear(); v = { l: t, t: translit(t), s: soundex(t) }; tokCache.set(t, v); } return v; }
  // length-ratio of two strings (1 = same length, ->0 = very different lengths)
  function lenRatio(a, b) { var x = a.length, y = b.length; return Math.min(x, y) / Math.max(x, y || 1); }
  function pairScore(a, b) {            // a,b are tok() objects
    if (a.l === b.l) return 1;
    var litt = sim(a.l, b.l);
    if (litt >= 0.84) return Math.max(litt, 0.9);   // literal near-match: typos / OCR noise
    var lenOk = lenRatio(a.l, b.l) >= 0.6;          // comparable length (not one inside another)
    // PRIMARY linguistic signal — the transliteration fold. Equality of the fold for
    // two comparable, partly-overlapping tokens is strong evidence of ONE name spelt
    // two ways across romanisation systems: Mohammed/Muhammad, Rahman/Rehman, Yusuf/
    // Yousef, w↔v, ph↔f. This is word/spelling driven, not ear driven.
    if (lenOk && a.t && a.t === b.t && litt >= 0.5) return Math.max(litt, 0.9);
    // BACKSTOP ONLY — Soundex. It is a lossy phonetic code with poor precision:
    // unrelated words share a code ("crisil" and the alias "chrisla" are both C624,
    // yet only ~0.57 of their letters line up). So Soundex may only CONFIRM a pair
    // that is already a near-spelling (high literal overlap) — it must never turn a
    // mere sound-alike into a match on its own. Hence the strict literal floor.
    if (lenOk && a.s && a.s === b.s && a.l[0] === b.l[0] && litt >= 0.74) return Math.max(litt, 0.86);
    // weakest: transliterated edit distance, gated so a skeleton collision of
    // unrelated words can never reach the token threshold.
    var trt = a.t && b.t ? sim(a.t, b.t) : 0;
    var corroborated = lenOk && litt >= 0.5;
    return Math.max(litt, corroborated ? trt * 0.85 : trt * 0.45);
  }

  // Order-independent name score + the dominant match technique used.
  function nameScoreEx(q, cand) {
    if (q === cand) return { score: 1, type: "exact" };
    var qt = q.split(" ").filter(function (t) { return t.length > 1; }).map(tok);
    var ct = cand.split(" ").filter(function (t) { return t.length > 1; }).map(tok);
    if (!qt.length || !ct.length) { var s0 = sim(q, cand); return { score: s0, type: "fuzzy" }; }
    var used = [], matched = 0, mc = 0, viaPhon = 0, viaLit = 0;
    for (var i = 0; i < qt.length; i++) {
      var bestJ = -1, bestS = 0;
      for (var j = 0; j < ct.length; j++) {
        if (used[j]) continue;
        var s = pairScore(qt[i], ct[j]);
        if (s > bestS) { bestS = s; bestJ = j; }
      }
      if (bestS >= 0.8 && bestJ > -1) {
        used[bestJ] = 1; matched += bestS; mc++;
        if (qt[i].l === ct[bestJ].l || sim(qt[i].l, ct[bestJ].l) >= 0.84) viaLit++; else viaPhon++;
      }
    }
    var coverage = matched / qt.length;
    if (qt.length >= 2 && matched < 1.6) coverage *= 0.6;
    // GENERIC-WORD GUARD. A single shared token between the query and a much longer
    // name — the word "Global" inside "Global Sea Line", "Crisil" near one alias of a
    // 3-word person — is a weak, ambiguous overlap, not an identity match. One word in
    // common with a name carrying two-plus other distinct words can't reach the band.
    if (mc <= 1 && (ct.length - mc) >= 2) coverage *= 0.5;
    // Defence-in-depth: a match carried ENTIRELY by phonetic/fuzzy tokens (no
    // single literally-anchored token) against a candidate far longer than the
    // query is the signature of a skeleton-collision false positive. Require a
    // literal anchor in that situation by damping the score below the review floor.
    if (viaLit === 0 && viaPhon > 0 && ct.length >= qt.length + 2) coverage *= 0.7;
    var score = Math.max(coverage, sim(q, cand) * 0.9);
    var type = score >= 0.995 ? "exact" : (viaPhon > viaLit ? "phonetic" : (viaPhon ? "phonetic/fuzzy" : "fuzzy"));
    return { score: score, type: type };
  }
  function nameScore(q, cand) { return nameScoreEx(q, cand).score; }
  return { norm: norm, lev: lev, sim: sim, translit: translit, soundex: soundex, tok: tok,
    pairScore: pairScore, nameScoreEx: nameScoreEx, nameScore: nameScore };
});
