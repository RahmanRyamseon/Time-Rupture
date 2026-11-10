// Leaderboard maths.
//
// A raw average is unfair: one 5-star vote would beat a car with 300 votes
// averaging 4.9. We use a Bayesian average instead: every car starts with
// PRIOR_VOTES "virtual" votes at the site-wide mean, so a car needs real
// volume to climb. As people keep rating, scores move and the #1 spot changes.
//
// "This week" only counts ratings from the last 7 days, so the crown keeps
// rotating even after a car has piled up an all-time lead.

export const PRIOR_VOTES = 5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function computeStats(data, { window = 'week', now = Date.now() } = {}) {
  const since = window === 'week' ? now - WEEK_MS : 0;
  const per = new Map();
  let total = 0;
  let count = 0;
  for (const v of Object.values(data.votes)) {
    if (v.at < since) continue;
    const car = data.cars[v.carId];
    if (!car || car.hidden) continue;
    const s = per.get(v.carId) || { sum: 0, n: 0 };
    s.sum += v.stars;
    s.n += 1;
    per.set(v.carId, s);
    total += v.stars;
    count += 1;
  }
  const mean = count ? total / count : 3;
  const stats = new Map();
  for (const car of Object.values(data.cars)) {
    if (car.hidden) continue;
    const s = per.get(car.id) || { sum: 0, n: 0 };
    stats.set(car.id, {
      votes: s.n,
      avg: s.n ? s.sum / s.n : null,
      score: (PRIOR_VOTES * mean + s.sum) / (PRIOR_VOTES + s.n),
    });
  }
  return { stats, mean, totalVotes: count };
}

/**
 * Returns { ranked, fresh } where ranked = cars with at least one rating in the
 * window (best first) and fresh = cars still waiting for their first rating.
 */
export function leaderboard(data, opts = {}) {
  const { stats, mean, totalVotes } = computeStats(data, opts);
  const ranked = [];
  const fresh = [];
  for (const [id, s] of stats) {
    const car = data.cars[id];
    (s.votes > 0 ? ranked : fresh).push({ car, ...s });
  }
  ranked.sort((a, b) =>
    b.score - a.score || b.votes - a.votes || a.car.createdAt - b.car.createdAt);
  fresh.sort((a, b) => b.car.createdAt - a.car.createdAt);
  return { ranked, fresh, mean, totalVotes };
}
