// Score de luck global et streaks de 50/50.

const THEORETICAL_AVG_PITY = 65; // moyenne théorique pour 5★ tous bannières confondues

/**
 * Walk chaque bannière indépendamment pour collecter :
 *  - les pity réelles d'obtention de 5★
 *  - les wins/losses 50/50 (uniquement char/chronicled, hors garanties forcées)
 */
export function computeLuckMetrics(banners) {
  const fiveStarPities = [];
  let wins5050 = 0;
  let losses5050 = 0;

  for (const [key, banner] of Object.entries(banners)) {
    let isGuaranteed = false;
    let pity5 = 0;

    for (const wish of banner.history) {
      pity5 += 1;
      if (wish.rank === 5) {
        fiveStarPities.push(pity5);
        pity5 = 0;

        // Le 50/50 ne compte que sur character/chronicled, et pas quand
        // c'est une garantie forcée (issue d'une loss précédente).
        if (key === 'character' || key === 'chronicled') {
          if (isGuaranteed) {
            isGuaranteed = false; // garantie consommée, ne compte pas
          } else if (wish.featured) {
            wins5050 += 1;
          } else {
            losses5050 += 1;
            isGuaranteed = true;
          }
        }
      }
    }
  }

  return { fiveStarPities, wins5050, losses5050 };
}

/**
 * Score de luck 0-100 :
 *  - 50% basé sur (avg théorique / avg réelle) — plus tu tires bas, mieux c'est
 *  - 50% basé sur le taux de wins 50/50
 */
export function calculateLuckScore(banners) {
  const { fiveStarPities, wins5050, losses5050 } = computeLuckMetrics(banners);

  if (fiveStarPities.length === 0) return null;

  const avgPity = fiveStarPities.reduce((a, b) => a + b, 0) / fiveStarPities.length;
  // Inverse : avg basse = bonne luck. Cap à 100% du score pity.
  const pityScore = Math.max(0, Math.min(50, (THEORETICAL_AVG_PITY / avgPity) * 50));

  const total5050 = wins5050 + losses5050;
  const winRate = total5050 > 0 ? wins5050 / total5050 : 0.5;
  const winScore = winRate * 50;

  return Math.round(pityScore + winScore);
}

/**
 * Streak 50/50 actif : combien de wins/losses consécutifs au plus récent ?
 * Concatène char + chronicled triés par timestamp.
 */
export function compute5050Streak(banners) {
  const events = [];

  for (const key of ['character', 'chronicled']) {
    const banner = banners[key];
    if (!banner) continue;
    let isGuaranteed = false;

    for (const wish of banner.history) {
      if (wish.rank === 5) {
        if (isGuaranteed) {
          // garantie consommée, n'apparaît pas dans la séquence 50/50
          isGuaranteed = false;
          continue;
        }
        if (wish.featured) {
          events.push({ ts: wish.timestamp, won: true });
        } else {
          events.push({ ts: wish.timestamp, won: false });
          isGuaranteed = true;
        }
      }
    }
  }

  events.sort((a, b) => a.ts - b.ts);

  if (events.length === 0) return { type: 'none', count: 0 };

  const last = events[events.length - 1];
  let streak = 1;
  for (let i = events.length - 2; i >= 0; i--) {
    if (events[i].won === last.won) streak += 1;
    else break;
  }

  return { type: last.won ? 'wins' : 'losses', count: streak };
}

/**
 * Stats par bannière pour le panneau Stats.
 */
export function bannerStats(banner, bannerKey) {
  let pity5 = 0;
  const fiveStarPities = [];
  let wins = 0;
  let losses = 0;
  let isGuaranteed = false;

  for (const wish of banner.history) {
    pity5 += 1;
    if (wish.rank === 5) {
      fiveStarPities.push(pity5);
      pity5 = 0;
      if (bannerKey === 'character' || bannerKey === 'chronicled') {
        if (isGuaranteed) {
          isGuaranteed = false;
        } else if (wish.featured) {
          wins += 1;
        } else {
          losses += 1;
          isGuaranteed = true;
        }
      }
    }
  }

  const total = banner.history.length;
  const avg = fiveStarPities.length > 0
    ? fiveStarPities.reduce((a, b) => a + b, 0) / fiveStarPities.length
    : null;
  const best = fiveStarPities.length > 0 ? Math.min(...fiveStarPities) : null;
  const worst = fiveStarPities.length > 0 ? Math.max(...fiveStarPities) : null;
  const total5050 = wins + losses;
  const winRate = total5050 > 0 ? (wins / total5050) * 100 : null;

  return {
    totalWishes: total,
    fiveStarCount: fiveStarPities.length,
    avgPity: avg,
    bestPity: best,
    worstPity: worst,
    winRate,
    wins,
    losses,
    fiveStarPities,
  };
}
